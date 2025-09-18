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
import { Buffer } from 'buffer';
import { Readable } from 'stream';

const port = parseInt(process.env.PORT) || 8080;
const projectID = process.env.PROJECT_ID || 'your-google-cloud-project-id';
const location = process.env.LOCATION || 'your-google-cloud-project-location';
const model =  process.env.MODEL || 'gemini-2.0-flash-preview-image-generation';

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({vertexai: true, project: projectID, location: location});

// Application authentication
const serviceAccountKeyFile = './credentials.json';
const scopes = ['https://www.googleapis.com/auth/chat.messages'];

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  const userEmail = req.body.chat.user.email;
  const spaceName = req.body.chat.messagePayload.space.name;
  const userMessage = req.body.chat.messagePayload.message.text;
  const attachmentName = req.body.chat.messagePayload.message.attachment[0].attachmentDataRef.resourceName;
  const attachmentContentType = req.body.chat.messagePayload.message.attachment[0].contentType;

  // Create Chat service client with application credentials
  const auth = new google.auth.JWT({
    keyFile: serviceAccountKeyFile,
    scopes: scopes,
    // Impersonate the user
    subject: userEmail
  });
  await auth.authorize();
  const chatClient = google.chat({
    version: 'v1',
    auth: auth,
  });

  // Send a request to generate the answer with both text and image contents
  const aiResponse = await genAI.models.generateContent({
    model: model,
    contents: [{
      role: 'USER',
      parts: [
        // The text content of the message
        { text: userMessage },
        // The attachment of the message is downloaded and added inline
        { inlineData: {
          data: await downloadFile(chatClient, attachmentName),
          mimeType: attachmentContentType
        }}
      ]
    }],
    config: { responseModalities: ['TEXT', 'IMAGE']}
  });

  let responseText = undefined;
  let responseAttachment = undefined;
  // Go through the response parts received
  for (const part of aiResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      // The resulting image is retrieved inline and uploaded
      const mediaResponse = await uploadFile(chatClient, spaceName, part.inlineData.data);
      responseAttachment = mediaResponse.data;
    } else {
      responseText = part.text;
    }
  }

  // Create a Chat message dedicated to the generated content
  await chatClient.spaces.messages.create({
    parent: spaceName,
    requestBody: {
      text: responseText ? responseText : 'Here it is!',
      // The uploaded image is referenced as attachment
      attachment: responseAttachment ? [responseAttachment] : undefined
    }
  });

  // Send a last Chat message to confirm it's done
  return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: 'Done, feel free to let me know if you need anything else!'
  }}}}});
});

async function downloadFile(chatClient, attachmentName) {
  const response = await chatClient.media.download({
      resourceName: attachmentName,
      alt: 'media'
    }, {
      responseType: 'stream'
  });
  const chunks = [];
  return new Promise((resolve) => {
    response.data.on('data', (chunk) => {
      chunks.push(chunk);
    });
    response.data.on('end', () => {
      const fileBuffer = Buffer.concat(chunks);
      const base64String = fileBuffer.toString('base64');
      resolve(base64String);
    });
  });
}

async function uploadFile(chatClient, spaceName, data) {
  const filename = 'generated_image.png';
  return await chatClient.media.upload({
    parent: spaceName,
    requestBody: { filename: filename },
    media: {
      mimeType: 'image/png',
      body: Readable.from(Buffer.from(data, 'base64'))
    }
  });
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
