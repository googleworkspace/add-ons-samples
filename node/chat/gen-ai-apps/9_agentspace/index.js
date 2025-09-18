/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BASE_URL } from './runtime.js';
import { InvalidCredentialsException, oauth2callback, generateAuthUrl, createOAuth2Client } from './user-auth.js';
import { AgentspaceService } from './agentspace.js';
import { ChatServiceClient } from '@google-apps/chat';
import express from 'express';

const RESET_SESSION_COMMAND_ID = process.env.RESET_SESSION_COMMAND_ID || 1;

const port = parseInt(process.env.PORT) || 8080;

const app = express();
app.use(express.json());

/**
 * Handles HTTP callback requests from the OAuth2 authorization flow.
 * 
 * The handler exhanges the code received frmo the OAuth2 server with a set of
 * credentials, stores the authentication and refresh tokens in the database,
 * and redirects the request to the config complete URL provided in the request.
 */
app.get('/oauth2', async (req, res) => {
  console.log('OAuth2 callback request received');
  await oauth2callback(req, res);
});

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  // Retrieve information from the request payload.
  console.log('Incoming Google Workspace add on event: ' + JSON.stringify(req.body));
  const chatEvent = req.body.chat;
  const userName = chatEvent.user.name;
  let configCompleteRedirectUrl = null;

  try {
    if (chatEvent.appCommandPayload) {
      // Handles command events
      const spaceName = chatEvent.appCommandPayload.space.name;
      configCompleteRedirectUrl = chatEvent.appCommandPayload.configCompleteRedirectUri;

      switch (chatEvent.appCommandPayload.appCommandMetadata.appCommandId) {
        case RESET_SESSION_COMMAND_ID:
          await AgentspaceService.deleteSession(userName, spaceName)
          return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
            text: 'Session was reset, I forgot everything you told me!'
          }}}}});
      }
    } else if (chatEvent.messagePayload) {
      // Handles message events
      const spaceName = chatEvent.messagePayload.space.name;
      const messageText = chatEvent.messagePayload.message.text;
      configCompleteRedirectUrl = chatEvent.messagePayload.configCompleteRedirectUri;

      // Send a Chat message based on the generated answer
      return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: {
        message: await createAgentAnswerChatMessage(messageText, userName, spaceName)
      }}}});
    } else if(chatEvent.buttonClickedPayload) {
      // Handles button click events
      const spaceName = chatEvent.buttonClickedPayload.space.name;
      switch(req.body.commonEventObject.parameters.actionName) {
        case "processSuggestedMessage":
          // Send the resulting Chat message on behalf of the user
          return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: {
            message: await processSuggestedMessage(req.body, userName, spaceName)
          }}}});
      }
    }
  } catch (e) {
    if (e instanceof InvalidCredentialsException) {
      // App doesn't have a refresh token for the user.
      // Request configuration to obtain OAuth2 tokens.
      return res.send({ basicAuthorizationPrompt: {
        authorizationUrl: generateAuthUrl(userName, configCompleteRedirectUrl),
        resource: 'Agentspace App'
      }});
    }
    throw e;
  }
});

/**
 * Creates a Chat message with generated answer.
 * 
 * @param {!string} messageText The question to answer.
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceName The resource name of the chat space.
 * @returns {Promise<Object>} The Chat message.
 */
async function createAgentAnswerChatMessage(messageText, userName, spaceName) {
  const answer = await AgentspaceService.generateAnswer(messageText, userName, spaceName);

  // Generate Chat response cards
  let cardsV2 = [];

  // Add a card with buttons for suggested questions (if any)
  const relatedQuestions = answer.relatedQuestions;
  if (relatedQuestions && relatedQuestions.length > 0) {
    let suggestionsCardWidgets = [];
    suggestionsCardWidgets.push({ divider: {}});
    relatedQuestions.forEach(relatedQuestion => {
      suggestionsCardWidgets.push({ buttonList: { buttons: [{
        type: 'BORDERLESS',
        icon: { materialIcon: { name: 'search' }},
        text: relatedQuestion,
        onClick: { action: {
          function: BASE_URL,
          parameters: [
            { key: "actionName", value: "processSuggestedMessage" },
            { key: "relatedQuestion", value: relatedQuestion }
          ]
        }}
      }]}});
    });
    cardsV2.push({
      cardId: "suggestionsCard",
      card: { sections: [{
        header: "Suggestions",
        collapsible: true,
        uncollapsibleWidgetsCount: 4, // 1 divider + 3 buttons
        widgets: suggestionsCardWidgets
      }]}
    });
  }

  // Add a card with buttons for sources (if any)
  const sources = await AgentspaceService.extractSourcesFromGeneratedAnswer(answer);
  if (sources && sources.length > 0) {
    let sourcesCardWidgets = [];
    sourcesCardWidgets.push({ divider: {}});
    sources.forEach(source => {
      sourcesCardWidgets.push({ buttonList: { buttons: [{
        type: 'BORDERLESS',
        icon: {
          iconUrl: source.iconUrl ? source.iconUrl : undefined,
          materialIcon: source.iconUrl ? undefined : { name: 'link' }
        },
        text: source.title,
        onClick: { openLink: { url: source.link }}
      }]}});
    });
    cardsV2.push({
      cardId: "sourcesCard",
      card: { sections: [{
        header: "Sources",
        collapsible: true,
        uncollapsibleWidgetsCount: 4, // 1 divider + 3 buttons
        widgets: sourcesCardWidgets
      }]}
    });
  }
  console.log('Generated Chat message cards: ' + JSON.stringify(cardsV2));

  // Return the Chat message based on the generated answer
  return {
    text: answer.answerText,
    cardsV2: cardsV2
  };
}

/**
 * Initializes the Chat Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<SessionServiceClient>} An initialized
 *     Chat Service client.
 */
async function initializeChatServiceClient(userName) {
  return new ChatServiceClient({
    authClient: await createOAuth2Client(userName)
  });
};

/**
 * Send a suggested message in the Chat space on behalf of the user.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceName The resource name of the chat space.
 */
async function processSuggestedMessage(event, userName, spaceName) {
  // Retrieve the text of the message from the event parameters
  const text = event.commonEventObject.parameters["relatedQuestion"];

  // Send the Chat message on behalf of the user
  const chatService = await initializeChatServiceClient(userName);
  const [createdMessage] = await chatService.createMessage({
    parent: spaceName,
    message: { text: text }
  });
  console.log('Created Chat message: ' + JSON.stringify(createdMessage));

  // Return the Chat message based on the generated answer
  return await createAgentAnswerChatMessage(text, userName, spaceName);
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
