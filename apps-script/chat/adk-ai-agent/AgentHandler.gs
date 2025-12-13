// Copyright 2025 Google LLC. All Rights Reserved.
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

////////////////////////////////////////////////////
// --- ADK AI Agent handling logic               ---
////////////////////////////////////////////////////

// The prefix used for the User resource name.
const USERS_PREFIX = "users/";

// Sends a request to the AI agent and processes the response using the agent 
function requestAgent(userName, input) {
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
          "user_id": userName.replace(USERS_PREFIX, ''),
          "message": extractContentFromInput(input),
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

    // Retrieve the agent responsible for generating the content
    const author = event.author;
    
    // Ignore events that are not useful for the end-user
    if (!event.content) {
      console.log(`${author}: internal event`);
      continue;
    }

    // Handle text answers
    const parts = event.content.parts || [];
    const textPart = parts.find(p => p.text);
    if (textPart) {
      const text = textPart.text;
      console.log(`${author}: ${text}`);
      answer(author, text, event.grounding_metadata);
    }
  }
}

// Transforms the user input to AI message with contents.
function extractContentFromInput(input) {
  // For Chat host apps, the input can contain text and attachments
  const parts = [{ "text": input.text }];
  if (input.attachment && Array.isArray(input.attachment)) {
    for (const attachment of input.attachment) {
      parts.push({ "inline_data": {
        "mime_type": attachment.contentType,
        "data": downloadChatAttachment(
          attachment.attachmentDataRef.resourceName
        )
      }});
    }
  }
  return { "role": "user", "parts": parts };
}

// Sends an answer as a Chat message.
function answer(author, text, groundingMetadata) {
  const widgets = getAgentResponseWidgets(author, text, groundingMetadata);
  createMessage(buildMessage(author, [wrapWidgetsInCardsV2(widgets)]));
}

// --- Utility functions ---

// Builds a Chat message for the given author and cards_v2.
function buildMessage(author, cardsV2) {
  const messageBuilder = CardService.newChatResponseBuilder();
  messageBuilder.setText(`${getAuthorEmoji(author)} *${snakeToUserReadable(author)}* ✅`);
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

///////////////////////////////////////////////////////////////
// --- UI rendering logic for the LLM Auditor AI Agent.     ---
///////////////////////////////////////////////////////////////

// Returns an emoji representing the author.
function getAuthorEmoji(author) {
  switch (author) {
    case "critic_agent": return "ℹ️";
    case "reviser_agent": return "✏️";
    default: return "🤖";
  }
}

// Returns the widgets to render for a given agent response.
function getAgentResponseWidgets(name, text, groundingMetadata) {
  let widgets = [];
  switch (name) {
    case "critic_agent":
      widgets = createMarkdownAndGroundingWidgets(text, groundingMetadata);
      break;
    case "reviser_agent":
      widgets = createMarkdownWidgets(text);
      break;
    default:
  }
  return widgets;
}

// --- Utility functions ---

// Creates widgets for the markdown text and grounding response.
function createMarkdownAndGroundingWidgets(text, groundingMetadata) {
  // Remove the references from text
  let widgets = createMarkdownWidgets(text.replace(/^\s*```(json)?[\s\S]*?```\s*/i, '').replace(/Reference(s)?:[\s\S]*/i, ''))
  // Add sources from grounding data
  if (groundingMetadata.grounding_chunks) {
    const sourceButtons = CardService.newButtonSet();
    for (const groundingChunk of groundingMetadata.grounding_chunks) {
      sourceButtons.addButton(CardService.newTextButton()
        .setText(groundingChunk.web.domain)
        .setOpenLink(CardService.newOpenLink().setUrl(groundingChunk.web.uri)));
    }
    widgets.push(sourceButtons);
  }
  return widgets;
}

// Creates widgets for markdown text response.
function createMarkdownWidgets(markdown) {
  if (!markdown) return [];
  const textParagraph = CardService.newTextParagraph();
  textParagraph.setText(new showdown.Converter().makeHtml(markdown));
  return [textParagraph];
}
