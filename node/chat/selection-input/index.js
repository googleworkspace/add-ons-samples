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

const express = require('express');

const app = express()
  .use(express.urlencoded({extended: false}))
  .use(express.json());

const FUNCTION_URL = "your-function-url";

// [START selection_input]
/**
 * Web app that responds to events sent from a Google Chat space.
 *
 * @param {Object} req Request sent from Google Chat space
 * @param {Object} res Response to send back
 */
app.post('/', async (req, res) => {
  // Stores the Google Chat event
  const chatEvent = req.body.chat;

  // Handle user interaction with multiselect.
  if(chatEvent.widgetUpdatedPayload) {
    return res.json(queryContacts(req.body));
  }

  // Replies with a card that contains the multiselect menu.
  return res.json({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    cardsV2: [{
      cardId: "contactSelector",
      card: { sections:[{ widgets: [{
        selectionInput: {
          name: "contacts",
          type: "MULTI_SELECT",
          label: "Selected contacts",
          multiSelectMaxSelectedItems: 3,
          multiSelectMinQueryLength: 1,
          externalDataSource: { function: FUNCTION_URL },
          // Suggested items loaded by default.
          // The list is static here but it could be dynamic.
          items: [getSuggestedContact("3")]
        }
      }]}]}
    }]
  }}}}});
});

/**
 * Get contact suggestions based on text typed by users.
 *
 * @param {Object} event the event object that contains the user's query
 * @return {Object} suggestions
 */
function queryContacts(event) {
  const query = event.commonEventObject.parameters["autocomplete_widget_query"];
  return { action: { modifyOperations: [{ updateWidget: { selectionInputWidgetSuggestions: { suggestions: [
    // The list is static here but it could be dynamic.
    getSuggestedContact("1"), getSuggestedContact("2"), getSuggestedContact("3"), getSuggestedContact("4"), getSuggestedContact("5")
  // Only return items based on the query from the user.
  ].filter(e => !query || e.text.includes(query)) }}}]}};
}

/**
 * Generate a suggested contact given an ID.
 *
 * @param {String} id The ID of the contact to return.
 * @return {Object} The contact formatted as a selection item in the menu.
 */
function getSuggestedContact(id) {
  return {
    value: id,
    startIconUri: "https://www.gstatic.com/images/branding/product/2x/contacts_48dp.png",
    text: "Contact " + id
  };
}
// [END selection_input]

// Start listening for requests.
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running in port - ${PORT}`);
});
