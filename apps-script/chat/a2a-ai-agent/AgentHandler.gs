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
// --- A2A-wrapped ADK AI Agent handling logic               ---
////////////////////////////////////////////////////

// Sends a request to the AI agent and processes the response using the agent 
function requestAgent(userName, input) {
  // Sync call that sends the message to the agent
  const sendResponseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-aiplatform.googleapis.com/v1beta1/${getReasoningEngine()}/a2a/v1/message:send`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify({
        "message": {
          "messageId": Utilities.getUuid(),
          "role": "1",
          "content": extractContentFromInput(input)
        }
      }),
      muteHttpExceptions: true
    }
  ).getContentText();
  if (isInDebugMode()) {
    console.log("Send response: " + sendResponseContentText);
  }

  // Retrieve the ID of the resulting task
  const sendResponse = JSON.parse(sendResponseContentText);
  taskId = sendResponse.task.id;
  console.log(`The agent started the task ${taskId}.`);

  // Poll task status until it's in a final state
  let processedMessageIds = [];
  let taskResponseStatus = null;
  do {
      Utilities.sleep(1000); // Wait a bit before polling
      const taskResponseContentText = UrlFetchApp.fetch(
        `https://${getLocation()}-aiplatform.googleapis.com/v1beta1/${getReasoningEngine()}/a2a/v1/tasks/${taskId}?history_length=1`,
        {
          method: 'get',
          headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
          contentType: 'application/json',
          muteHttpExceptions: true
        }
      ).getContentText();
      if (isInDebugMode()) {
        console.log("Get task response: " + taskResponseContentText);
      }
      const taskResponse = JSON.parse(taskResponseContentText);

      // Retrieve messages already processed
      const history = taskResponse.history || [];
      const pastMessages = history.filter(entry => {
        return entry.role === "ROLE_AGENT" && processedMessageIds.includes(entry.messageId);
      });

      // Retrieve new messages to process
      const newMessages = history.filter(entry => {
        return entry.role === "ROLE_AGENT" && !processedMessageIds.includes(entry.messageId);
      });

      // Process new messages
      let nextSubAgentSeqIndex = pastMessages.length;
      for (const newMessage of newMessages) {
        if (isInDebugMode()) {
          console.log("Processing new message: " + JSON.stringify(newMessage));
        }

        // Retrieve the agent responsible for generating this message
        const author = SUBAGENT_SEQ[nextSubAgentSeqIndex];

        // Handle text answers
        const text = newMessage.content[0].text;
        if (text) {
          console.log(`${author}: ${text}`);
          answer(author, text, taskResponse.metadata.adk_grounding_metadata);
        }

        // Update client processing status
        processedMessageIds.push(newMessage.messageId);
        nextSubAgentSeqIndex++;
      }
      taskResponseStatus = taskResponse.status.state;
  // See https://agent2agent.info/docs/concepts/task/#task-state-taskstate
  } while(['TASK_STATE_SUBMITTED', 'TASK_STATE_WORKING'].includes(taskResponseStatus));
}

// Transforms the user input to AI message with contents.
function extractContentFromInput(input) {
  // For Chat host apps, the input can contain text and attachments
  const parts = [{ "text": input.text }];
  if (input.attachment && Array.isArray(input.attachment)) {
    for (const attachment of input.attachment) {
      parts.push({ "file": {
        "mime_type": attachment.contentType,
        "file_with_bytes": Utilities.base64Encode(downloadChatAttachment(
          attachment.attachmentDataRef.resourceName
        ))
      }});
    }
  }
  return parts;
}

// Sends an answer as a Chat message.
function answer(author, text, groundingMetadata) {
  const widgets = getAgentResponseWidgets(author, text, groundingMetadata);
  createMessage(buildMessage(author, [wrapWidgetsInCardsV2(widgets)]));
}

// --- Utility functions ---

// Builds a Chat message for the given author, text, and cards_v2.
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

// The sub-agent sequence
const SUBAGENT_SEQ = ["critic_agent", "reviser_agent"];

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
  if (groundingMetadata.groundingChunks) {
    const sourceButtons = CardService.newButtonSet();
    for (const groundingChunk of groundingMetadata.groundingChunks) {
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
