/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const APP_NAME = 'Connectivity app';
const LOGOUT_COMMAND_ID = 1;

// Set to the client_secrets.json file content
const CLIENT_SECRETS = {};

/**
 * Responds to a MESSAGE event in Google Chat.
 * 
 * @param {Object} event the event object from Google Workspace Add On
 */
function onMessage(event) {
  try {
    // Try to obtain an existing OAuth2 token from storage.
    const meetService = getMeetService_();
    if (!meetService.hasAccess()) {
      // App doesn't have credentials for the user yet.
      // Request configuration to obtain OAuth2 credentials.
      getConfigRequestResponse(meetService).throwException();
    }

    // Call Meet API to create the new space with the user's OAuth2 credentials.
    const response = UrlFetchApp.fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + meetService.getAccessToken() },
      // An empty body is sufficient to create a default space.
      payload: JSON.stringify({})
    });
    const meetSpace = JSON.parse(response.getContentText());
    return sendCreateTextMessageAction(`New Meet was created: ${meetSpace.meetingUri}`);
  } catch (e) {
    // This error probably happened because the user revoked the
    // authorization. So, let's request configuration again.
    console.log('Error creating Meet space: ' + JSON.stringify(e));
    throw e;
  }
}

/**
 * Responds to a APP_COMMAND event in Google Chat.
 * 
 * @param {Object} event the event object from Google Workspace Add On
 */
function onAppCommand(event) {
  // Extract data from the event.
  const chatEvent = event.chat;
  const appCommandId = chatEvent.appCommandPayload.appCommandMetadata.appCommandId;

  if (appCommandId == LOGOUT_COMMAND_ID) {
    // Delete OAuth2 credentials from storage if any.
    resetMeetServiceAuth();
    // Reply a Chat message with confirmation
    return sendCreateTextMessageAction('You are now logged out!');
  }
}

// ----------------------
// Chat utils
// ----------------------

/**
 * Returns an action response that tells Chat to reply with a text message.
 * 
 * @param {!string} text The text of the message to reply with.
 * @returns {Object} An ActionResponse message.
 */
function sendCreateTextMessageAction(text) {
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: { text: text } }}}};
}

/**
 * Returns an action response that tells Chat to request configuration for the
 * app. The configuration will be tied to the user who sent the event.
 * 
 * @param {!Service_} meetService The Meet API OAuth2 service
 * @param {!string} configCompleteRedirectUrl The URL to redirect to after
 *     completing the flow.
 * @return {Object} An ActionResponse message request additional configuration.
 */
function getConfigRequestResponse(meetService) {
  return CardService.newAuthorizationException()
    .setAuthorizationUrl(meetService.getAuthorizationUrl())
    .setResourceDisplayName(APP_NAME);
}

// ----------------------
// OAuth2 utils
// ----------------------

/**
 * Create a new OAuth2 service to facilitate accessing the Meet API.
 *
 *  @return A configured OAuth2 service object.
 */
function getMeetService_() {
  return OAuth2.createService('Google Meet API')
    .setAuthorizationBaseUrl(CLIENT_SECRETS.web.auth_uri)
    .setTokenUrl(CLIENT_SECRETS.web.token_uri)
    .setClientId(CLIENT_SECRETS.web.client_id)
    .setClientSecret(CLIENT_SECRETS.web.client_secret)
    .setScope('https://www.googleapis.com/auth/meetings.space.created')
    .setCallbackFunction('meetAuthCallback')
    .setCache(CacheService.getUserCache())
    .setPropertyStore(PropertiesService.getUserProperties())
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

/**
 * Function that handles callback requests from the OAuth2 authorization flow
 * for a Meet API OAuth2 service.
 * 
 *  @param {Object} request The request data received from the callback function.
 *  @return {HtmlOutput} a success or denied HTML message to display to the user.
 */
function meetAuthCallback(request) {
  const meetService = getMeetService_();
  const authorized = meetService.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab.');
  }
}

/**
* Reset user's credentials for a Meet API OAuth2 service.
*/
function resetMeetServiceAuth() {
  getMeetService_().reset();
}
