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

import { google } from 'googleapis';

const projectNumber = process.env.PROJECT_NUMBER || 'your-google-cloud-project-number';
const location = process.env.LOCATION || 'your-location';
const serviceName = process.env.SERVICE_NAME || 'you-service-name'

/**
 * Programmatically retrieve the Cloud Run service URL.
 * 
 * @returns the Cloud Run service URL.
 */
async function getGoogleCloudRunServiceUrl() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const run = google.run({
        version: 'v1',
        auth: await auth.getClient()
    });

    const response = await run.projects.locations.services.get({
        name: `projects/${projectNumber}/locations/${location}/services/${serviceName}`
    });
    return response.data.status.url;
}

// Expose the Cloud Run service URL
export const BASE_URL = await getGoogleCloudRunServiceUrl();
