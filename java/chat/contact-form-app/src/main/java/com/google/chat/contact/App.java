/**
 * Copyright 2024 Google LLC
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
package com.google.chat.contact;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.api.client.json.GenericJson;
import com.google.api.services.chat.v1.model.AccessoryWidget;
import com.google.api.services.chat.v1.model.ActionResponse;
import com.google.api.services.chat.v1.model.ActionStatus;
import com.google.api.services.chat.v1.model.CardWithId;
import com.google.api.services.chat.v1.model.Dialog;
import com.google.api.services.chat.v1.model.DialogAction;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Action;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1ActionParameter;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Button;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1ButtonList;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Card;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1CardHeader;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1DateTimePicker;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1OnClick;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Section;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1SelectionInput;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1SelectionItem;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1TextInput;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1TextParagraph;
import com.google.api.services.chat.v1.model.GoogleAppsCardV1Widget;
import com.google.api.services.chat.v1.model.Message;
import com.google.api.services.chat.v1.model.User;

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
    if (!chatEvent.at("/messagePayload").isEmpty()) {
      return handleMessage();
    } else if (!chatEvent.at("/buttonClickedPayload").isEmpty()) {
      return handleButtonClicked(event);
    }
    return null;
  }

  // [START subsequent_steps]
  /**
   * Responds to a message in Google Chat.
   *
   * @return response that handles dialogs.
   */
  GenericJson handleMessage() {
    Message message = new Message()
      .setText("To add a contact, use the `ADD CONTACT` button below.")
      .setAccessoryWidgets(List.of(new AccessoryWidget()
        // [START open_dialog_from_button]
        .setButtonList(new GoogleAppsCardV1ButtonList().setButtons(List.of(new GoogleAppsCardV1Button()
          .setText("ADD CONTACT")
          .setOnClick(new GoogleAppsCardV1OnClick().setAction(new GoogleAppsCardV1Action()
            .setFunction(FUNCTION_URL)
            .setInteraction("OPEN_DIALOG")
            .setParameters(List.of(
              new GoogleAppsCardV1ActionParameter().setKey("actionName").setValue("openInitialDialog"))))))))));
              // [END open_dialog_from_button]
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
   * Responds to a button clicked in Google Chat.
   *
   * @param event The event object from the Google Workspace add-on.
   * @return response depending on the button clicked.
   */
  GenericJson handleButtonClicked(JsonNode event) {
    String actionName = event.at("/commonEventObject/parameters/actionName").asText();
    // Initial dialog form page
    if ("openInitialDialog".equals(actionName)) {
      return openInitialDialog();
    // Confirmation dialog form page
    } else if ("openConfirmationDialog".equals(actionName)) {
      return openConfirmationDialog(event);
    // Submission dialog form page
    } else if ("submitDialog".equals(actionName)) {
      return submitDialog(event);
    }
    return null; 
  }

  // [START open_initial_dialog]
  /**
   * Opens the initial step of the dialog that lets users add contact details.
   *
   * @return {Object} open the dialog.
   */
  GenericJson openInitialDialog() {
    GoogleAppsCardV1Card cardV2 = new GoogleAppsCardV1Card()
      .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(
        new GoogleAppsCardV1Widget().setTextInput(new GoogleAppsCardV1TextInput()
          .setName("contactName")
          .setLabel("First and last name")
          .setType("SINGLE_LINE")),
        new GoogleAppsCardV1Widget().setDateTimePicker(new GoogleAppsCardV1DateTimePicker()
          .setName("contactBirthdate")
          .setLabel("Birthdate")
          .setType("DATE_ONLY")),
        new GoogleAppsCardV1Widget().setSelectionInput(new GoogleAppsCardV1SelectionInput()
          .setName("contactType")
          .setLabel("Contact type")
          .setType("RADIO_BUTTON")
          .setItems(List.of(
            new GoogleAppsCardV1SelectionItem()
              .setText("Work")
              .setValue("Work")
              .setSelected(false),
            new GoogleAppsCardV1SelectionItem()
              .setText("Personal")
              .setValue("Personal")
              .setSelected(false)))),
        new GoogleAppsCardV1Widget().setButtonList(new GoogleAppsCardV1ButtonList().setButtons(List.of(
          new GoogleAppsCardV1Button()
            .setText("NEXT")
            .setOnClick(new GoogleAppsCardV1OnClick().setAction(new GoogleAppsCardV1Action()
              .setFunction(FUNCTION_URL)
              .setParameters(List.of(
                new GoogleAppsCardV1ActionParameter().setKey("actionName").setValue("openConfirmationDialog"))))))))))));
    return new GenericJson() {{
      put("action", new GenericJson() {{
        put("navigations", List.of(new GenericJson() {{
          put("pushCard", cardV2);
        }}));
      }});
    }};
  }
  // [END open_initial_dialog]

  /**
   * Opens the second step of the dialog that lets users confirm details.
   *
   * @param event The event object from the Google Workspace add-on.
   * @return update the dialog.
   */
  GenericJson openConfirmationDialog(JsonNode event) {
    // Retrieve the form input values
    String name = event.at("/commonEventObject/formInputs/contactName/stringInputs/value").get(0).asText();
    String birthdateEpoch = event.at("/commonEventObject/formInputs/contactBirthdate/dateInput/msSinceEpoch").asText();
    String birthdate = new SimpleDateFormat("MM/dd/yyyy").format(new Date((long)Double.parseDouble(birthdateEpoch)));
    String type = event.at("/commonEventObject/formInputs/contactType/stringInputs/value").get(0).asText();
    // Display the input values for confirmation
    GoogleAppsCardV1Card cardV2 = new GoogleAppsCardV1Card()
      .setSections(List.of(new GoogleAppsCardV1Section().setWidgets(List.of(
        new GoogleAppsCardV1Widget().setTextParagraph(new GoogleAppsCardV1TextParagraph()
          .setText("Confirm contact information and submit:")),
        new GoogleAppsCardV1Widget().setTextParagraph(new GoogleAppsCardV1TextParagraph()
          .setText("<b>Name:</b> " + name)),
        new GoogleAppsCardV1Widget().setTextParagraph(new GoogleAppsCardV1TextParagraph()
          .setText("<b>Birthday:</b> " + birthdate)),
        new GoogleAppsCardV1Widget().setTextParagraph(new GoogleAppsCardV1TextParagraph()
          .setText("<b>Type:</b> " + type)),
        // [START set_parameters]
        new GoogleAppsCardV1Widget().setButtonList(new GoogleAppsCardV1ButtonList().setButtons(List.of(
          new GoogleAppsCardV1Button()
            .setText("SUBMIT")
            .setOnClick(new GoogleAppsCardV1OnClick().setAction(new GoogleAppsCardV1Action()
              .setFunction(FUNCTION_URL)
              .setParameters(List.of(
                new GoogleAppsCardV1ActionParameter().setKey("actionName").setValue("submitDialog"),
                // Pass input values as parameters for last dialog step (submission)
                new GoogleAppsCardV1ActionParameter().setKey("contactName").setValue(name),
                new GoogleAppsCardV1ActionParameter().setKey("contactBirthdate").setValue(birthdate),
                new GoogleAppsCardV1ActionParameter().setKey("contactType").setValue(type))))))))))));
              // [END set_parameters]
    return new GenericJson() {{
      put("action", new GenericJson() {{
        put("navigations", List.of(new GenericJson() {{
          put("pushCard", cardV2);
        }}));
      }});
    }};
  }
  // [END subsequent_steps]

  /**
   * Handles submission and closes the dialog.
   *
   * @param event The event object from the Google Workspace add-on.
   * @return close the dialog with a status in text notification or message.
   */
  GenericJson submitDialog(JsonNode event) {
    // [START status_notification]
    // Validate the parameters.
    if (event.at("/commonEventObject/parameters/contactName").asText().isEmpty()) {
      return new GenericJson() {{
        put("action", new GenericJson() {{
          put("navigations", List.of(new GenericJson() {{
            put("endNavigation", new GenericJson() {{
              put("action", "CLOSE_DIALOG");
            }});
          }}));
          put("notification", new GenericJson() {{
            put("text", "Failure, the contact name was missing!");
          }});
        }});
      }};
    }

    // [START status_message]
    return new GenericJson() {{
      put("hostAppDataAction", new GenericJson() {{
        put("chatDataAction", new GenericJson() {{
          put("createMessageAction", new GenericJson() {{
            put("message", new Message()
              .setText( "✅ " + event.at("/commonEventObject/parameters/contactName").asText() +
                        " has been added to your contacts."));
          }});
        }});
      }});
    }};
    // [END status_message]
  }
}
