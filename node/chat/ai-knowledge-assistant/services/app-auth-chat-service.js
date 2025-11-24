/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Service that calls the Chat API to create messages using the
 * app's credentials.
 */

const chat = require('@googleapis/chat');

/** The scope needed to call the Chat API as an app. */
const CHAT_BOT_SCOPE = ['https://www.googleapis.com/auth/chat.bot'];

/**
 * Initializes the Chat API client with app credentials.
 * @returns {Promise<chat.chat_v1.Chat>} An initialized Chat API client.
 */
async function initializeChatClient() {
  // Authenticate with Application Default Credentials.
  const auth = new chat.auth.GoogleAuth({scopes: CHAT_BOT_SCOPE});
  const authClient = await auth.getClient();

  // Create the Chat API client with app credentials.
  const chatClient = chat.chat({
    version: 'v1',
    auth: authClient
  });
  return chatClient;
}

/**
 * Service to create Google Chat messages using app credentials.
 */
exports.AppAuthChatService = {

  /**
   * Creates a message by calling the Chat API with app credentials.
   *
   * <p>If the space supports threads and the `message` parameter contains a
   * thread name, the new message is created in the same thread. Otherwise, the
   * new message is created in a new thread.
   *
   * <p>Uses the method
   * [spaces.messages.create](https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/create)
   * from the Chat REST API.
   *
   * @param {!string} spaceName The resource name of the space.
   * @param {!chat.chat_v1.Schema$Message} message The message to be created.
   * @return {Promise<chat.chat_v1.Schema$Message>} The created message.
   */
  createMessageInThread: async function (spaceName, message) {
    const chatClient = await initializeChatClient();
    const request = {
      parent: spaceName,
      messageReplyOption: 'REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD',
      requestBody: message,
    };
    try {
      const response = await chatClient.spaces.messages.create(request);
      if (response.status !== 200) {
        console.error('Error calling Chat API CreateMessage: '
          + response.status + ' - ' + response.statusText);
        return;
      }
      return response.data;
    } catch (err) {
      console.error(JSON.stringify({
        message: 'Error calling Chat API CreateMessage.',
        error: err,
      }));
    }
  },
}
