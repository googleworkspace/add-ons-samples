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

///////////////////////////////////////////////////////
// --- Gemini Enterprise AI Agent handling logic    ---
///////////////////////////////////////////////////////

// Sends a request to the AI agent and processes the response
function requestAgent(input) {
  // Sync call that gets all events from agent response
  const responseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-discoveryengine.googleapis.com/v1/${getReasoningEngine()}/assistants/default_assistant:streamAssist?alt=sse`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify({
        // Always use a new session
        "session" : null,
        // Only use the message text
        "query": { "text": input.text },
        "agentsSpec": { "agentSpecs": [{
          "agentId": getAgentId()
        }]}
      }),
      muteHttpExceptions: true
    }
  ).getContentText();
  
  // Process the SSE response (one line per event)
  const events = responseContentText.split('\n').map(s => s.replace(/^data:\s*/, '')).filter(s => s.trim().length > 0);
  console.log(`Received ${events.length} agent events.`);
  var answerText = "";
  for (const eventJson of events) {
    if (isInDebugMode()) {
      console.log("Event: " + eventJson);
    }
    const event = JSON.parse(eventJson);

    // Ignore internal events
    if (!event.answer) {
      console.log(`Ignored: internal event`);
      continue;
    }

    // Handle text replies
    const replies = event.answer.replies || [];
    for (const reply of replies) {
      const content = reply.groundedContent.content;
      // Process content if any
      if (content) {
        if (isInDebugMode()) {
            console.log(`Processing content: ${JSON.stringify(content)}`);
        }
        // Ignore thought events
        if (content.thought) {
          console.log(`Ignored: thought event`);
          continue;
        }
        answerText += content.text;
      }
    }

    // Send Chat message to answer user
    if (event.answer.state === "SUCCEEDED") {
      console.log(`Answer text: ${answerText}`);
      answer(getAgentId(), answerText);
    } else if (event.answer.state !== "IN_PROGRESS") {
      answer(getAgentId(), "Something went wrong, check the Apps Script logs for more info.", false);
    }
  }
}

// --- Utility functions ---

// Sends an answer as a Chat message.
function answer(author, text, success) {
  const widgets = createMarkdownWidgets(text);
  createMessage(buildMessage(author, [wrapWidgetsInCardsV2(widgets)], success));
}

// Builds a Chat message for the given author, state, and cards_v2.
function buildMessage(author, cardsV2, success=true) {
  const messageBuilder = CardService.newChatResponseBuilder();
  messageBuilder.setText(`${getAuthorEmoji(author)} *${snakeToUserReadable(author)}* ${success ? '✅' : '❌'}`);
  cardsV2.forEach(cardV2 => { messageBuilder.addCardsV2(cardV2) });
  let message = JSON.parse(messageBuilder.build().printJson());

  if(isInDebugMode()) {
    console.log(`Built message: ${JSON.stringify(message)}`);
  }

  return message;
}

// Converts a snake_case_string to a user-readable Title Case string.
function snakeToUserReadable(snakeCaseString = "") {
  return snakeCaseString.replace(/_/g, ' ').split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Wraps the given widgets in Chat cards_v2 structure.
function wrapWidgetsInCardsV2(widgets = []) {
  const section = CardService.newCardSection();
  widgets.forEach(widget => { section.addWidget(widget) });
  return CardService.newCardWithId().setCard(CardService.newCardBuilder().addSection(section).build());
}

// Returns an emoji representing the author.
function getAuthorEmoji(author) {
  switch (author) {
    case "default_idea_generation": return "ℹ️";
    default: return "🤖";
  }
}

// Creates widgets for markdown text response.
function createMarkdownWidgets(markdown) {
  if (!markdown) return [];
  const textParagraph = CardService.newTextParagraph();
  textParagraph.setText(new showdown.Converter().makeHtml(markdown));
  return [textParagraph];
}
