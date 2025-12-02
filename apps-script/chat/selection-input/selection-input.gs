/**
 * Copyright 2025 Google Inc.
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

// [START selection_input]
/**
* Responds to a Message trigger in Google Chat.
*
* @param {Object} event the event object from Google Chat
* @return {Object} Response from the Chat app.
*/
function onMessage(event) {
  // Replies with a card that contains the multiselect menu.
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    cardsV2: [{
      cardId: "contactSelector",
      card: { sections:[{ widgets: [{
        selectionInput: {
          name: "contacts",
          type: "MULTI_SELECT",
          label: "Selected contacts",
          multiSelectMaxSelectedItems: 3,
          multiSelectMinQueryLength: 1,
          externalDataSource: { function: "queryContacts" },
          // Suggested items loaded by default.
          // The list is static here but it could be dynamic.
          items: [getSuggestedContact("3")]
        }
      }]}]}
    }]
  }}}}};
}

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
