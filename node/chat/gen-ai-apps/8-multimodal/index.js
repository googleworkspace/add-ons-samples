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

// Note: The Google Chat API does not support uploading attachments with
// app authentication. As a workaround, the app requires enabling Domain-Wide
// Delegation (DWD) to the Cloud Run default service account and uses user
// impersonation to upload the attachment output and send the response containing
// the attachment. See https://issuetracker.google.com/issues/???.

import { http } from '@google-cloud/functions-framework';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { env } from './env.js';
import { GoogleAuth } from 'google-auth-library';

const genAI = new GoogleGenAI({vertexai: true, project: env.projectID, location: env.location});

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
http('gen-ai-app', async (req, res) => {
  const userEmail = req.body.chat.user.email;
  const spaceName = req.body.chat.messagePayload.space.name;
  const userMessage = req.body.chat.messagePayload.message.text;
  const attachmentName = req.body.chat.messagePayload.message.attachment[0].attachmentDataRef.resourceName;
  const attachmentContentType = req.body.chat.messagePayload.message.attachment[0].contentType;

  // Set up app authentication used to download the attachment input
  // Application Default Credentials (ADC) will use the Cloud Run function's
  // default service account.
  const appAuth = new GoogleAuth({
    // Specify the Chat API app authentication scopes
    scopes: ['https://www.googleapis.com/auth/chat.bot']
  });
  // Create Chat service client with application credentials
  const appChatClient = google.chat({
    version: 'v1',
    auth: await appAuth.getClient()
  });

  // Set up user impersonation authentication used to upload the attachment output
  // and send the response.
  const impersonatedUserAuth = new GoogleAuth({
    // Specify the Chat API user authentication scopes
    scopes: ['https://www.googleapis.com/auth/chat.messages'],
    keyFile: './credentials.json',
    clientOptions: {
      // Impersonate the user who sent the original message
      subject: userEmail
    }
  });
  // Create Chat service client with impersonated user credentials
  const userChatClient = google.chat({
    version: 'v1',
    auth: await impersonatedUserAuth.getClient()
  });

  // Send a request to generate the answer with both text and image contents
  const aiResponse = await genAI.models.generateContent({
    model: env.model,
    contents: [{
      role: 'USER',
      parts: [
        // The text content of the message
        { text: userMessage },
        // The attachment of the message is downloaded and added inline
        { inlineData: {
          data: await downloadFile(appChatClient, attachmentName),
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
      const mediaResponse = await uploadFile(userChatClient, spaceName, part.inlineData.data);
      responseAttachment = mediaResponse.data;
    } else {
      responseText = part.text;
    }
  }

  // Create a Chat message dedicated to the generated content
  await userChatClient.spaces.messages.create({
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

async function downloadFile(appChatClient, attachmentName) {
  const response = await appChatClient.media.download({
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

async function uploadFile(userChatClient, spaceName, data) {
  const filename = 'generated_image.png';
  return await userChatClient.media.upload({
    parent: spaceName,
    requestBody: { filename: filename },
    media: {
      mimeType: 'image/png',
      body: Readable.from(Buffer.from(data, 'base64'))
    }
  });
}
