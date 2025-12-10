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

// [START subsequent_steps]
/**
 * Responds to a message in Google Chat.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} response that handles dialogs.
 */
function onMessage(event) {
  // Reply with a message that contains a button to open the initial dialog
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: "To add a contact, use the `ADD CONTACT` button below.",
    accessoryWidgets: [
      // [START open_dialog_from_button]
      { buttonList: { buttons: [{
        text: "ADD CONTACT",
        onClick: { action: {
          function: "openInitialDialog",
          interaction: "OPEN_DIALOG"
        }}
      }]}}
      // [END open_dialog_from_button]
    ]
  }}}}};
}

// [START open_initial_dialog]
/**
 * Opens the initial step of the dialog that lets users add contact details.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} open the dialog.
 */
function openInitialDialog(event) {
  return { action: { navigations: [{ pushCard: { sections: [{ widgets: [
    { textInput: {
      name: "contactName",
      label: "First and last name",
      type: "SINGLE_LINE"
    }},
    { dateTimePicker: {
      name: "contactBirthdate",
      label: "Birthdate",
      type: "DATE_ONLY"
    }},
    { selectionInput: {
      name: "contactType",
      label: "Contact type",
      type: "RADIO_BUTTON",
      items: [
        { text: "Work", value: "Work", selected: false },
        { text: "Personal", value: "Personal", selected: false }
      ]
    }},
    { buttonList: { buttons: [{
      text: "NEXT",
      onClick: { action: { function : "openConfirmationDialog" }}
    }]}}
  ]}]}}]}};
}
// [END open_initial_dialog]

/**
 * Opens the second step of the dialog that lets users confirm details.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} update the dialog.
 */
function openConfirmationDialog(event) {
  // Retrieve the form input values
  const name = event.commonEventObject.formInputs["contactName"].stringInputs.value[0];
  const birthdate = event.commonEventObject.formInputs["contactBirthdate"].dateInput.msSinceEpoch;
  const type = event.commonEventObject.formInputs["contactType"].stringInputs.value[0];
  // Display the input values for confirmation
  return { action: { navigations: [{ pushCard: { sections: [{ widgets: [
    { textParagraph: { text: "Confirm contact information and submit:" }},
    { textParagraph: { text: "<b>Name:</b> " + name }},
    { textParagraph: { text: "<b>Birthday:</b> " + new Date(birthdate) }},
    { textParagraph: { text: "<b>Type:</b> " + type }},
    // [START set_parameters]
    { buttonList: { buttons: [{
      text: "SUBMIT",
      onClick: { action: {
        function: "submitDialog",
        // Pass input values as parameters for last dialog step (submission)
        parameters: [
          { key: "contactName", value: name },
          { key: "contactBirthdate", value: birthdate },
          { key: "contactType", value: type }
        ]
      }}
    }]}}
    // [END set_parameters]
  ]}]}}]}};
}
// [END subsequent_steps]

/**
 * Handles submission and closes the dialog.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} close the dialog with a status in text notification or message.
 */
function submitDialog(event) {
  // [START status_notification]
  // Validate the parameters.
  if (!event.commonEventObject.parameters["contactName"]) {
    return { action: {
      navigations: [{ endNavigation: { action: "CLOSE_DIALOG"}}],
      notification: { text: "Failure, the contact name was missing!" }
    }};
  }
  // [END status_notification]

  // [START status_message]
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: "✅ " + event.commonEventObject.parameters["contactName"] + " has been added to your contacts."
  }}}}};
  // [END status_message]
}
