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
import { OAuth2Client } from 'google-auth-library';
import { InvalidCredentialsException, oauth2callback, generateAuthUrl, createOAuth2Client } from './user-auth.js';
import { AgentspaceService } from './agentspace.js';
import { ChatServiceClient } from '@google-apps/chat';
import { google } from "googleapis";
import jwt from 'jsonwebtoken';
import express from 'express';

// Add on configuration
const addonAgentPrembule = 'You are an agent Corporate users rely on to retrieve and summarize their business data from their Google Workspace accounts. Answer concisely, include details when they are useful for context or make it more actionable, use paragraphs for better readability. The only formatting options you can use is to (1) surround some text with <b> and </b> for bold such as `<b>text</b>` for strong emphasis (2) surround some text with <i> and </i> such as `<i>text</i>` for gentle emphasis (3) surround some text with <s> and </s> for strikethrough such as `<s>text</s>` for removal (4) use a HTML `a` tag to make some text a hyperlink such as `<a href="https://example.com">link text</a>` for resource referencing (5) use a backslash followed by the letter n for a new line such as `\\n` for readibility (6) surround some text with <code> and </code> such as `<code>text</code>` for quoting code (7) use HTML `ul` and `li` tags to list items such as `<ul><li>Item1</li><li>Item2</li></ul>` for bulleting ; DO NOT USE ANY OTHER FORMATTING OTHER THAN THOSE.';

// Chat configuration
const chatAgentPrembule = 'You are an agent Corporate users rely on to retrieve and summarize their business data from their Google Workspace accounts. Answer concisely but include details when they are useful for context or make it more actionable, use paragraphs for better readability. The only formatting options you can use is to (1) surround some text with a single star for bold such as `*text*` for strong emphasis (2) surround some text with a single underscore for italic such as `_text_` for gentle emphasis (3) surround some text with a single tild for strikethrough such as `~text~` for removal (4) use a less than before and a pipe followed by link text after followed by a more than after a given URL to make it a hyperlink such as `<https://example.com|link text>` for resource referencing (5) use a backslash followed by the letter n for a new line such as `\\n` for readibility (6) surround some text with a single backquote such as `\`text\`` for quoting code (7) surround an entire paragraph with three backquotes in dedicated lines such as `\`\`\`\nparagraph\n\`\`\`` for quoting code (8) prepend lines with list items with a single star or hyphen followed by a single space such as `* list item` or `- list item` for bulleting ; DO NOT USE ANY OTHER FORMATTING OTHER THAN THOSE.';
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

  if (req.body.chat) {
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
        const chatMessageName = await AgentspaceService.generateAndSendAssistAnswer(chatAgentPrembule, messageText, userName, spaceName);

        // TODO: This is required to avoid visible failures in Chat UI, return a no op action would be ideal
        return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
          text: 'Any other question?'
        }}}}});
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
  } else {
    // Return the Sidebar UI card
    const common = req.body.commonEventObject;
    const eventAuth = req.body.authorizationEventObject;
    const userId = eventAuth ? jwt.decode(eventAuth.userIdToken).sub : undefined;
    const accessToken = eventAuth ? eventAuth.userOAuthToken : undefined;
    const addonAuth = new OAuth2Client();
    addonAuth.setCredentials({ access_token: accessToken });

    // A question was set in the form
    let question = common.formInputs ? common.formInputs.question.stringInputs.value[0] : undefined;

    if (common.parameters) {
      switch(common.parameters.actionName) {
        case 'processSuggested':
          // A relation question was selected
          question = common.parameters["relatedQuestion"];
          break;
        case 'chatRedirect':
          // TODO: create new space, transfer session (update user pseudo ID?), send user message with the last question, send generated answer as app
          break;
        default:
      }
    }

    // Host app-specific
    let contextId = undefined;
    let contextMetadata = undefined;    
    let type = undefined;
    if (req.body.gmail) {
      const gmailEvent = req.body.gmail;
      type = 'Gmail email';
      contextId = gmailEvent.messageId;
      const gmailToken = gmailEvent.accessToken ? gmailEvent.accessToken : undefined;

      // Retrieve the email
      const gmail = google.gmail({version: "v1"});
      const gmailResponse = await gmail.users.messages.get({
        id: contextId,
        userId: "me",
        format: "metadata",
        auth: addonAuth,
        headers: { "X-Goog-Gmail-Access-Token": gmailToken }
      });
      contextMetadata = gmailResponse.data;
    } else if (req.body.calendar) {
      const calendarEvent = req.body.calendar;
      type = 'Calendar event';
      contextId = calendarEvent.id;
      contextMetadata = calendarEvent;
    } else if (req.body.drive) {
      const driveEvent = req.body.drive;
      type = 'Drive document';
      contextId = driveEvent.activeCursorItem.id;
      contextMetadata = driveEvent.activeCursorItem;
    } else {
      // Not supported
    }
    console.log('Selected metadata: ' + JSON.stringify(contextMetadata));

    // Initiate the UI with the question section
    let card = { sections: [{
      header: `What do you want to know about this ${type}?`,
      widgets: [
        { textInput: { name: "question", label: "Question", value: question}},
        { buttonList: { buttons: [{
          text: "Ask",
          type: "FILLED",
          onClick: { action: { function: BASE_URL}}
        }]}}
      ]
    }]};

    // Add the response section
    if (question) {
      card.sections.push(...await createSearchAgentAnswerSections(question, userId, type, contextId, contextMetadata, addonAuth));
      // Update card based on the question asked
      return res.send({ action: { navigations: [{ updateCard: card }]}});
    }

    // Create initial card
    return res.send(card);
  }
});

