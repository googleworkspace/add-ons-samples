/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getOAuthService } from './oauth';
import type { JsonObject } from 'type-fest';

/**
 * Executes a GraphQL query against the GitHub API.
 * 
 * @param query 
 * @returns Flatted data for insertion into the sheet.
 */
export function runQuery<T = JsonObject>(query: string): T {
    const service = getOAuthService();
    if (!service.hasAccess()) {
        throw new Error('Sheet is not authorized to call the GitHub API');
    }
    const payload = JSON.stringify({
        query
    });
    const response = UrlFetchApp.fetch('https://api.github.com/graphql', {
        method: 'post',
        headers: {
            'Authorization': `Bearer ${service.getAccessToken()}`,
            'Content-Type': 'application/json',
        },
        payload,
        muteHttpExceptions: true,
        followRedirects: true,
    });
    const status = response.getResponseCode();
    if (status >= 400) {
        throw new Error(`Unable to run query, status code ${status} ${response.getContentText()}`);
    }
    const parsedResponse = JSON.parse(response.getContentText());

    if (parsedResponse.errors?.length > 0) {
        const msg = parsedResponse.errors[0].message;
        throw new Error(msg);
    }

    return parsedResponse.data;
}

interface ViewerResponse {
    viewer?: {
        login: string;
    }
};

export function getAuthorizedUser(): string | undefined {
    const query = `
        query { 
            viewer { 
                login
            }
        }
    `;
    const res = runQuery<ViewerResponse>(query);
    return res.viewer?.login;
}
