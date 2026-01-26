// Copyright 2026 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// ADK / A2UI AI Agent handling logic

// Sends a request to the AI agent and processes the response using the agent 
function requestAgent(responseText, messageId, message) {
  // Sync call that gets all events from agent response
  const responseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-aiplatform.googleapis.com/v1/${getReasoningEngine()}:streamQuery?alt=sse`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify({
        "class_method": "async_stream_query",
        "input": {
          "user_id": messageId,
          "message": { "role": "user", "parts": [{ "text": message }] },
        }
      }),
      muteHttpExceptions: true
    }
  ).getContentText();
  
  // Process the SSE response (one line per event)
  const events = responseContentText.split('\n').filter(s => s.trim().length > 0);
  console.log(`Received ${events.length} agent events.`);
  for (const eventJson of events) {
    if (isInDebugMode()) {
      console.log("Event: " + eventJson);
    }
    const event = JSON.parse(eventJson);

    // Ignore events that are not useful for the end-user
    if (!event.content) {
      continue;
    }

    // Handle answer
    const parts = event.content.parts || [];
    const textPart = parts.find(p => p.text);
    if (textPart) {
      const text = textPart.text;
      console.log(`Agent response: ${text}`);
      return buildMessageFromA2UI(responseText, text, messageId);
    }
  }
}

// Builds a Chat message from A2UI agent response.
function buildMessageFromA2UI(text, a2ui, messageId) {
  let a2uiJson = a2ui.trim();
  if (a2uiJson.startsWith("```json")) {
    a2uiJson = a2uiJson.slice(7, -3).trim();
  }
  const widgets = createWidgetsFromA2UI(JSON.parse(a2uiJson), messageId);
  return buildMessage(text, [wrapWidgetsInCardsV2(widgets)]);
}

// Builds a Chat message with given text and cards V2.
function buildMessage(text, cardsV2) {
  const messageBuilder = CardService.newChatResponseBuilder();
  messageBuilder.setText(text);
  cardsV2.forEach(cardV2 => { messageBuilder.addCardsV2(cardV2) });
  let message = JSON.parse(messageBuilder.build().printJson());

  if(isInDebugMode()) {
    console.log(`Built message: ${JSON.stringify(message)}`);
  }

  return message;
}

// Wraps the given widgets in Chat card V2 structure.
function wrapWidgetsInCardsV2(widgets = []) {
  const section = CardService.newCardSection();
  widgets.forEach(widget => { section.addWidget(widget) });
  return CardService.newCardWithId().setCard(CardService.newCardBuilder().addSection(section).build());
}

