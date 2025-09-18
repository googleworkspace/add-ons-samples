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
import { Firestore } from '@google-cloud/firestore';

const port = parseInt(process.env.PORT) || 8080;
const projectID = process.env.PROJECT_ID || 'your-google-cloud-project-id';
const location = process.env.LOCATION || 'your-google-cloud-project-location';
const model =  process.env.MODEL || 'gemini-2.5-flash-lite';

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({vertexai: true, project: projectID, location: location});

const USERS_PREFIX = 'users/';
const CHATS_COLLECTION = 'chats';
const db = new Firestore();

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  const userId = req.body.chat.user.name;
  const userMessage = req.body.chat.messagePayload.message.text

  // Retrieve the chat history of the user
  const chatHistory = await getChatHistory(userId);
  const chat = genAI.chats.create({
    model: model,
    // Initiate the model with chat history for context
    history: chatHistory.exists ? chatHistory.data().contents : []
  });
  // If no history, send a first message to the model with instructions on how to behave
  if(!chatHistory.exists) {
    await chat.sendMessage({message: 'Please answer all my messages in a consice manner, with plain text only, and in the same language that I use.'});
  }

  // Send the user's message to the model to generate the answer
  const aiResponse = await chat.sendMessage({message: userMessage});

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

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
