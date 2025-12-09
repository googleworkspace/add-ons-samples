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
// [START chat_avatar_app]
package com.google.chat.avatar;

import com.google.api.services.chat.v1.model.CardWithId;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Card;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1CardHeader;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Image;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Section;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1TextParagraph;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Widget;
import com.google.api.services.chat.v1.model.Message;
import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.util.List;

public class App implements HttpFunction {
  // [START chat_avatar_app_slash_command]
  // The ID of the slash command "/about".
  // You must use the same ID in the Google Chat API configuration.
  private static final int ABOUT_COMMAND_ID = 1;

  private static final Gson gson = new Gson();

  /**
   * Handle requests from Google Workspace add on
   * 
   * @param request the request sent by Google Chat
   * @param response the response to be sent back to Google Chat
   */
  @Override
  public void service(HttpRequest request, HttpResponse response) throws Exception {
    JsonObject event = gson.fromJson(request.getReader(), JsonObject.class);
    JsonObject chatEvent = event.getAsJsonObject("chat");
    Message message;
    if (chatEvent.has("appCommandPayload")) {
      message = handleAppCommand(chatEvent);
    } else {
      message = handleMessage(chatEvent);
    }
    JsonObject createMessageAction = new JsonObject();
    createMessageAction.add("message", gson.fromJson(gson.toJson(message), JsonObject.class));
    JsonObject chatDataAction = new JsonObject();
    chatDataAction.add("createMessageAction", createMessageAction);
    JsonObject hostAppDataAction = new JsonObject();
    hostAppDataAction.add("chatDataAction", chatDataAction);
    JsonObject dataActions = new JsonObject();
    dataActions.add("hostAppDataAction", hostAppDataAction);
    response.getWriter().write(gson.toJson(dataActions));
  }

  /**
   * Handles an APP_COMMAND event in Google Chat.
   *
   * @param event the event object from Google Chat
   * @return the response message object.
   */
  private Message handleAppCommand(JsonObject event) throws Exception {
    switch (event.getAsJsonObject("appCommandPayload")
      .getAsJsonObject("appCommandMetadata").get("appCommandId").getAsInt()) {
      case ABOUT_COMMAND_ID:
        return new Message()
          .setText("The Avatar app replies to Google Chat messages.");
      default:
        return null;
    }
  }
  // [END chat_avatar_app_slash_command]

  /**
   * Handles a MESSAGE event in Google Chat.
   *
   * @param event the event object from Google Chat
   * @return the response message object.
   */
  private Message handleMessage(JsonObject event) throws Exception {
    // Stores the Google Chat user as a variable.
    JsonObject chatUser = event.getAsJsonObject("messagePayload").getAsJsonObject("message").getAsJsonObject("sender");
    String displayName = chatUser.has("displayName") ? chatUser.get("displayName").getAsString() : "";
    String avatarUrl = chatUser.has("avatarUrl") ? chatUser.get("avatarUrl").getAsString() : "";
    return new Message()
      .setText("Here's your avatar")
      .setCardsV2(List.of(new CardWithId()
        .setCardId("avatarCard")
        .setCard(new GoogleAppsCardV1Card()
          .setName("Avatar Card")
          .setHeader(new GoogleAppsCardV1CardHeader()
            .setTitle(String.format("Hello %s!", displayName)))
          .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(
            new GoogleAppsCardV1Widget().setTextParagraph(new GoogleAppsCardV1TextParagraph()
              .setText("Your avatar picture:")),
            new GoogleAppsCardV1Widget()
              .setImage(new GoogleAppsCardV1Image().setImageUrl(avatarUrl)))))))));
  }
}
// [END chat_avatar_app]
