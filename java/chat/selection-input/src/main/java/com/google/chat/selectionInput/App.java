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
package com.google.chat.selectionInput;
    
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
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Card;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Section;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1SelectionInput;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1SelectionItem;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Widget;
import com.google.api.services.chat.v1.model.Message;

// [START selection_input]
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
    
    // Handle user interaction with multiselect.
    if (!chatEvent.at("/widgetUpdatedPayload").isEmpty()) {
      return queryContacts(event);
    }

    // Replies with a card that contains the multiselect menu.
    Message message = new Message().setCardsV2(List.of(new CardWithId()
      .setCardId("contactSelector")
      .setCard(new GoogleAppsCardV1Card()
        .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(new GoogleAppsCardV1Widget()
          // [START selection_input_init]
          .setSelectionInput(new GoogleAppsCardV1SelectionInput()
            .setName("contacts")
            .setType("MULTI_SELECT")
            .setLabel("Selected contacts")
            .setMultiSelectMaxSelectedItems(3)
            .setMultiSelectMinQueryLength(1)
            .setExternalDataSource(new GoogleAppsCardV1Action().setFunction(FUNCTION_URL))
            // Suggested items loaded by default.
            // The list is static here but it could be dynamic.
            .setItems(List.of(getSuggestedContact("3")))))))))));
            // [END selection_input_init]
          
    return new GenericJson() {{
      put("hostAppDataAction", new GenericJson() {{
        put("chatDataAction", new GenericJson() {{
          put("createMessageAction", new GenericJson() {{
            put("message", message);
          }});
        }});
      }});
    }};
  }

  /**
   * Get contact suggestions based on text typed by users.
   *
   * @param event the event object that contains the user's query.
   * @return The response with contact suggestions.
   */
  GenericJson queryContacts(JsonNode event) throws Exception {
    String query = event.at("/commonEventObject/parameters/autocomplete_widget_query").asText();
    List<GoogleAppsCardV1SelectionItem> suggestions = List.of(
      // The list is static here but it could be dynamic.
      getSuggestedContact("1"), getSuggestedContact("2"), getSuggestedContact("3"), getSuggestedContact("4"), getSuggestedContact("5")
    // Only return items based on the query from the user
    ).stream().filter(e -> query == null || e.getText().indexOf(query) > -1).toList();

    return new GenericJson() {{
      put("action", new GenericJson() {{
        put("modifyOperations", List.of(new GenericJson() {{
          put("updateWidget", new GenericJson() {{
            put("selectionInputWidgetSuggestions", new GenericJson() {{
              put("suggestions", suggestions);
            }});
          }});
        }}));
      }});
    }};
  }

  /**
   * Generate a suggested contact given an ID.
   * 
   * @param id The ID of the contact to return.
   * @return The contact formatted as a selection item in the menu.
   */
  GoogleAppsCardV1SelectionItem getSuggestedContact(String id) {
    return new GoogleAppsCardV1SelectionItem()
      .setValue(id)
      .setStartIconUri("https://www.gstatic.com/images/branding/product/2x/contacts_48dp.png")
      .setText("Contact " + id);
  }
}
// [END selection_input]
