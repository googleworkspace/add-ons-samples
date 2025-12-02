# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Google Chat app with a selection input
"""

from typing import Any, Mapping
from flask import Flask, request, json

app = Flask(__name__)

FUNCTION_URL = "your-function-url"

# [START selection_input]
@app.route('/', methods=['POST'])
def post() -> Mapping[str, Any]:
  """Handle requests from Google Chat

  Returns:
      Mapping[str, Any]: The response
  """
  # Stores the Google Chat event
  chatEvent = request.get_json().get('chat')

  # Handle user interaction with multiselect.
  if chatEvent.get('widgetUpdatedPayload') is not None:
    return json.jsonify(query_contacts(request.get_json()))

  # Replies with a card that contains the multiselect menu.
  return json.jsonify({ 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': {
    'message': { 'cardsV2': [{
      'cardId': "contactSelector",
      'card': { 'sections':[{ 'widgets': [{
        'selectionInput': {
          'name': "contacts",
          'type': "MULTI_SELECT",
          'label': "Selected contacts",
          'multiSelectMaxSelectedItems': 3,
          'multiSelectMinQueryLength': 1,
          'externalDataSource': { 'function': FUNCTION_URL },
          # Suggested items loaded by default.
          # The list is static here but it could be dynamic.
          'items': [get_suggested_contact("3")]
        }
      }]}]}
    }]}
  }}}})


def query_contacts(event: dict) -> dict:
  """Get contact suggestions based on text typed by users.
  
  Args:
      event (Mapping[str, Any]): The event object that contains the user's query
  
  Returns:
      Mapping[str, Any]: The response with contact suggestions.
  """
  query = event.get("commonEventObject").get("parameters").get("autocomplete_widget_query")
  return { 'action': { 'modifyOperations': [{ 'updateWidget': { 'selectionInputWidgetSuggestions': { 'suggestions': list(
    filter(lambda e: query is None or query in e["text"], [
      # The list is static here but it could be dynamic.
      get_suggested_contact("1"), get_suggested_contact("2"), get_suggested_contact("3"), get_suggested_contact("4"), get_suggested_contact("5")
    # Only return items based on the query from the user
    ])
  )}}}]}}


def get_suggested_contact(id: str) -> dict:
  """Generate a suggested contact given an ID.
  
  Args:
      id (str): The ID of the contact to return.

  Returns:
      Mapping[str, Any]: The contact formatted as a selection item in the menu.
  """
  return {
    'value': id,
    'startIconUri': "https://www.gstatic.com/images/branding/product/2x/contacts_48dp.png",
    'text': "Contact " + id
  }
  # [END selection_input]


if __name__ == '__main__':
  # This is used when running locally. Gunicorn is used to run the
  # application on Google App Engine. See entrypoint in app.yaml.
  app.run(host='127.0.0.1', port=8080, debug=True)
