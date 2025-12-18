// Copyright 2025 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Service that handles Google Chat operations.

// Handle incoming Google Chat message events, actions will be taken via Google Chat API calls
function onMessage(event) {
  if (isInDebugMode()) {
    console.log(`Message event received (Chat): ${JSON.stringify(event)}`);
  }
  // Extract data from the event.
  const chatEvent = event.chat;
  setChatConfig(chatEvent.messagePayload.space.name);

  // Request AI agent to answer the message
  requestAgent(chatEvent.user.name, chatEvent.messagePayload.message)
  // Respond with an empty response to the Google Chat platform to acknowledge execution
  return null; 
}

// --- Utility functions ---

// The Chat direct message (DM) space associated with the user
const SPACE_NAME_PROPERTY = "DM_SPACE_NAME"

// Sets the Chat DM space name for subsequent operations.
function setChatConfig(spaceName) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(SPACE_NAME_PROPERTY, spaceName);
  console.log(`Space is set to ${spaceName}`);
}

// Retrieved the Chat DM space name to sent messages to.
function getConfiguredChat() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty(SPACE_NAME_PROPERTY);
}

// Finds the Chat DM space name between the Chat app and the given user.
function findChatAppDm(userName) {
  return Chat.Spaces.findDirectMessage(
    { 'name': userName },
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  ).name;
}

// Downloads a Chat message attachment and returns its content as a base64 encoded string.
function downloadChatAttachment(attachmentName) {
  const response = UrlFetchApp.fetch(
    `https://chat.googleapis.com/v1/media/${attachmentName}?alt=media`,
    {
      method: 'get',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      muteHttpExceptions: true
    }
  );
  return Utilities.base64Encode(response.getContent());
}

// Creates a Chat message in the configured space.
function createMessage(message) {
  const spaceName = getConfiguredChat();
  console.log(`Creating message in space ${spaceName}...`);
  return Chat.Spaces.Messages.create(
    message,
    spaceName,
    {},
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  ).name;
}

// Updates a Chat message in the configured space.
function updateMessage(name, message) {
  console.log(`Updating message ${name}...`);
  Chat.Spaces.Messages.patch(
    message,
    name,
    { updateMask: "*" },
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  );
}
