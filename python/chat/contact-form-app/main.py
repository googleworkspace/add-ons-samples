# Copyright 2024 Google LLC
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
Google Chat app with dialog card interactions in Python App Engine
"""

from typing import Any, Mapping
from datetime import datetime
from flask import Flask, request, json

app = Flask(__name__)

FUNCTION_URL = "your-function-url"

@app.route('/', methods=['POST'])
def post() -> Mapping[str, Any]:
  """Handle requests from Google Chat

  Returns:
      Mapping[str, Any]: the response
  """
  # Stores the Google Chat event
  chat_event = request.get_json().get('chat')

  # Handle user interaction with multiselect.
  if chat_event.get('messagePayload') is not None:
    return json.jsonify(handle_message())
  elif chat_event.get('buttonClickedPayload') is not None:
    return json.jsonify(handle_button_clicked(request.get_json()))


# [START subsequent_steps]
def handle_message() -> Mapping[str, Any]:
  """Responds to a message in Google Chat.

  Returns:
    Mapping[str, Any]: the response that handles dialogs.
  """
  return { 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': { 'message': {
    'text': "To add a contact, use the `ADD CONTACT` button below.",
    'accessoryWidgets': [
      # [START open_dialog_from_button]
      { 'buttonList': { 'buttons': [{
        'text': "ADD CONTACT",
        'onClick': { 'action': {
          'function': FUNCTION_URL,
          'interaction': "OPEN_DIALOG",
          'parameters': [
            { 'key': "actionName", 'value': "openInitialDialog" }
          ]
        }}
      }]}}
      # [END open_dialog_from_button]
    ]
  }}}}}


def handle_button_clicked(event: Mapping[str, Any]) -> Mapping[str, Any]:
  """Responds to a button clicked in Google Chat.

  Args:
    Mapping[str, Any] event: the event object from the Google Workspace add-on

  Returns:
    Mapping[str, Any]: the response depending on the button clicked.
  """
  # Initial dialog form page
  if "openInitialDialog" == event['commonEventObject']['parameters']['actionName']:
    return open_initial_dialog()
  # Confirmation dialog form page
  elif "openConfirmationDialog" == event['commonEventObject']['parameters']['actionName'] :
    return open_confirmation_dialog(event)
  # Submission dialog form page
  elif "submitDialog" == event['commonEventObject']['parameters']['actionName']:
    return submit_dialog(event)


# [START open_initial_dialog]
def open_initial_dialog() -> Mapping[str, Any]:
  """Opens the initial step of the dialog that lets users add contact details.
  
  Returns:
    Mapping[str, Any]: open the dialog.
  """
  return { 'action': { 'navigations': [{ 'pushCard': { 'sections': [{ 'widgets': [
    { 'textInput': {
      'name': "contactName",
      'label': "First and last name",
      'type': "SINGLE_LINE"
    }},
    { 'dateTimePicker': {
      'name': "contactBirthdate",
      'label': "Birthdate",
      'type': "DATE_ONLY"
    }},
    { 'selectionInput': {
      'name': "contactType",
      'label': "Contact type",
      'type': "RADIO_BUTTON",
      'items': [
        { 'text': "Work", 'value': "Work", 'selected': False },
        { 'text': "Personal", 'value': "Personal", 'selected': False }
      ]
    }},
    { 'buttonList': { 'buttons': [{
      'text': "NEXT",
      'onClick': { 'action': {
        'function': FUNCTION_URL,
        'parameters': [
          { 'key': "actionName", 'value': "openConfirmationDialog" }
        ]
      }}
    }]}}
  ]}]}}]}}
  # [END open_initial_dialog]


def open_confirmation_dialog(event: Mapping[str, Any]) -> Mapping[str, Any]:
  """Opens the second step of the dialog that lets users confirm details.

  Args:
    Mapping[str, Any] event: the event object from the Google Workspace add-on

  Returns:
    Mapping[str, Any]: update the dialog.
  """
  name = event.get('commonEventObject').get('formInputs')["contactName"].get('stringInputs').get('value')[0]
  birthdateEpoch = event.get('commonEventObject').get('formInputs')["contactBirthdate"].get('dateInput').get('msSinceEpoch')
  birthdate = datetime.fromtimestamp(int(birthdateEpoch) / 1000.0).strftime("%Y-%m-%d")
  type = event.get('commonEventObject').get('formInputs')["contactType"].get('stringInputs').get('value')[0]
  # Display the input values for confirmation
  return { 'action': { 'navigations': [{ 'pushCard': { 'sections': [{ 'widgets': [
    { 'textParagraph': { 'text': "Confirm contact information and submit:" }},
    { 'textParagraph': { 'text': "<b>Name:</b> " + name }},
    { 'textParagraph': { 'text': "<b>Birthday:</b> " + birthdate }},
    { 'textParagraph': { 'text': "<b>Type:</b> " + type }},
    # [START set_parameters]
    { 'buttonList': { 'buttons': [{
      'text': "SUBMIT",
      'onClick': { 'action': {
        'function': FUNCTION_URL,
        'parameters': [
          { 'key': "actionName", 'value': "submitDialog" },
          # Pass input values as parameters for last dialog step (submission)
          { 'key': "contactName", 'value': name },
          { 'key': "contactBirthdate", 'value': birthdate },
          { 'key': "contactType", 'value': type }
        ]
      }}
    }]}}
    # [END set_parameters]
  ]}]}}]}}
  # [END subsequent_steps]


def submit_dialog(event: Mapping[str, Any]) -> Mapping[str, Any]:
  """Handles submission and closes the dialog.

  Args:
    Mapping[str, Any] event: the event object from the Google Workspace add-on

  Returns:
    Mapping[str, Any]: close the dialog with a status in text notification or message.
  """
  # [START status_notification]
  # Validate the parameters.
  if event.get('commonEventObject').get('parameters')["contactName"] == "":
    return { 'action': {
      'navigations': [{ 'endNavigation': { 'action': "CLOSE_DIALOG"}}],
      'notification': { 'text': "Failure, the contact name was missing!" }
    }}
    # [END status_notification]

  # [START status_message]
  return { 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': { 'message': {
    'text': "✅ " + event.get('commonEventObject').get('parameters')["contactName"] + " has been added to your contacts."
  }}}}}
  # [END status_message]


if __name__ == '__main__':
  # This is used when running locally. Gunicorn is used to run the
  # application on Google App Engine. See entrypoint in app.yaml.
  app.run(host='127.0.0.1', port=8080, debug=True)
