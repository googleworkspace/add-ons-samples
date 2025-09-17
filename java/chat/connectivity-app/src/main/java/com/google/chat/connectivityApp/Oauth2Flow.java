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
package com.google.chat.connectivityApp;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.UserCredentials;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.JsonFactory;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.logging.Logger;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Service that handles the OAuth authentication flow. */
@Component
public class Oauth2Flow {
  private static final Logger logger =
      Logger.getLogger(Oauth2Flow.class.getName());

  private static final JsonFactory JSON_FACTORY =
      GsonFactory.getDefaultInstance();

  private static final Gson GSON = new Gson();

  // Application OAuth credentials.
  private static final String CLIENT_SECRETS_FILE = "/client_secrets.json";

  // Define the app's authorization scopes.
  private static final ImmutableList<String> SCOPES = ImmutableList.of(
    "openid", "https://www.googleapis.com/auth/meetings.space.created");

  private final Database database;
  private final GoogleClientSecrets clientSecrets;

  /** Initializes the Service. */
  public Oauth2Flow(Database database) throws IOException {
    this.database = database;
    InputStream is = Oauth2Flow.class.getResourceAsStream(CLIENT_SECRETS_FILE);
    clientSecrets =  GoogleClientSecrets.load(
        JSON_FACTORY, new InputStreamReader(is));
  }

  /**
   * Creates a new OAuth2 client with the configured keys.
   * 
   * @return a client with the configured keys but without initialized
   *     credentials.
   */
  private GoogleAuthorizationCodeFlow createClient()
      throws GeneralSecurityException, IOException  {
    return new GoogleAuthorizationCodeFlow.Builder(
        GoogleNetHttpTransport.newTrustedTransport(),
        JSON_FACTORY,
        clientSecrets,
        SCOPES)
      .setAccessType("offline")
      .setApprovalPrompt("force")
      .build();
  }

  /**
   * Generates the URL to start the OAuth2 authorization flow.
   * 
   * @param userName the resource name of the Chat user requesting
   *     authorization.
   * @param configCompleteRedirectUrl the URL to redirect to after
   *     completing the flow.
   * @return the authorization URL to start the OAuth2 flow. The
   *     provided user name and redirect URL are encoded in the returned URL's
   *     state parameter to be retrieved later by the callback processor.
   */
  public String getAuthorizationUrl(
        String userName, String configCompleteRedirectUrl)
        throws GeneralSecurityException, IOException  {
    GoogleAuthorizationCodeFlow oauth2Client = createClient();
    ImmutableMap<String, String> stateMap = ImmutableMap.of(
        "userName", userName,
        "configCompleteRedirectUrl", configCompleteRedirectUrl);
    String state =
        Base64.getUrlEncoder().encodeToString(GSON.toJson(stateMap).getBytes());
    return oauth2Client
        .newAuthorizationUrl()
        .setState(state)
        .setRedirectUri(clientSecrets.getDetails().getRedirectUris().get(0))
        .build();
  }

  /**
   * Handles an OAuth2 callback request.
   * 
   * If the authorization was succesful, it exchanges the received code with
   * credentials and saves them into Firestore to be used when
   * calling the Meet API. Then, it redirects the response to the
   * completion URL specified in the authorization URL parameters.
   *
   * If the authorization fails, it just prints an error message to the
   * response.
   * 
   * @param error the value of the <code>error</code> request parameter
   * @param code the value of the <code>code</code> request parameter
   * @param state the value of the <code>state</code> request parameter
   * @return the URL to redirect to after the OAuth2 flow is completed
   */
  public String oauth2callback(
        Optional<String> error, Optional<String> code, Optional<String> state)
        throws Exception {
    // Handle the OAuth 2.0 server response.
    if (error.isPresent()) {
      // An error response e.g. error=access_denied.
      logger.warning("Error: " + error.get());
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Error: " + error.get());
    }

    // Read the state with the userName and configCompleteRedirectUrl from the
    // provided state.
    if (state.isEmpty()) {
      logger.warning("Missing state in the request.");
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Missing state in the request.");
    }
    JsonObject stateMap;
    try {
      String stateJson = new String(Base64.getUrlDecoder().decode(state.get()));
      stateMap = JsonParser.parseString(stateJson).getAsJsonObject();
    } catch (IllegalArgumentException | JsonParseException e) {
      logger.warning("Error: Invalid request state: " + state.get());
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Error: Invalid request state.");
    }

    // Get credentials including access and refresh tokens.
    GoogleAuthorizationCodeFlow oauth2Client = createClient();
    GoogleTokenResponse tokenResponse = oauth2Client
        .newTokenRequest(code.get())
        .setRedirectUri(clientSecrets.getDetails().getRedirectUris().get(0))
        .execute();

    GoogleIdToken idToken =
        GoogleIdToken.parse(JSON_FACTORY, tokenResponse.getIdToken());
    String userId = idToken.getPayload().getSubject();

    // Validate that the user who granted consent is the same who requested it.
    String userName = stateMap.get("userName").getAsString();
    if (!userName.equals("users/" + userId)) {
      logger.warning("Error: token user does not correspond to request user.");
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Error: the user who granted consent does not correspond to the " +
          " user who initiated the request. Please start the configuration" +
          " again and use the same account you're using in Google Chat.");
    }

    // Save user's credentials to the database so the app can use them to make API calls.
    database.saveUserCredentials(
      userId,
      UserCredentials
          .newBuilder()
          .setClientId(clientSecrets.getDetails().getClientId())
          .setClientSecret(clientSecrets.getDetails().getClientSecret())
          .setAccessToken(new AccessToken(
              tokenResponse.getAccessToken(),
              new Date(System.currentTimeMillis() + tokenResponse.getExpiresInSeconds() * 1000L)))
          .setRefreshToken(tokenResponse.getRefreshToken())
          .build());

    // Redirect to the URL that tells Google Chat that the configuration is
    // completed.
    return stateMap.get("configCompleteRedirectUrl").getAsString();
  }
}
