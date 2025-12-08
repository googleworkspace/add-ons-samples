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

const express = require('express');
const { OAuth2Client } = require('google-auth-library');

// Service account email to verify requests from
const SERVICE_ACCOUNT_EMAIL = 'your-add-on-service-account-email';

// Endpoint URL of the add-on
const HTTP_ENDPOINT = 'your-add-on-endpoint-url';

const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

/**
 * Web app that responds to events sent from a Chat app built as Google Workspace add-on.
 *
 * @param {Object} req Request sent from Google Workspace add-on
 * @param {Object} res Response to send back
 */
app.post('/', async (req, res) => {
  return res.json({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: (await verifyAddOnRequest(req)) ? 'Successful verification!' : 'Failed verification!'
  }}}}});
});

// [START verify_add_on_request]
/**
 * Determine whether a Google Workspace add-on request is legitimate.
 * 
 * @param {Object} req Request sent from Google Workspace add-on
 * @return {boolean} Whether the request is legitimate
 */
async function verifyAddOnRequest(req) {
  try {
    const authorization = req.headers.authorization;
    const idToken = authorization.substring('Bearer '.length, authorization.length);
    const ticket = await new OAuth2Client().verifyIdToken({idToken, audience: HTTP_ENDPOINT});
    return ticket.getPayload().email_verified
        && ticket.getPayload().email === SERVICE_ACCOUNT_EMAIL;
  } catch (unused) {
    return false;
  }
}
// [END verify_add_on_request]

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running in port - ${PORT}`);
});
