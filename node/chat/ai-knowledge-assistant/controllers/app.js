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
 * @fileoverview The main application logic. Processes the
 * [Chat event](https://developers.google.com/workspace/add-ons/chat/build#event-objects).
 */

const {env} = require('../env.js');
const {AppAuthEventsService} = require('../services/app-auth-events-service.js');
const {FirestoreService} = require('../services/firestore-service.js');
const {UserAuthChatService} = require('../services/user-auth-chat-service.js');
const {UserAuthEventsService} = require('../services/user-auth-events-service.js');
const {generateAuthUrl} = require('../services/user-auth.js');

/**
 * Chat application logic.
 */
class ChatApp {
  /**
   * Instantiates the Chat app.
   * @param {!Object} event The
   * [event](https://developers.google.com/workspace/add-ons/concepts/event-objects#chat-event-object)
   * received from Google Chat.
   */
  constructor(event) {
    this.event = event;
    this.userName = event.chat.user.name;
  }

  /**
   * Executes the Chat app and returns the resulting
   * [action](https://developers.google.com/workspace/add-ons/chat/build#actions).
   * @return {Promise<Object>} The action to execute as response.
   */
  async execute() {
    if (this.event.chat.addedToSpacePayload) {
      this.spaceName = this.event.chat.addedToSpacePayload.space.name;
      this.configCompleteRedirectUrl = this.event.chat.addedToSpacePayload.configCompleteRedirectUri;
      return this.handleAddedToSpaceOrMessage();
    } else if (this.event.chat.messagePayload) {
      this.spaceName = this.event.chat.messagePayload.space.name;
      this.configCompleteRedirectUrl = this.event.chat.messagePayload.configCompleteRedirectUri;
      return this.handleAddedToSpaceOrMessage();
    } else if (this.event.chat.removedFromSpacePayload) {
      this.spaceName = this.event.chat.removedFromSpacePayload.space.name;
      return this.handleRemovedFromSpace();
    }
    return {};
  }

  /**
   * Handles the added to space or message event by sending back a welcome message.
   * It also adds the space to storage, queries all messages currently in the space,
   * and saves all the messages into storage.
   * @return {Promise<Object>} A create message action with welcome text to the space.
   */
  async handleAddedToSpaceOrMessage() {
    if (env.logging) {
      console.log(JSON.stringify({
        message: 'Saving message history and subscribing to the space.',
        spaceName: this.spaceName,
        userName: this.userName,
      }));
    }
    await FirestoreService.createSpace(this.spaceName);

    try {
      // List and save the previous messages from the space.
      const messages = await UserAuthChatService.listUserMessages(
        this.spaceName, this.userName);
      await FirestoreService.createOrUpdateMessages(this.spaceName, messages);

      // Create space subscription.
      await UserAuthEventsService.createSpaceSubscription(
        this.spaceName, this.userName);
    } catch (e) {
      if (e.name === 'InvalidTokenException') {
        // App doesn't have a refresh token for the user.
        // Request configuration to obtain OAuth2 tokens.
        return { basicAuthorizationPrompt: {
          authorizationUrl: generateAuthUrl(this.userName, this.configCompleteRedirectUrl),
          resource: 'AI Knowledge Assistant'
        }};
      }
      // Rethrow unrecognized errors.
      throw e;
    }

    // Reply with welcome message.
    const text = 'Thank you for adding me to this space. I help answer'
      + ' questions based on past conversation in this space. Go ahead and ask'
      + ' me a question!';
    return { hostAppDataAction: { chatDataAction: { createMessageAction: {
      message: {text: text}
    }}}};
  }

  /**
   * Handles the removed from space event by deleting the space subscriptions
   * and deleting the space from storage.
   */
  async handleRemovedFromSpace() {
    if (env.logging) {
      console.log(JSON.stringify({
        message: 'Deleting space subscriptions and message history.',
        spaceName: this.spaceName,
      }));
    }
    await AppAuthEventsService.deleteSpaceSubscriptions(this.spaceName);
    await FirestoreService.deleteSpace(this.spaceName);
    return {};
  }
}

module.exports = {
  /**
   * Executes the Chat app and returns the resulting
   * [action](https://developers.google.com/workspace/add-ons/chat/build#actions).
   * @param {!Object} event The
   * [event](https://developers.google.com/workspace/add-ons/concepts/event-objects#chat-event-object)
   * received from Google Chat.
   * @return {Promise<Object>} The action to execute as response.
   */
  execute: async function (event) {
    return new ChatApp(event).execute();
  }
};
