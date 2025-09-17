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

import com.fasterxml.jackson.databind.JsonNode;
import com.google.auth.oauth2.UserCredentials;
import com.google.api.gax.core.FixedCredentialsProvider;
import com.google.api.gax.rpc.ApiException;
import com.google.api.gax.rpc.StatusCode.Code;
import com.google.apps.meet.v2.CreateSpaceRequest;
import com.google.apps.meet.v2.Space;
import com.google.apps.meet.v2.SpacesServiceClient;
import com.google.apps.meet.v2.SpacesServiceSettings;
import com.google.gson.JsonObject;

import java.util.Date;
import java.util.Optional;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

/**
 * The main class for the project, which implements a SpringBoot application
 * and REST controller to listen to HTTP requests from Chat events and the OAuth
 * flow callback.
 */
@SpringBootApplication
@RestController
public class App {
  /** Executes the SpringBoot application. */
  public static void main(String[] args) {
    SpringApplication.run(App.class, args);
  }

  // Configure the application
  final private String name = "Connectivity app";
  final private int logout = 1;

  private final Oauth2Flow oauth2Flow;
  private final Database database;

  /** Initializes the app dependencies. */
  public App(Oauth2Flow oauth2Flow, Database database) {
    this.oauth2Flow = oauth2Flow;
    this.database = database;
  }

  /**
   * App route that handles callback requests from the OAuth authorization flow.
   * The handler exhanges the code received from the OAuth2 server with a set of
   * credentials, stores them in the database, and redirects the request to the
   * config complete URL from the request.
   */
  @GetMapping("/oauth2")
  public RedirectView onOauthCallback(
      @RequestParam("error") Optional<String> error,
      @RequestParam("code") Optional<String> code,
      @RequestParam("state") Optional<String> state) throws Exception {
    String redirectUrl = oauth2Flow.oauth2callback(error, code, state);
    return new RedirectView(redirectUrl);
  }

  /** App route that responds to Google Workspace add on events from Google Chat. */
  @PostMapping("/")
  public String onEvent(
      @RequestHeader("authorization") String authorization,
      @RequestBody JsonNode event) throws Exception {
    // Extract data from the event.
    JsonNode chatEvent = event.get("chat");
    String userName =
      chatEvent.get("user").get("name").textValue();
    String configCompleteRedirectUrl = null;

    try {
      if (chatEvent.has("messagePayload")) {
        // Handle message events
        configCompleteRedirectUrl = chatEvent.get("messagePayload").get("configCompleteRedirectUri").asText();

        // Try to obtain existing OAuth2 credentials from storage.
        Optional<UserCredentials> credentials = database.getUserCredentials(userName);
        
        if (credentials.isEmpty()) {
          // App doesn't have credentials for the user yet.
          // Request configuration to obtain OAuth2 credentials.
          return getConfigRequest(userName, configCompleteRedirectUrl);
        }

        // Authenticate with the user's OAuth2 credentials.
        SpacesServiceSettings spacesServiceSettings = SpacesServiceSettings
            .newBuilder()
            .setCredentialsProvider(FixedCredentialsProvider.create(credentials.get()))
            .build();

        try (SpacesServiceClient spacesServiceClient =
            SpacesServiceClient.create(spacesServiceSettings)) {
          // Call Meet API to create the new space with the user's OAuth2 credentials.
          CreateSpaceRequest request = CreateSpaceRequest.newBuilder()
              .setSpace(Space.newBuilder().build())
              .build();
          Space createdSpace = spacesServiceClient.createSpace(request);

          // Save updated user's credentials to the database so the app can use them to make API calls.
          database.saveUserCredentials(userName, credentials.get());

          // Reply a Chat message with the link
          return createChatTextMessageReponse("New Meet was created: " + createdSpace.getMeetingUri());
        }
      } else if (event.get("chat").has("appCommandPayload")) {
        // Handles command events
        configCompleteRedirectUrl = chatEvent.get("appCommandPayload")
            .get("configCompleteRedirectUri").asText();

        if(logout == chatEvent.get("appCommandPayload")
            .get("appCommandMetadata").get("appCommandId").asInt()) {
          // Delete OAuth2 credentials from storage if any.
          database.deleteUserCredentials(userName);
          // Reply a Chat message with confirmation
          return createChatTextMessageReponse("You are now logged out!");
        }
      }
    } catch (ApiException e) {
      if (e.getStatusCode().getCode().equals(Code.UNAUTHENTICATED)) {
        // This error probably happened because the user revoked the
        // authorization. So, let's request configuration again.
        return getConfigRequest(userName, configCompleteRedirectUrl);
      }
      throw e;
    }
    return createChatTextMessageReponse("This request is not supported.");
  }

  /**
   * Create a response that tells Chat to create a new message with text.
   * 
   * @param text the message text.
   * @return the Chat response.
   */
  private static String createChatTextMessageReponse(String text) {
    JsonObject message = new JsonObject();
    message.addProperty("text", text);
    JsonObject createMessageAction = new JsonObject();
    createMessageAction.add("message", message);
    JsonObject chatDataAction = new JsonObject();
    chatDataAction.add("createMessageAction", createMessageAction);
    JsonObject hostAppDataAction = new JsonObject();
    hostAppDataAction.add("chatDataAction", chatDataAction);
    JsonObject response = new JsonObject();
    response.add("hostAppDataAction", hostAppDataAction);    
    return response.toString();
  }

  /**
   * Create a response that tells Chat to request configuration for the app.
   * The configuration will be tied to the user who sent the event.
   * 
   * @param userName the resource name of the user. 
   * @param configCompleteRedirectUrl the URL to redirect to after
   *     completing the flow.
   * @return the Chat response.
   */
  private String getConfigRequest(
    String userName, String configCompleteRedirectUrl) throws Exception {
    String authUrl = oauth2Flow.getAuthorizationUrl(
        userName,
        configCompleteRedirectUrl);

    JsonObject basicAuthorizationPrompt = new JsonObject();
    basicAuthorizationPrompt.addProperty("authorizationUrl", authUrl);
    basicAuthorizationPrompt.addProperty("resource", name);
    JsonObject actionResponse = new JsonObject();
    actionResponse.add("basicAuthorizationPrompt", basicAuthorizationPrompt);
    return actionResponse.toString();
  }
}
