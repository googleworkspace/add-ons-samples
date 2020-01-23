// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Exception to raise when authorization is required.
 *
 * @constructor
 */
function AuthorizationRequiredException() {}

/**
 * Prototype object for the GitHub API client.
 */
var GitHubClientPrototype = {
  apiEndpoint: 'https://api.github.com/graphql',
  oauthService: null,
  /**
   * Execute a GraphQL query against the GitHub API.
   *
   * @param {Query} query - GraphQL query to run
   * @param {Object} vars - Named variables to include in the query
   * @return {Object} API response
   */
  query: function(query, vars) {
    if (DEBUG) {
      console.time('query');
    }
    try {
      if (!this.oauthService.hasAccess()) {
        throw new AuthorizationRequiredException();
      }

      var payload = JSON.stringify({
        query: query,
        variables: vars,
      });

      if (DEBUG) {
        console.log(payload);
      }

      var headers = {
        'Authorization': Utilities.formatString(
            'Bearer %s',
            this.oauthService.getAccessToken()
        ),
      };

      var response = UrlFetchApp.fetch(this.apiEndpoint, {
        method: 'post',
        headers: headers,
        payload: payload,
        muteHttpExceptions: true,
      });

      if (DEBUG) {
        console.log(response);
      }

      var rawResponse = response.getContentText();
      var parsedResponse = JSON.parse(rawResponse);

      if (DEBUG) {
        console.log(parsedResponse);
      }

      if (parsedResponse.message == 'Bad credentials') {
        throw new AuthorizationRequiredException();
      }

      return parsedResponse.data;
    } finally {
      if (DEBUG) {
        console.timeEnd('query');
      }
    }
  },

  /**
   * De-authorizes the GitHub client.
   */
  disconnect: function() {
    if (!this.oauthService.hasAccess()) {
      return;
    }

    var url = Utilities.formatString(
        'https://api.github.com/applications/%s/grant',
        this.credentials.clientId);
    var basicAuthInfo = this.credentials.clientId + ':' + this.credentials.clientSecret;
    var headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.doctor-strange-preview+json',
      'Authorization': Utilities.formatString(
          'Basic %s',
          Utilities.base64Encode(basicAuthInfo)
      ),
    };
    var payload = JSON.stringify({
      access_token: this.oauthService.getAccessToken(),
    });

    if (DEBUG) {
      console.log('Deleting access token');
    }
    var response = UrlFetchApp.fetch(url, {
      method: 'delete',
      headers: headers,
      payload: payload,
      muteHttpExceptions: true,
    });

    if (DEBUG) {
      console.log(response);
    }
    this.oauthService.reset();
  },

  /**
   * Returns the URL for user authorization.
   *
   * @return {string} authorization URL
   */
  authorizationUrl: function() {
    return this.oauthService.getAuthorizationUrl();
  },

  /**
   * Handles the oauth response from GitHub. Raises an error
   * if authorization declined or failed.
   *
   * @param {Object} oauthResponse - response parameters
   */
  handleOAuthResponse: function(oauthResponse) {
    var authorized = this.oauthService.handleCallback(oauthResponse);
    if (!authorized) {
      throw new Error('Authorization declined.');
    }
  },
};

/**
 * Gets a client instance configured with the script"s credentials.
 *
 * Requires the script property `githubCredentials` to be defined. The value
 * must be a JSON object with the properties `clientId` and `clientSecret`
 * defined. Obtain these values by registering the project in GitHub"s developer
 * console.
 *
 * @return {GitHubClient} client instance
 */
function githubClient() {
  var credentials = getGithubCredentials();
  if (!credentials) {
    throw new Error(
        'No credentials found. Set the script property `githubCredentials`'
    );
  }
  var oauthService = OAuth2.createService('github')
      .setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
      .setTokenUrl('https://github.com/login/oauth/access_token')
      .setClientId(credentials.clientId)
      .setClientSecret(credentials.clientSecret)
      .setCallbackFunction('handleGitHubOAuthResponse')
      .setPropertyStore(PropertiesService.getUserProperties())
      .setCache(CacheService.getUserCache())
      .setScope('user user:email user:follow repo');
  return _.assign(Object.create(GitHubClientPrototype), {
    oauthService: oauthService,
    credentials: credentials,
  });
}
