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
// [START chat_incident_response_app]

/**
 * Responds to a MESSAGE event in Google Chat.
 * 
 * It always respond with a simple "Hello" text message.
 *
 * @param {Object} event the event object from Google Chat
 */
function onMessage(event) {
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: "Hello from Incident Response app!"
  }}}}};
}

/**
 * Responds to an APP_COMMAND event in Google Chat.
 *
 * @param {Object} event the event object from Google Chat
 */
function onAppCommand(event) {
  if (event.chat.appCommandPayload.appCommandMetadata.appCommandId != CLOSE_INCIDENT_COMMAND_ID) {
    return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
      text: "Command not recognized. Use the quick command `Close incident` to close the incident managed by this space."
    }}}}};
  }
  return { action: { navigations: [{ pushCard: { sections: [{
    header: "Close Incident",
    widgets: [{
      textInput: {
        label: "Please describe the incident resolution",
        type: "MULTIPLE_LINE",
        name: "description"
      }
    }, {
      buttonList: { buttons: [{
        text: "Close Incident",
        onClick: { action: { function: "closeIncident" }}
      }]}
    }]
  }]}}]}};
}

/**
 * Responds to an BUTTON_CLICKED event in Google Chat from Close Incident dialog.
 *
 * @param {Object} event the event object from Google Chat
 */
function closeIncident(event) {
  if (event.chat.buttonClickedPayload.isDialogEvent) {
    if (event.chat.buttonClickedPayload.dialogEventType == 'SUBMIT_DIALOG') {
      return processSubmitDialog_(event);
    }
    return { action: { navigations: [{ endNavigation: {
      action: "CLOSE_DIALOG" }
    }]}};
  }
}

/**
 * Responds to an BUTTON_CLICKED event in Google Chat from Close Incident dialog submission.
 *
 * It creates a Doc with a summary of the incident information and posts a message
 * to the space with a link to the Doc.
 *
 * @param {Object} event the event object from Google Chat
 */
function processSubmitDialog_(event) {
  const resolution = event.commonEventObject.formInputs.description.stringInputs.value[0];
  const space = event.chat.buttonClickedPayload.space;
  const chatHistory = concatenateAllSpaceMessages_(space.name);
  const chatSummary = summarizeChatHistory_(chatHistory);
  const docUrl = createDoc_(space.displayName, resolution, chatHistory, chatSummary);
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: `Incident closed with the following resolution: ${resolution}\n\nHere is the automatically generated post-mortem:\n${docUrl}`
  }}}}};
}

/**
 * Lists all the messages in the Chat space, then concatenate all of them into
 * a single text containing the full Chat history.
 *
 * For simplicity for this demo, it only fetches the first 100 messages.
 *
 * Messages with slash commands are filtered out, so the returned history will
 * contain only the conversations between users and not app command invocations.
 *
 * @return {string} a text containing all the messages in the space in the format:
 *          Sender's name: Message
 */
function concatenateAllSpaceMessages_(spaceName) {
  // Call Chat API method spaces.messages.list
  const response = Chat.Spaces.Messages.list(spaceName, { 'pageSize': 100 });
  const messages = response.messages;
  // Fetch the display names of the message senders and returns a text
  // concatenating all the messages.
  let userMap = new Map();
  return messages
    .filter(message => message.slashCommand === undefined)
    .map(message => `${getUserDisplayName_(userMap, message.sender.name)}: ${message.text}`)
    .join('\n');
}

/**
 * Obtains the display name of a user by using the Admin Directory API.
 *
 * The fetched display name is cached in the provided map, so we only call the API
 * once per user.
 *
 * If the user does not have a display name, then the full name is used.
 *
 * @param {Map} userMap a map containing the display names previously fetched
 * @param {string} userName the resource name of the user
 * @return {string} the user's display name
 */
function getUserDisplayName_(userMap, userName) {
  if (userMap.has(userName)) {
    return userMap.get(userName);
  }
  let displayName = 'Unknown User';
  try {
    const user = AdminDirectory.Users.get(
      userName.replace("users/", ""),
      { projection: 'BASIC', viewType: 'domain_public' });
    displayName = user.name.displayName ? user.name.displayName : user.name.fullName;
  } catch (e) {
    // Ignore error if the API call fails (for example, because it's an
    // out-of-domain user or Chat app)) and just use 'Unknown User'.
  }
  userMap.set(userName, displayName);
  return displayName;
}
// [END chat_incident_response_app]
