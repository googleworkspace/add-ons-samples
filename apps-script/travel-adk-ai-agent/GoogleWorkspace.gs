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

const USERS_PREFIX = "users/";

// ------- Google Chat API (using advanced service) -------

const SPACES_PREFIX = "spaces/";
const SPACE_NAME_PROPERTY = "DM_SPACE_NAME"

function setChatConfig(spaceName = "spaces/iMGKjCAAAAE") {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(SPACE_NAME_PROPERTY, spaceName);
  console.log(`Space is set to ${spaceName}`);
}

function getConfiguredChat() {
  const userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty(SPACE_NAME_PROPERTY);
}

function findChatAppDm(userName = "users/105666481551027660890") {
  return Chat.Spaces.findDirectMessage(
    { 'name': userName },
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  ).name;
}

function downloadChatAttachment(attachmentName = "ClxzcGFjZXMvaU1HS2pDQUFBQUUvbWVzc2FnZXMvRjk5S0ZxOGJzLW8uRjk5S0ZxOGJzLW8vYXR0YWNobWVudHMvQUFUVWYtSU9rVV9UMm9YaEp3NmdFSlJNOXRxYg==") {
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

function createMessage(message = {'text': 'Hello world!'}) {
  const spaceName = getConfiguredChat();
  console.log(`Creating message in space ${spaceName}...`);
  return Chat.Spaces.Messages.create(
    message,
    spaceName,
    {},
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  ).name;
}

function updateMessage(name, message) {
  console.log(`Updating message ${name}...`);
  Chat.Spaces.Messages.patch(
    message,
    name,
    { updateMask: "*" },
    {'Authorization': `Bearer ${getCredentials().getAccessToken()}`}
  );
}

// ------- Gmail API (using advanced service) -------

function getEmail(messageId, userOAuthToken) {
  GmailApp.setCurrentMessageAccessToken(userOAuthToken);
  return GmailApp.getMessageById(messageId);
}

function extractEmailContents(message) {
  const subject = message.getSubject();
  const bodyText = message.getBody();
  
  return { subject, bodyText: bodyText || '' };
}

// ------- People API (using advanced service) -----------

const PEOPLE_PREFIX = "people/";

function getPersonProfile(peopleName = "people/105666481551027660890", personFields = "birthdays") {
  return People.People.get(peopleName, { personFields: `${personFields}` });
}

function getCurrentUserName() {
  // Person fields cannot be empty, using birthdays which is permitted
  return People.People.get("people/me", { personFields: 'birthdays' }).resourceName.replace(PEOPLE_PREFIX, USERS_PREFIX);
}
