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

/**
 * Responds to a message in Google Chat.
 *
 * @param {Object} event the event object from Google Workspace add-on
 */
function onMessage(event) {
  const message = event.chat.messagePayload.message;
  const user = event.chat.user;

  let name = "";
  if (message.space.type === "DM") {
    name = "You";
  } else {
    name = user.displayName || "User";
  }

  const responseMessage = `${name} said "${message.text}"`;
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: {
            text: responseMessage
          }
        }
      }
    }
  };
}

/**
 * Responds to being added to a Google Chat space.
 *
 * @param {Object} event the event object from Google Workspace add-on
 */
function onAddedToSpace(event) {
  const space = event.chat.addedToSpacePayload.space;
  const user = event.chat.user;

  // If added through @mention a separate MESSAGE event is sent.
  let message = "";
  if (space.singleUserBotDm) {
    message = `Thank you for adding me to a direct message, ${user.displayName || "User"}!`;
  } else {
    message = `Thank you for adding me to ${(space.displayName || "this space")}`;
  }

  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: {
            text: message
          }
        }
      }
    }
  };
}

/**
 * Responds to being removed from a Google Chat space.
 *
 * @param {Object} event the event object from Google Workspace add-on
 */
function onRemovedFromSpace(event) {
  const space = event.chat.removedFromSpacePayload.space;
  console.info(`Chat app removed from ${(space.name || "this chat")}`);
}
