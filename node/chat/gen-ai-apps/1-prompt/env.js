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
 * Project environment settings.
 */
export const env = {
  // Replace with your app port.
  port: parseInt(process.env.PORT) || 8080,

  // Replace with your GCP project ID.
  projectID: process.env.PROJECT_ID || 'your-google-cloud-project-id',

  // Replace with your GCP project location.
  location: process.env.LOCATION || 'your-google-cloud-project-location',

  // Replace with the Gemini model to use.
  model: process.env.MODEL || 'gemini-2.5-flash-lite',
};
