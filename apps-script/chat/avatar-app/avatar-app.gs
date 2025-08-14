/**
 * Copyright 2025 Google LLC
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

// [START chat_avatar_app_command]
// The ID of the slash command "/about".
// It's not enabled by default, set to the actual ID to enable it. You must
// use the same ID as set in the Google Chat API configuration.
const ABOUT_COMMAND_ID = 0;

/**
 * Responds to an APP_COMMAND event in Google Chat.
 *
 * @param {Object} event the event object from Google Chat
 */
function onAppCommand(event) {

  // Stores the Google Chat app command metadata as a variable.
  const appCommandMetadata = event.chat.appCommandPayload.appCommandMetadata;

  // Executes the slash command logic based on its ID.
  // Slash command IDs are set in the Google Chat API configuration.
  switch (appCommandMetadata.appCommandId) {
      case ABOUT_COMMAND_ID:
          return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
              text: 'The Avatar app replies to Google Chat messages.'
          }}}}};
  }
}
// [END chat_avatar_app_command]

/**
 * Responds to a MESSAGE event in Google Chat.
 *
 * @param {Object} event the event object from Google Chat
 */
function onMessage(event) {

    // Stores the Google Chat event as a variable.
    const chatMessage = event.chat.messagePayload.message;

    // Replies with the sender's avatar in a card otherwise.
    const displayName = chatMessage.sender.displayName;
    const avatarUrl = chatMessage.sender.avatarUrl;
    return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
        text: 'Here\'s your avatar',
        cardsV2: [{
            cardId: 'avatarCard',
            card: {
                name: 'Avatar Card',
                header: {
                    title: `Hello ${displayName}!`,
                },
                sections: [{
                    widgets: [{
                        textParagraph: { text: 'Your avatar picture: ' }
                    }, {
                        image: { imageUrl: avatarUrl }
                    }]
                }]
            }
        }]
    }}}}};
}
