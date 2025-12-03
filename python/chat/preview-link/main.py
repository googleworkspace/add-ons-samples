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
Google Chat app with a preview link
"""

from typing import Any, Mapping
from flask import Flask, request, json

app = Flask(__name__)

FUNCTION_URL = "your-function-url"

@app.route('/', methods=['POST'])
def post() -> Mapping[str, Any]:
  """Handle requests from Google Chat

  Returns:
      Mapping[str, Any]: The response
  """
  # Stores the Google Chat event as a variable.
  chatEvent = request.get_json().get('chat')

  # Handle user interaction with multiselect.
  if chatEvent.get('messagePayload') is not None:
    return json.jsonify(handle_preview_link(chatEvent.get("messagePayload").get("message")))
  elif chatEvent.get('buttonClickedPayload') is not None:
    return json.jsonify(handle_card_click(chatEvent.get("buttonClickedPayload").get("message")))


def handle_preview_link(chatMessage: dict) -> dict:
  """Handle messages that have links whose URLs match patterns configured for link previewing.
  
  - Reply with text messages that echo "text.example.com" link URLs in messages.
  - Attach cards to messages with "support.example.com" link URLs.

  Args:
      chatMessage (Mapping[str, Any]): The chat message object from Google Workspace Add On event.
  
  Returns:
      Mapping[str, Any]: Response to send back depending on the matched URL.
  """
  # If the Chat app does not detect a link preview URL pattern, reply
  # with a text message that says so.
  if chatMessage.get('matchedUrl') is None:
    return { 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': { 'message': {
      'text': 'No matchedUrl detected.'
    }}}}}

  # [START preview_links_text]
  # Reply with a text message for URLs of the subdomain "text"
  if "text.example.com" in chatMessage.get('matchedUrl').get('url'):
    return { 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': { 'message': {
      'text': 'event.chat.messagePayload.message.matchedUrl.url: ' + chatMessage.get('matchedUrl').get('url')
    }}}}}
    # [END preview_links_text]
    
  # [START preview_links_card]
  # Attach a card to the message for URLs of the subdomain "support"
  if "support.example.com" in chatMessage.get('matchedUrl').get('url'):
    # A hard-coded card is used in this example. In a real-life scenario,
    # the case information would be fetched and used to build the card.
    return { 'hostAppDataAction': { 'chatDataAction': { 'updateInlinePreviewAction': { 'cardsV2': [{
      'cardId': 'attachCard',
      'card': {
        'header': {
          'title': 'Example Customer Service Case',
          'subtitle': 'Case basics',
        },
        'sections': [{ 'widgets': [
        { 'decoratedText': { 'topLabel': 'Case ID', 'text': 'case123'}},
        { 'decoratedText': { 'topLabel': 'Assignee', 'text': 'Charlie'}},
        { 'decoratedText': { 'topLabel': 'Status', 'text': 'Open'}},
        { 'decoratedText': { 'topLabel': 'Subject', 'text': 'It won\'t turn on...' }},
        { 'buttonList': { 'buttons': [{
          'text': 'OPEN CASE',
          'onClick': { 'openLink': {
            'url': 'https://support.example.com/orders/case123'
          }},
        }, {
          'text': 'RESOLVE CASE',
          'onClick': { 'openLink': {
            'url': 'https://support.example.com/orders/case123?resolved=y',
          }},
        }, {
          'text': 'ASSIGN TO ME',
          'onClick': { 'action': { 'function': FUNCTION_URL }}
        }]}}
        ]}]
      }
    }]}}}}
    # [END preview_links_card]


# [START preview_links_assign]
def handle_card_click(chatMessage: dict) -> dict:
  """Respond to clicks by assigning and updating the card that's attached to a
  message previewed link of the pattern "support.example.com".
  
  - Reply with text messages that echo "text.example.com" link URLs in messages.
  - Attach cards to messages with "support.example.com" link URLs.

  Args:
      chatMessage (Mapping[str, Any]): The chat message object from Google Workspace Add On event.
  
  Returns:
      Mapping[str, Any]: Action response depending on the message author.
  """
  # Creates the updated card that displays "You" for the assignee
  # and that disables the button.
  #
  # A hard-coded card is used in this example. In a real-life scenario,
  # an actual assign action would be performed before building the card.
  message = { 'cardsV2': [{
    'cardId': 'attachCard',
    'card': {
      'header': {
        'title': 'Example Customer Service Case',
        'subtitle': 'Case basics',
      },
      'sections': [{ 'widgets': [
      { 'decoratedText': { 'topLabel': 'Case ID', 'text': 'case123'}},
      # The assignee is now "You"
      { 'decoratedText': { 'topLabel': 'Assignee', 'text': 'You'}},
      { 'decoratedText': { 'topLabel': 'Status', 'text': 'Open'}},
      { 'decoratedText': { 'topLabel': 'Subject', 'text': 'It won\'t turn on...' }},
      { 'buttonList': { 'buttons': [{
        'text': 'OPEN CASE',
        'onClick': { 'openLink': {
          'url': 'https://support.example.com/orders/case123'
        }},
      }, {
        'text': 'RESOLVE CASE',
        'onClick': { 'openLink': {
          'url': 'https://support.example.com/orders/case123?resolved=y',
        }},
      }, {
        'text': 'ASSIGN TO ME',
        # The button is now disabled
        'disabled': True,
        'onClick': { 'action': { 'function': FUNCTION_URL }}
      }]}}
      ]}]
    }
  }]}

  # Use the adequate action response type. It depends on whether the message
  # the preview link card is attached to was created by a human or a Chat app.
  if chatMessage.get('sender').get('type') == 'HUMAN':
    return { 'hostAppDataAction': { 'chatDataAction': { 'updateInlinePreviewAction': message }}}
  else:
    return { 'hostAppDataAction': { 'chatDataAction': { 'updateMessageAction': message }}}
    # [END preview_links_assign]


if __name__ == '__main__':
  # This is used when running locally. Gunicorn is used to run the
  # application on Google App Engine. See entrypoint in app.yaml.
  app.run(host='127.0.0.1', port=8080, debug=True)
