/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { http } from '@google-cloud/functions-framework';
import { GoogleGenAI, Type } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';
import { google } from 'googleapis';
import { env } from './env.js';

const genAI = new GoogleGenAI({vertexai: true, project: env.projectID, location: env.location});

const USERS_PREFIX = 'users/';
const CHATS_COLLECTION = 'chats';
const db = new Firestore();

const calendar = google.calendar({version: 'v3', auth: env.googleApiKey});

// Define the tool used for function calling
const getNextPublicCalendarEventTitleFunctionDeclaration = {
  name: 'getNextPublicCalendarEventTitle',
  parameters: {
    type: Type.OBJECT,
    description: 'Get the title of the next event of a public calendar.',
    properties: {
      calendarId: {
        type: Type.STRING,
        description: 'ID of the public calendar to get the next event title.',
      }
    },
    required: ['calendarId']
  }
};

// The function referenced in the tool definition
async function getNextPublicCalendarEventTitle(calendarId) {
  // Use Calendar API to retrieve the next event in the given calendar
  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: new Date().toISOString(),
    maxResults: 1,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = response.data.items;
  if (!events || events.length === 0) {
    return null;
  }
  return `${events[0].summary}`;
};

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
http('gen-ai-app', async (req, res) => {
  const userId = req.body.chat.user.name;
  const userMessage = req.body.chat.messagePayload.message.text

  // Retrieve the chat history of the user
  const chatHistory = await getChatHistory(userId);
  const chat = genAI.chats.create({
    model: env.model,
    // Initiate the model with chat history for context
    history: chatHistory.exists ? chatHistory.data().contents : []
  });
  // If no history, send a first message to the model with instructions on how to behave
  if(!chatHistory.exists) {
    const preambule = 'The only formatting options you can use is to '
                    + '(1) surround some text with a single star for bold such as `*text*` for strong emphasis '
                    + '(2) surround some text with a single underscore for italic such as `_text_` for gentle emphasis '
                    + '(3) surround some text with a single tild for strikethrough such as `~text~` for removal '
                    + '(4) use a less than before followed by a URL followed by a pipe followed by a link text followed '
                      + 'by a more than for a hyperlink such as `<https://example.com|link text>` for resource referencing '
                    + '(5) use a backslash followed by the letter n for a new line such as `\\n` for readibility '
                    + '(6) surround some text with a single backquote such as `\`text\`` for quoting code '
                    + '(7) surround an entire paragraph with three backquotes in dedicated lines such as '
                      + '`\`\`\`\nparagraph\n\`\`\`` for quoting code '
                    + '(8) prepend lines with list items with a single star or hyphen followed by a single space '
                      + 'such as `* list item` or `- list item` for bulleting ; '
                    + 'DO NOT USE ANY OTHER FORMATTING OTHER THAN THOSE. '
                    + 'Answer in the same language that I use.';
    await chat.sendMessage({message: preambule});
  }

  // Send the user's message to the model to generate the answer
  let aiResponse = await chat.sendMessage({
    message: userMessage,
    // The tool used for function calling is enabled
    config: { tools: [{ functionDeclarations: [getNextPublicCalendarEventTitleFunctionDeclaration]}]}
  });

  // Handle the function calling turn with the model if any
  const functionCall = aiResponse.candidates[0].content.parts[0].functionCall;
  if (functionCall) {
    let functionResult = null;
    switch(functionCall.name) {
      case 'getNextPublicCalendarEventTitle':
        // Make the function call as per model request
        functionResult = await getNextPublicCalendarEventTitle(functionCall.args['calendarId']);
        break;
      default:
    }
    // Finish the function calling turn by sending the execution result to the model
    aiResponse = await chat.sendMessage({ message: { functionResponse: {
      name: functionCall.name,
      response: { output: functionResult }
    }}});
  }

  // Persist the updated chat history of the user
  await createOrUpdateChatHistory(userId, {contents: chat.getHistory({curated: true})});

  // Send a Chat message with the generated answer
  return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: aiResponse.candidates[0].content.parts[0].text
  }}}}});
});

async function createOrUpdateChatHistory(userId, data) {
  await db.collection(CHATS_COLLECTION).doc(userId.replace(USERS_PREFIX, '')).set(data);
};

async function getChatHistory(userId) {
  return await db.collection(CHATS_COLLECTION).doc(userId.replace(USERS_PREFIX, '')).get();
};
