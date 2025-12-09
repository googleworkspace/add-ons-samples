/**
 * Copyright 2025 Google LLC
 *
 * <p>Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 * <p>http://www.apache.org/licenses/LICENSE-2.0
 *
 * <p>Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.google.chat.previewLink;

import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.api.client.json.GenericJson;
import com.google.api.services.chat.v1.model.CardWithId;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Action;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Button;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1ButtonList;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Card;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1CardHeader;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1DecoratedText;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1OnClick;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1OpenLink;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Section;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Widget;
import com.google.api.services.chat.v1.model.Message;

@SpringBootApplication
@RestController
// Web app that responds to events sent from a Google Chat space.
public class App {
  private static final String FUNCTION_URL = "your-function-url";

  public static void main(String[] args) {
    SpringApplication.run(App.class, args);
  }

  /**
   * Handle requests from Google Chat
   * 
   * @param event the event object sent by Google Chat
   * @return The response to be sent back to Google Chat
   */
  @PostMapping("/")
  @ResponseBody
  public GenericJson onEvent(@RequestBody JsonNode event) throws Exception {
    // Stores the Google Chat event
    JsonNode chatEvent = event.at("/chat");
    
    // Handle message events
    if(!chatEvent.at("/messagePayload").isEmpty()) {
      return handlePreviewLink(chatEvent.at("/messagePayload/message"));
    // Handle button clicks
    } else if(!chatEvent.at("/buttonClickedPayload").isEmpty()) {
      return handleCardClick(chatEvent.at("/buttonClickedPayload/message"));
    }
    return new GenericJson();
  }

  /**
   * Handle messages that have links whose URLs match patterns configured
   * for link previewing.
   * 
   * - Reply with text messages that echo "text.example.com" link URLs in messages.
   * - Attach cards to messages with "support.example.com" link URLs.
   *
   * @param chatMessage The chat message object from Google Workspace Add On event.
   * @return The response to send back depending on the matched URL.
   */
  GenericJson handlePreviewLink(JsonNode chatMessage) {
    // If the Chat app does not detect a link preview URL pattern, reply
    // with a text message that says so.
    if (chatMessage.at("/matchedUrl").isEmpty()) {
      return new GenericJson() {{
        put("hostAppDataAction", new GenericJson() {{
          put("chatDataAction", new GenericJson() {{
            put("createMessageAction", new GenericJson() {{
              put("message", new Message()
                .setText("No matchedUrl detected."));
            }});
          }});
        }});
      }};
    }

    // [START preview_links_text]
    // Reply with a text message for URLs of the subdomain "text"
    if (chatMessage.at("/matchedUrl/url").asText().contains("text.example.com")) {
      return new GenericJson() {{
        put("hostAppDataAction", new GenericJson() {{
          put("chatDataAction", new GenericJson() {{
            put("createMessageAction", new GenericJson() {{
              put("message", new Message()
                .setText("event.chat.messagePayload.message.matchedUrl.url: " + chatMessage.at("/matchedUrl/url").asText()));
            }});
          }});
        }});
      }};
    }
    // [END preview_links_text]

    // [START preview_links_card]
    // Attach a card to the message for URLs of the subdomain "support"
    if (chatMessage.at("/matchedUrl/url").asText().contains("support.example.com")) {
      // A hard-coded card is used in this example. In a real-life scenario,
      // the case information would be fetched and used to build the card.
      CardWithId cardV2 = new CardWithId()
        .setCardId("attachCard")
        .setCard(new GoogleAppsCardV1Card()
          .setHeader(new GoogleAppsCardV1CardHeader()
            .setTitle("Example Customer Service Case")
            .setSubtitle("Case basics"))
          .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(
            new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
              .setTopLabel("Case ID")
              .setText("case123")),
            new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
              .setTopLabel("Assignee")
              .setText("Charlie")),
            new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
              .setTopLabel("Status")
              .setText("Open")),
            new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
              .setTopLabel("Subject")
              .setText("It won't turn on...")),
            new GoogleAppsCardV1Widget().setButtonList(new GoogleAppsCardV1ButtonList()
              .setButtons(List.of(
                new GoogleAppsCardV1Button()
                  .setText("OPEN CASE")
                .setOnClick(new GoogleAppsCardV1OnClick()
                    .setOpenLink(new GoogleAppsCardV1OpenLink()
                      .setUrl("https://support.example.com/orders/case123"))),
                new GoogleAppsCardV1Button()
                  .setText("RESOLVE CASE")
                .setOnClick(new GoogleAppsCardV1OnClick()
                    .setOpenLink(new GoogleAppsCardV1OpenLink()
                      .setUrl("https://support.example.com/orders/case123?resolved=y"))),
                new GoogleAppsCardV1Button()
                  .setText("ASSIGN TO ME")
                  .setOnClick(new GoogleAppsCardV1OnClick()
                    .setAction(new GoogleAppsCardV1Action().setFunction(FUNCTION_URL)))
              ))
            )
          ))))
        );

      return new GenericJson() {{
        put("hostAppDataAction", new GenericJson() {{
          put("chatDataAction", new GenericJson() {{
            put("updateInlinePreviewAction", new GenericJson() {{
              put("cardsV2", List.of(cardV2));
            }});
          }});
        }});
      }};
    }
    // [END preview_links_card]
    return new GenericJson();
  }

  // [START preview_links_assign]
  /**
   * Respond to clicks by assigning and updating the card that's attached to a
   * message previewed link of the pattern "support.example.com".
   *
   * @param chatMessage The chat message object from Google Workspace Add On event.
   * @return Action response depending on the message author.
   */
  GenericJson handleCardClick(JsonNode chatMessage) {
    // Creates the updated card that displays "You" for the assignee
    // and that disables the button.
    //
    // A hard-coded card is used in this example. In a real-life scenario,
    // an actual assign action would be performed before building the card.
    Message message = new Message().setCardsV2(List.of(new CardWithId()
      .setCardId("attachCard")
      .setCard(new GoogleAppsCardV1Card()
        .setHeader(new GoogleAppsCardV1CardHeader()
          .setTitle("Example Customer Service Case")
          .setSubtitle("Case basics"))
        .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(
          new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
            .setTopLabel("Case ID")
            .setText("case123")),
          // The assignee is now "You"
          new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
            .setTopLabel("Assignee")
            .setText("You")),
          new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
            .setTopLabel("Status")
            .setText("Open")),
          new GoogleAppsCardV1Widget().setDecoratedText(new GoogleAppsCardV1DecoratedText()
            .setTopLabel("Subject")
            .setText("It won't turn on...")),
          new GoogleAppsCardV1Widget().setButtonList(new GoogleAppsCardV1ButtonList()
            .setButtons(List.of(
              new GoogleAppsCardV1Button()
                .setText("OPEN CASE")
                .setOnClick(new GoogleAppsCardV1OnClick()
                  .setOpenLink(new GoogleAppsCardV1OpenLink()
                    .setUrl("https://support.example.com/orders/case123"))),
              new GoogleAppsCardV1Button()
                .setText("RESOLVE CASE")
                .setOnClick(new GoogleAppsCardV1OnClick()
                  .setOpenLink(new GoogleAppsCardV1OpenLink()
                    .setUrl("https://support.example.com/orders/case123?resolved=y"))),
              new GoogleAppsCardV1Button()
                .setText("ASSIGN TO ME")
                // The button is now disabled
                .setDisabled(true)
                .setOnClick(new GoogleAppsCardV1OnClick()
                  .setAction(new GoogleAppsCardV1Action().setFunction(FUNCTION_URL)))
            ))
          )
        ))))
      )
    ));

    // Use the adequate action response type. It depends on whether the message
    // the preview link card is attached to was created by a human or a Chat app.
    if("HUMAN".equals(chatMessage.at("/sender/type").asText())) {
      return new GenericJson() {{
        put("hostAppDataAction", new GenericJson() {{
          put("chatDataAction", new GenericJson() {{
            put("updateInlinePreviewAction", message);
          }});
        }});
      }};
    } else {
      return new GenericJson() {{
        put("hostAppDataAction", new GenericJson() {{
          put("chatDataAction", new GenericJson() {{
            put("updateMessageAction", message);
          }});
        }});
      }};
    }
  }
  // [END preview_links_assign]
}
