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
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { env } from './env.js';

const genAI = new GoogleGenAI({vertexai: true, project: env.projectID, location: env.location});

// Application authentication
const serviceAccountKeyFile = './credentials.json'; 
const scopes = ['https://www.googleapis.com/auth/chat.bot'];

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
http('gen-ai-app', async (req, res) => {
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
    model: env.model,
    contents: `Generate a story about a ${userMessage}. `
                + `It should take 2 minutes to read it out loud.`
  });

  // Send a first Chat message to summarize what will be done
  await chatClient.spaces.messages.create({
    parent: spaceName,
    requestBody: { text: `Sure, let me work on generating a short story `
                            + `about a ${userMessage} like you requested.`}
  });

  // Go through the response chunks received from the stream
  let messageName = undefined;
  let answer = "";
  for await (const chunk of aiResponse) {
    const text = chunk.text;
    if (text) {
      // Update the answer by concatenating the response chunks
      answer += text;
      // The Chat message request body is the same for message creation and update
      const responseBody = {
        text: answer,
        accessoryWidgets: [getStatusAccessoryWidget('Generating story...', 'progress_activity')]
      }
      if (!messageName) {
        // Create a Chat message dedicated to the generated content
        const messageResponse = await chatClient.spaces.messages.create({
          parent: spaceName,
          requestBody: responseBody
        });
        messageName = messageResponse.data.name;
      } else {
        // Update the Chat message dedicated to the generated content
        await chatClient.spaces.messages.patch({
          name: messageName,
          updateMask: 'text,accessory_widgets',
          requestBody: responseBody
        });
      }
    }
  }

  // Update the accessory widget with final progress status
  await chatClient.spaces.messages.patch({
    name: messageName,
    updateMask: 'accessory_widgets',
    requestBody: {
      accessoryWidgets: [getStatusAccessoryWidget('Story is fully generated', 'check')]
    }
  });

  // Send a last Chat message to confirm it's done
  return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: 'All done, I hope you like it!'
  }}}}});
});

// Create an accessory widget with progress status
function getStatusAccessoryWidget(text, icon) {
  return { buttonList: { buttons: [{
    text: text,
    icon: { materialIcon: { name: icon}},
    // This is a workaround to have the icon shown, it's not clickable
    onClick: { openLink: { url: "https://google.com"}},
    disabled: true
  }]}};
}
