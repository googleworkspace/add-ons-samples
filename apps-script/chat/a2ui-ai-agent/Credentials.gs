// Copyright 2026 Google LLC. All Rights Reserved.
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