/**
 * Creates a Card to display in Google Workspace add-on companion with generated answer.
 * 
 * @param {!string} messageText The question to answer.
 * @param {!string} userName The resource name of the user.
 * @param {!Message} messageMetadata The email message metadata.
 * @param {!OAuthClient} addonAuth The OAuth2 client with user credentials
 * @returns {Promise<Array>} Answer sections of the UI.
 */
async function createSearchAgentAnswerSections(messageText, userName, type, messageId, messageMetadata, addonAuth) {
  console.log('Generating the answer...');
  const answer = await AgentspaceService.generateSearchAnswer(addonAgentPrembule + `\n\nThe user is looking at the following ${type} element:\n\n${JSON.stringify(messageMetadata)}\n\nAnswer all questions keeping this context in mind but do not hesitate to gather more information and resources if useful.`, messageText, userName, messageId, addonAuth);

  // Generate answer sections
  let sections = [];

  // If there are skipped reasons, return a single section with a button to open a chat space instead of an answer
  if (answer.answerSkippedReasons && answer.answerSkippedReasons.length > 0)  {
    sections.push({
      widgets: [
        { textParagraph: {
            text: 'Humm, I cannot answer that question using your Google Workspace data 😕 What do you think of discussing this further in Chat?'
        }},
        { buttonList: { buttons: [{
          text: "Start discussion in Chat",
          type: "FILLED",
          onClick: { action: {
            function: BASE_URL,
            parameters: [{ key: "actionName", value: "chatRedirect" }]
          }}
        }]}}
      ]
    });
  } else {
    // Add a section with the answer text
    sections.push({
      widgets: [{ textParagraph: {
        text: answer.answerText ? answer.answerText : 'Humm, something went wrong, I cannot answer that.'
      }}]
    });

    // Add a section with buttons for suggested questions (if any)
    const relatedQuestions = answer.relatedQuestions;
    if (relatedQuestions && relatedQuestions.length > 0) {
      let suggestionsWidgets = [];
      relatedQuestions.forEach(relatedQuestion => {
        suggestionsWidgets.push({ buttonList: { buttons: [{
          type: 'BORDERLESS',
          icon: { materialIcon: { name: 'search' }},
          text: relatedQuestion,
          onClick: { action: {
            function: BASE_URL,
            parameters: [
              { key: "actionName", value: "processSuggested" },
              { key: "relatedQuestion", value: relatedQuestion }
            ]
          }}
        }]}});
      });
      sections.push({
        header: "Suggestions",
        collapsible: true,
        uncollapsibleWidgetsCount: 3, // 3 buttons
        widgets: suggestionsWidgets
      });
    }

    // Add a section with buttons for sources (if any)
    const sources = await AgentspaceService.extractSourcesFromGeneratedSearchAnswer(answer);
    if (sources && sources.length > 0) {
      let sourcesWidgets = [];
      sources.forEach(source => {
        sourcesWidgets.push({ buttonList: { buttons: [{
          type: 'BORDERLESS',
          icon: {
            iconUrl: source.iconUrl ? source.iconUrl : undefined,
            materialIcon: source.iconUrl ? undefined : { name: 'link' }
          },
          text: source.title,
          onClick: { openLink: { url: source.link }}
        }]}});
      });
      sections.push({
        header: "Sources",
        collapsible: true,
        uncollapsibleWidgetsCount: 5, // 5 buttons
        widgets: sourcesWidgets
      });
    }
  }
  console.log('Generated answer sections: ' + JSON.stringify(sections));

  // Return the Chat message based on the generated answer
  return sections;
}

/**
 * Initializes the Chat Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<SessionServiceClient>} An initialized
 *     Chat Service client.
 */
// async function initializeChatServiceClient(userName) {
//   return new ChatServiceClient({
//     authClient: await createOAuth2Client(userName)
//   });
// };

/**
 * TODO: recycle this logic for the transition from add on to chat space
 * Send a suggested message in the Chat space on behalf of the user.
 *
 * @param {Object} relatedQuestion The related question to reply to.
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceName The resource name of the chat space.
 */
// async function processSuggestedMessage(relatedQuestion, userName, spaceName) {
//   // Send the Chat message on behalf of the user
//   const chatService = await initializeChatServiceClient(userName);
//   const [createdMessage] = await chatService.createMessage({
//     parent: spaceName,
//     message: { text: relatedQuestion }
//   });
//   console.log('Created Chat message: ' + JSON.stringify(createdMessage));

//   // Return the Chat message based on the generated answer
//   return await AgentspaceService.generateAndSendAssistAnswer(chatAgentPrembule, relatedQuestion, userName, spaceName);
// }

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
