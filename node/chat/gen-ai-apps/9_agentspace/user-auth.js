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

import { OAuth2Client } from 'google-auth-library';
import { parse } from 'url';
import { DatabaseService } from './database.js';

// The application's OAuth2 client credentials.
import credentials from './credentials.json' with { type: 'json' };
const keys = credentials.web;

// Define the app's authorization scopes to access the user's data and
// create Chat messages on their behalf.
const scopes = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/chat.messages.create'
];

/**
 * Converts the provided data to a JSON string then encodes it with Base64.
 * 
 * @param {!Object} data The data to encode.
 * @return {string} Encoded data
 */
function base64encode(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decodes the provided Base64 JSON string into an object.
 * 
 * @param {!string} data The data to decode.
 * @return {Object} Decoded data
*/
function base64decode(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString('ascii'));
}

/**
 * Creates a new OAuth2 client with the configured keys.
 * 
 * @return {OAuth2Client} A client with the configured keys but without
 *     initialized credentials.
 */
function createClient() {
  return new OAuth2Client(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0],
  );
}

/**
 * Initializes an OAuth2 client with credentials.
 * 
 * @param {!Credentials} credentials The OAuth2 credentials.
 * @return {OAuth2Client} An initialized client.
 */
function initializeOauth2Client(credentials) {
  const oauth2Client = createClient();
  oauth2Client.setCredentials(credentials);
  return oauth2Client;
}

/**
 * Generates the URL to start the OAuth2 authorization flow.
 * 
 * @param {!string} userName The resource name of the Chat user requesting
 *     authorization.
 * @param {!string} configCompleteRedirectUrl The URL to redirect to after
 *     completing the flow.
 * @return {string} The authorization URL to start the OAuth2 flow. The
 *     provided user name and redirect URL are encoded in the returned URL's
 *     state parameter to be retrieved later by the callback processor.
 */
export function generateAuthUrl(userName, configCompleteRedirectUrl) {
  const oauth2Client = createClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' '),
    include_granted_scopes: true,
    state: base64encode({ userName, configCompleteRedirectUrl }),
    prompt: 'consent'
  });
}

/**
 * Handles an OAuth2 callback request.
 *
 * If the authorization was succesful, it exchanges the received code with
 * credentials and saves them into Firestore to be used when
 * calling the Discovery Engine API. Then, it redirects the response to the
 * completion URL specified in the authorization URL parameters.
 *
 * If the authorization fails, it just prints an error message to the response.
 *
 * @param {!Object} req An Express-style HTTP request.
 * @param {!Object} res An Express-style HTTP response.
 * @return {Promise<void>}
 */
export async function oauth2callback(req, res) {
  const q = parse(req.url, true).query;
  if (q.error) {
    // An error response e.g. error=access_denied.
    console.error('Error: ' + q.error);
    res.status(403).send('Error: ' + q.error);
    return;
  }
  if (typeof q.code !== 'string') {
    console.error('Error: Invalid OAuth2 code: ' + q.code);
    res.status(400).send('Error: Invalid OAuth2 code');
    return;
  }

    // Read the state with the userName and configCompleteRedirectUrl from the
    // provided state.
  let state;
  try {
    state = base64decode(q.state);
  } catch (e) {
    console.error('Error: Invalid request state: ' + q.state);
    res.status(400).send('Error: Invalid request state');
    return;
  }

  // Get credentials including access and refresh tokens.
  const oauth2Client = createClient();
  const credentials = (await oauth2Client.getToken(q.code)).tokens;

  const ticket = await oauth2Client.verifyIdToken({
    idToken: credentials.id_token,
    audience: keys.client_id,
  });
  const userId = ticket.getPayload().sub;

  // Validate that the user who granted consent is the same who requested it.
  if (`users/${userId}` !== state.userName) {
    console.error('Error: token user does not correspond to request user.');
    res.status(400).send('Error: the user who granted consent does not correspond to' +
      ' the user who initiated the request. Please start the configuration' +
      ' again and use the same account you\'re using in Google Chat.');
    return;
  }
    // Save credentials to the database so the app can use them to make API calls.
  await DatabaseService.saveUserCredentials(state.userName, credentials);

    // Redirect to the URL that tells Google Chat that the configuration is
    // completed.
  res.redirect(state.configCompleteRedirectUrl);
}

// The OAuth2 credentials for the user are not found in the database or are invalid.
export const InvalidCredentialsException = class extends Error {
  constructor(message) {
    super(message);
  }
}

/**
 * Creates a OAuh2 client with user's credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<OAuth2Client>} The OAuth2 client.
 * @throws {InvalidCredentialsException} If there are no OAuth2 credentials stored for
 *     the user in the database.
 */
export const createOAuth2Client = async function (userName) {
  // Try to obtain an existing OAuth2 credentials from database.
  const credentials = await DatabaseService.getUserCredentials(userName);
  if (credentials === null) {
    throw new InvalidCredentialsException('Credentials not found');
  }

  // Authenticate with the user's OAuth2 credentials.
  return initializeOauth2Client(credentials);
}
