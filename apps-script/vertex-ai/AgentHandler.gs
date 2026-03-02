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

// Service that handles Vertex AI Agent operations.

// Submits a query to the AI agent and returns the response string synchronously
function queryAgent(input) {
  let systemPrompt = "SYSTEM PROMPT START Do not respond with tables but use bullet points instead." +
    " Do not ask the user follow-up questions or converse with them as history is not kept in this interface." +
    " SYSTEM PROMPT END\n\n";

  const requestPayload = {
    "class_method": "async_stream_query",
    "input": {
      "user_id": "vertex_ai_add_on",
      "message": { "role": "user", "parts": [{ "text": systemPrompt + input.text }] },
      "state_delta": {
        "enterprise-ai_999": `${ScriptApp.getOAuthToken()}`
      }
    }
  };

  const responseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-aiplatform.googleapis.com/v1/${getReasoningEngine()}:streamQuery?alt=sse`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify(requestPayload),
      muteHttpExceptions: true
    }
  ).getContentText();

  if (isInDebugMode()) {
    console.log(`Response: ${responseContentText}`);
  }

  const events = responseContentText.split('\n').map(s => s.replace(/^data:\s*/, '')).filter(s => s.trim().length > 0);
  console.log(`Received ${events.length} agent events.`);

  let author = "default";
  let answerText = "";
  for (const eventJson of events) {
    if (isInDebugMode()) {
      console.log("Event: " + eventJson);
    }
    const event = JSON.parse(eventJson);

    // Retrieve the agent responsible for generating the content
    author = event.author;

    // Ignore events that are not useful for the end-user
    if (!event.content) {
      console.log(`${author}: internal event`);
      continue;
    }

    // Handle text answers
    const parts = event.content.parts || [];
    const textPart = parts.find(p => p.text);
    if (textPart) {
      answerText += textPart.text;
    }
  }
  return { author: author, text: answerText };
}

// ---  UI Management ---

// Sends an answer as a Chat message.
function answer(author, text, success) {
  const widgets = createMarkdownWidgets(text);
  createMessage(buildMessage(author, [wrapWidgetsInCardsV2(widgets)], success));
}

// Sends a request to the AI agent and processes the response for Chat UI
function requestAgent(input) {
  try {
    const response = queryAgent(input);
    if (response.text) {
      answer(response.author, response.text, true);
    }
  } catch (err) {
    answer(response.author, err.message, false);
  }
}

// Builds a Chat message for the given author, state, and cards_v2.
function buildMessage(author, cardsV2, success = true) {
  const messageBuilder = CardService.newChatResponseBuilder();
  messageBuilder.setText(`${getAuthorEmoji(author)} *${snakeToUserReadable(author)}* ${success ? '✅' : '❌'}`);
  cardsV2.forEach(cardV2 => { messageBuilder.addCardsV2(cardV2) });
  let message = JSON.parse(messageBuilder.build().printJson());

  if (isInDebugMode()) {
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
    case "enterprise_ai": return "ℹ️";
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
