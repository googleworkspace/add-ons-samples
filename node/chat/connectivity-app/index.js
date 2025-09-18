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
 * @fileoverview The main script for the project, which starts an Express app
 * to listen to HTTP requests from Google Workspace add on events and the
 * OAuth flow callback.
 */

import {oauth2callback, generateAuthUrl, initializeOauth2Client} from './oauth2-flow.js';
import {DatabaseService} from './database.js';
import {SpacesServiceClient} from '@google-apps/meet';
import express from 'express';

// Configure the application
const PORT = process.env.PORT || 8080;
const APP_NAME = process.env.APP_NAME || 'Connectivity app';
const LOGOUT_COMMAND_ID = process.env.LOGOUT_COMMAND_ID || 1;

// Error code for Unauthenticated requests.
// (see https://grpc.io/docs/guides/status-codes/)
const UNAUTHENTICATED = 16;

// Initialize an Express app to handle routing.
const app = express()
    .use(express.urlencoded({extended: false}))
    .use(express.json())
    .enable('trust proxy');

/**
 * App route that handles callback requests from the OAuth2 authorization flow.
 * The handler exhanges the code received from the OAuth2 server with a set of
 * credentials, stores them in the database, and redirects the request to the
 * config complete URL provided in the request.
 */
app.get('/oauth2', async (req, res) => {
  await oauth2callback(req, res);
});

// App route that responds to Google Workspace add on events from Google Chat.
app.post('/', async (req, res) => {
  // Extract data from the event.
  const chatEvent = req.body.chat;
  const userName = chatEvent.user.name;
  let configCompleteRedirectUrl = null;

  try {
    if (chatEvent.messagePayload) {
      // Handle message events
      configCompleteRedirectUrl = chatEvent.messagePayload.configCompleteRedirectUri;

      // Try to obtain an existing OAuth2 token from storage.
      const credentials = await DatabaseService.getUserCredentials(userName);

      if (credentials === null) {
        // App doesn't have credentials for the user yet.
        // Request configuration to obtain OAuth2 credentials.
        return res.send(getConfigRequestResponse(userName, configCompleteRedirectUrl));
      }

      // Authenticate with the user's OAuth2 credentials.
      const oauth2Client = initializeOauth2Client(credentials);

      // Call Meet API to create the new space with the user's OAuth2 credentials.
      const meetClient = new SpacesServiceClient({
        authClient: oauth2Client
      });
      const [meetSpace] = await meetClient.createSpace({});
      
      // Save updated credentials to the database so the app can use them to make API calls.
      await DatabaseService.saveUserCredentials(userName, oauth2Client.credentials);

      // Reply a Chat message with the link
      return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: {
        message: { text: `New Meet was created: ${meetSpace.meetingUri}` }
      }}}});
    } else if (chatEvent.appCommandPayload) {
      // Handles command events
      configCompleteRedirectUrl = chatEvent.appCommandPayload.configCompleteRedirectUri;

      switch (chatEvent.appCommandPayload.appCommandMetadata.appCommandId) {
        case LOGOUT_COMMAND_ID:
          // Delete OAuth2 credentials from storage if any.
          await DatabaseService.deleteUserCredentials(userName);
          // Reply a Chat message with confirmation
          return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
            text: 'You are now logged out!'
          }}}}});
      }
    }
  } catch (e) {
    if (e.code === UNAUTHENTICATED) {
      // This error probably happened because the user revoked the
      // authorization. So, let's request configuration again.
      return res.send(getConfigRequestResponse(userName, configCompleteRedirectUrl));
    }
    throw e;
  }
});

/**
 * Returns an action response that tells Chat to request configuration for the
 * app. The configuration will be tied to the user who sent the event.
 * 
 * @param {!string} userName The resource name of the Chat user requesting
 *     authorization.
 * @param {!string} configCompleteRedirectUrl The URL to redirect to after
 *     completing the flow.
 * @return {Object} An ActionResponse message request additional configuration.
 */
function getConfigRequestResponse(userName, configCompleteRedirectUrl) {
  return { basicAuthorizationPrompt: {
    authorizationUrl: generateAuthUrl(userName, configCompleteRedirectUrl),
    resource: APP_NAME
  }};
}

// Start listening for requests.
app.listen(PORT, () => {
  console.log(`Server is running in port - ${PORT}`);
});
