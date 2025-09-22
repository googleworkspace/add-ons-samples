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

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';

const port = parseInt(process.env.PORT) || 8080;
const projectID = process.env.PROJECT_ID || 'your-google-cloud-project-id';
const location = process.env.LOCATION || 'your-google-cloud-project-location';
const model =  process.env.MODEL || 'gemini-2.5-flash-lite';

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({vertexai: true, project: projectID, location: location});

// Application authentication
const serviceAccountKeyFile = './credentials.json'; 
const scopes = ['https://www.googleapis.com/auth/chat.bot'];

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  const spaceName = req.body.chat.messagePayload.space.name;
  const userMessage = req.body.chat.messagePayload.message.text;

  // Create Chat service client with application credentials
  const auth = new google.auth.JWT({
    keyFile: serviceAccountKeyFile,
    scopes: scopes
  });
  await auth.authorize();
  const chatClient = google.chat({
    version: 'v1',
    auth: auth,
  });

  // Send a server streaming request to generate the answer
  const aiResponse = await genAI.models.generateContentStream({
    model: model,
    contents: `Generate a story about a ${userMessage}. It should take 2 minutes to read it out loud.`
  });

  // Send a first Chat message to summarize what will be done
  await chatClient.spaces.messages.create({
    parent: spaceName,
    requestBody: { text: `Sure, let me work on generating a short story about a ${userMessage} like you requested.`}
  });

  // Go through the response chunks received from the stream
  let i = 0;
  let messageName = undefined;
  let lastMessageResponse = undefined;
  let lastMessage = undefined;
  for await (const chunk of aiResponse) {
    const text = chunk.text;
    if (text) {
      if (!messageName) {
        // Create a Chat message dedicated to the generated content
        lastMessageResponse = await chatClient.spaces.messages.create({
          parent: spaceName,
          requestBody: {
            text: text,
            // Use an accessory widget with progress status
            accessoryWidgets: [{ buttonList: { buttons: [{
              text: 'Generating story...',
              icon: { materialIcon: { name: "progress_activity"}},
              onClick: { openLink: { url: "https://google.com"}},
              disabled: true
            }]}}]
          }
        });
        lastMessage = lastMessageResponse.data;
        messageName = lastMessage.name;
      } else {
        // Update the Chat message by concatenating the response chunks
        lastMessageResponse = await chatClient.spaces.messages.patch({
          name: messageName,
          updateMask: 'text,accessory_widgets',
          requestBody: {
            text: lastMessage.text + text,
            accessoryWidgets: [{ buttonList: { buttons: [{
              text: 'Generating story...',
              icon: { materialIcon: { name: "progress_activity"}},
              onClick: { openLink: { url: "https://google.com"}},
              disabled: true
            }]}}]
          }
        });
        lastMessage = lastMessageResponse.data;
      }
    }
    i++;
  }

  // Update the accessory widget with final progress status
  await chatClient.spaces.messages.patch({
    name: messageName,
    updateMask: 'accessory_widgets',
    requestBody: {
      accessoryWidgets: [{ buttonList: { buttons: [{
        text: 'Story is fully generated',
        icon: { materialIcon: { name: "check"}},
        onClick: { openLink: { url: "https://google.com"}},
        disabled: true
      }]}}]
    }
  });

  // Send a last Chat message to confirm it's done
  return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: 'All done, I hope you like it!'
  }}}}});
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
