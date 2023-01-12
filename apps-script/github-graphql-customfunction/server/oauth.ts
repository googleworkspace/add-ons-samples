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

// Cached instance of service for current script execution
let _service: GoogleAppsScriptOAuth2.OAuth2Service | undefined;

/**
 * Fetches the configured oauth service.
 * 
 * @returns Oauth service instance
 */
export function getOAuthService(): GoogleAppsScriptOAuth2.OAuth2Service {
  if (_service) {
    return _service;
  }
 _service = buildOAuthService();
  return _service;
}

/**
 * Constructs the oauth service. Callers should use
 * `getOAuthService` to get a cached instance.
 * 
 * @returns Initialized oauth service
 */
function buildOAuthService(): GoogleAppsScriptOAuth2.OAuth2Service {
    const scriptProps = PropertiesService.getScriptProperties();
    const clientId = scriptProps.getProperty('CLIENT_ID');
    const clientSecret = scriptProps.getProperty('CLIENT_SECRET');
    if (!(clientId && clientSecret)) {
      throw new Error('Client ID and secret are not configured.');
    }
  
    const service = OAuth2.createService('GitHub')
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setScope('read:user,read:org,repo')
    .setCallbackFunction('authCallback')
    .setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
    .setTokenUrl('https://github.com/login/oauth/access_token')
  
    const cache = CacheService.getDocumentCache();
    if (cache) {
      service.setCache(cache);
    }
    const store = PropertiesService.getDocumentProperties();
    if (store) {
      service.setPropertyStore(store);
    }
    return service;
}