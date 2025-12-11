/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Gets the open / update dialog response for the input form.
 * 
 * @return {Object} Response from the Chat app.
 */
function getInputFormAsDialog_(options) {
  const form = getForm_(options);
  return { action: { navigations: [{
    pushCard: form
  }]}};
}

/**
 * Generates the meeting scheduling form as JSON based on given options.
 * 
 * @return {Object} JSON-formatted card.
 */
function getForm_(options) {
  const sections = [];

  // If errors present, display additional section with validation messages.
  if (options.errors?.length) {
    let errors = options.errors.reduce((str, err) => `${str}• ${err}<br>`, "");
    errors = `<font color="#ba0000"><b>Errors:</b><br>${errors}</font>`;
    sections.push({ widgets: [{
      textParagraph: { text: errors }
    }]});
  }
  // Main form section.
  sections.push({
    header: "Schedule meeting and send email to invited participants",
    widgets: [
      { textInput: {
        label: "Event Title",
        type: "SINGLE_LINE",
        name: "subject",
        value: options.subject,
      }},
      { textInput: {
        label: "Invitee Email Address",
        type: "SINGLE_LINE",
        name: "email",
        value: options.invitee,
        hintText: "Add team group email",
      }},
      { textInput: {
        label: "Description",
        type: "MULTIPLE_LINE",
        name: "body",
        value: options.body,
      }},
      { textInput: {
        label: "Meeting start date & time",
        type: "SINGLE_LINE",
        name: "date",
        value: options.startTime,
        hintText: "mm/dd/yyyy H:MM",
      }},
      { selectionInput: {
        type: "DROPDOWN",
        label: "Meeting Duration",
        name: "duration",
        items: [
          { text: "15 minutes", value: "15", selected: options.duration === 15 },
          { text: "30 minutes", value: "30", selected: options.duration === 30 },
          { text: "45 minutes", value: "45", selected: options.duration === 45 },
          { text: "1 Hour", value: "60", selected: options.duration === 60 },
          { text: "1.5 Hours", value: "90", selected: options.duration === 90 },
          { text: "2 Hours", value: "120", selected: options.duration === 120 },
        ]
      }}
    ],
    collapsible: false,
  });
  // Build the card with sections.
  return {
    sections: sections,
    name: "Google Chat Scheduled Meeting",
    fixedFooter: { primaryButton: {
      text: "Submit",
      onClick: { action: { function: "handleFormSubmit" }},
      altText: "Submit"
    }}
  };
}

/**
 * Gets the open / update dialog response for the confirmation form.
 * 
 * @param {string} url The Google Calendar Event url.
 * @return {Object} Response from the Chat app.
 */
function getConfirmationDialog_(url) {
  return { action: { navigations: [{ pushCard: {
    sections: [{ widgets: [
      { textParagraph: {
          text: "Meeting created successfully!",
        },
        horizontalAlignment: "CENTER",
      },
      { buttonList: { buttons: [{
          text: "Open Calendar Event",
          onClick: { openLink: { url: url }}
        }]},
        horizontalAlignment: "CENTER",
      }
    ]}],
    fixedFooter: { primaryButton: {
      text: "OK",
      onClick: { action: { function: "closeDialog" }}
    }}
  }}]}};
}
