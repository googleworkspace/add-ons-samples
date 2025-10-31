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

// Get credentials from service account to access Vertex AI and Google Chat APIs
function getCredentials() {
  const credentials = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_KEY');
  if (!credentials) {
    throw new Error("SERVICE_ACCOUNT_KEY script property must be set.");
  }
  const parsedCredentials = JSON.parse(credentials);
  return OAuth2.createService("SA")
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(parsedCredentials['private_key'])
    .setIssuer(parsedCredentials['client_email'])
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope([
      // Vertex AI scope
      "https://www.googleapis.com/auth/cloud-platform",
      // Google Chat scope
      // All Chat operations are taken by the Chat app itself
      "https://www.googleapis.com/auth/chat.bot"
    ]);
}

// Converts a snake_case_string to a user-readable Title Case string.
function snakeToUserReadable(snakeCaseString = "") {
  return snakeCaseString.replace(/_/g, ' ').split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Formats text from Markdown to HTML.
function markdownToHtml(markdownText) {
  return new showdown.Converter().makeHtml(markdownText);
}

// Decodes JWT playload
function decodeJwtPayload(token) {
  const payloadBase64Url = token.split('.')[1];
  let base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const decodedBytes = Utilities.base64Decode(base64);
  const jsonPayload = Utilities.newBlob(decodedBytes).getDataAsString();
  return JSON.parse(jsonPayload);
}

/**
 * Polls the status of a Google Cloud Long-Running Operation (LRO) until it's complete.
 */
function pollLroStatus(lroName) {
  const MAX_POLLS = 60;
  const POLL_INTERVAL = 5000;
  let attempts = 0;
  console.log(`Starting to poll operation: ${lroName}`);
  while (attempts < MAX_POLLS) {
    attempts++;
    const response = UrlFetchApp.fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/${lroName}`, {
        method: 'get',
        headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
        contentType: 'application/json',
        muteHttpExceptions: true
      }
    );
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      const errorDetails = JSON.parse(response.getContentText()).error || { message: 'Unknown API error' };
      console.log(`API call to check status failed with code ${responseCode}: ${errorDetails.message}`);
      break;
    }

    const operation = JSON.parse(response.getContentText());
    if (operation.done) {
      console.log(`Operation completed in ${attempts} attempts.`);
      if (operation.error) {
        console.log(`Completed with error: ${JSON.stringify(operation.error)}`);
      } else {
        console.log(`Completed`);
      }
      return;
    }
    console.log(`Attempt ${attempts}: Operation still running. Waiting ${POLL_INTERVAL / 1000} seconds...`);
    Utilities.sleep(POLL_INTERVAL);
  }
  console.log(`Polling timed out after ${MAX_POLLS} attempts.`);
}

// Extracts hostname from URL string
function getUrlHostname(url) {
  const hostnameRegex = /^(?:[a-z]+:\/\/)?([^\/\s]+)/i;
  const match = url.match(hostnameRegex);
  if (match && match[1]) {
    let hostname = match[1].split(':')[0];
    if (hostname.endsWith('/')) {
      hostname = hostname.slice(0, -1);
    }
    return hostname;
  }
  return null; 
}

// Returns whether a URL returns an image that is supported
function isUrlImage(imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Machu_Picchu%2C_Peru.jpg/1920px-Machu_Picchu%2C_Peru.jpg") {
  const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
  const response = UrlFetchApp.fetch(imageUrl, {
    method: "get",
    muteHttpExceptions: true
  });
  return ACCEPTED_IMAGE_TYPES.includes(response.getAllHeaders()['Content-Type']);
}
