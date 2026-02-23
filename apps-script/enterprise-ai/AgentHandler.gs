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

// Service that handles Gemini Enterprise AI Agent operations.

// Submits a query to the AI agent and returns the response string synchronously
function queryAgent(input) {
  const isNewSession = input.forceNewSession || !PropertiesService.getUserProperties().getProperty(AGENT_SESSION_NAME);
  const sessionName = input.forceNewSession ? createAgentSession() : getOrCreateAgentSession();

  let systemPrompt = "SYSTEM PROMPT START Do not respond with tables but use bullet points instead.";
  if (input.forceNewSession) {
    systemPrompt += " Do not ask the user follow-up questions or converse with them as history is not kept in this interface.";
  }
  systemPrompt += " SYSTEM PROMPT END\n\n";

  const queryText = isNewSession ? systemPrompt + input.text : input.text;

  const requestPayload = {
    "session": sessionName,
    "userMetadata": { "timeZone": Session.getScriptTimeZone() },
    "query": { "text": queryText },
    "toolsSpec": { "vertexAiSearchSpec": { "dataStoreSpecs": getAgentDataStores().map(ds => { dataStore: ds }) } },
    "agentsSpec": { "agentSpecs": [{ "agentId": getAgentId() }] }
  };

  const responseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-discoveryengine.googleapis.com/v1alpha/${getReasoningEngine()}/assistants/default_assistant:streamAssist?alt=sse`,
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

  let answerText = "";
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
      if (content) {
        if (isInDebugMode()) {
          console.log(`Processing content: ${JSON.stringify(content)}`);
        }
        if (content.thought) {
          console.log(`Ignored: thought event`);
          continue;
        }
        answerText += content.text;
      }
    }

    if (event.answer.state === "SUCCEEDED") {
      console.log(`Answer text: ${answerText}`);
      return answerText;
    } else if (event.answer.state !== "IN_PROGRESS") {
      throw new Error("Something went wrong, check the Apps Script logs for more info.");
    }
  }
  return answerText;
}

// Gets the list of data stores configured for the agent to include in the request.
function getAgentDataStores() {
  const responseContentText = UrlFetchApp.fetch(
    `https://${getLocation()}-discoveryengine.googleapis.com/v1/${getReasoningEngine().split('/').slice(0, 6).join('/')}/dataStores`,
    {
      method: 'get',
      // Use the add on service account credentials for data store listing access
      headers: { 'Authorization': `Bearer ${getAddonCredentials().getAccessToken()}` },
      contentType: 'application/json',
      muteHttpExceptions: true
    }
  ).getContentText();
  if (isInDebugMode()) {
    console.log(`Response: ${responseContentText}`);
  }
  const dataStores = JSON.parse(responseContentText).dataStores.map(ds => ds.name);
  if (isInDebugMode()) {
    console.log(`Data stores: ${dataStores}`);
  }
  return dataStores;
}

// Sends an answer as a Chat message.
function answer(author, text, success) {
  const widgets = createMarkdownWidgets(text);
  createMessage(buildMessage(author, [wrapWidgetsInCardsV2(widgets)], success));
}

// ---  UI Management ---

// Sends a request to the AI agent and processes the response for Chat UI
function requestAgent(input) {
  try {
    const answerText = queryAgent(input);
    if (answerText) {
      answer(getAgentId().split('/').pop(), answerText, true);
    }
  } catch (err) {
    answer(getAgentId().split('/').pop(), err.message, false);
  }
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
    case "default_agent": return "ℹ️";
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

// ---  Session Management ---

const AGENT_SESSION_NAME = 'AGENT_SESSION_NAME';

// Creates a new agent session.
function createAgentSession() {
  const responseContentJson = UrlFetchApp.fetch(
    `https://${getLocation()}-discoveryengine.googleapis.com/v1alpha/${getReasoningEngine()}/sessions`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify({ "state": "IN_PROGRESS" }),
      muteHttpExceptions: true
    }
  ).getContentText();

  if (isInDebugMode()) {
    console.log(`Create session response: ${responseContentJson}`);
  }

  const createdSessionName = JSON.parse(responseContentJson).name;
  console.log(`Created session: ${createdSessionName}`);
  return createdSessionName;
}

// Retrieves or creates the agent session for the user.
function getOrCreateAgentSession() {
  const userProperties = PropertiesService.getUserProperties();
  let sessionName = userProperties.getProperty(AGENT_SESSION_NAME);

  if (!sessionName) {
    sessionName = createAgentSession();
    userProperties.setProperty(AGENT_SESSION_NAME, sessionName);
    console.log(`Saved new session: ${sessionName}`);
  } else {
    console.log(`Found existing session: ${sessionName}`);
  }

  return sessionName;
}

