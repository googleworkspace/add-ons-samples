# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# [START chat_avatar_app]
from typing import Any, Mapping

import flask
import functions_framework

# [START chat_avatar_app_slash_command]
# The ID of the slash command "/about".
# You must use the same ID in the Google Chat API configuration.
ABOUT_COMMAND_ID = 1

@functions_framework.http
def avatar_app(req: flask.Request) -> Mapping[str, Any]:
  """Handle requests from Google Workspace add on

  Args:
    flask.Request req: the request sent by Google Chat

  Returns:
    Mapping[str, Any]: the response to be sent back to Google Chat
  """
  chat_event = req.get_json(silent=True)["chat"]
  if chat_event and "appCommandPayload" in chat_event:
    message = handle_app_command(chat_event)
  else:
    message = handle_message(chat_event)
  return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": {
      "message": message
  }}}}

def handle_app_command(event: Mapping[str, Any]) -> Mapping[str, Any]:
  """Responds to an APP_COMMAND event in Google Chat.

  Args:
    Mapping[str, Any] event: the event object from Google Chat

  Returns:
    Mapping[str, Any]: the response message object.
  """
  if event["appCommandPayload"]["appCommandMetadata"]["appCommandId"] == ABOUT_COMMAND_ID:
    return {
      "text": "The Avatar app replies to Google Chat messages.",
    }
  return {}
  # [END chat_avatar_app_slash_command]

def handle_message(event: Mapping[str, Any]) -> Mapping[str, Any]:
  """Responds to a MESSAGE event in Google Chat.

  Args:
    Mapping[str, Any] event: the event object from Google Chat

  Returns:
    Mapping[str, Any]: the response message object.
  """
  # Stores the Google Chat user as a variable.
  chat_user = event["messagePayload"]["message"]["sender"]
  display_name = chat_user.get("displayName", "")
  avatar_url = chat_user.get("avatarUrl", "")
  return {
    "text": "Here's your avatar",
    "cardsV2": [{
      "cardId": "avatarCard",
      "card": {
        "name": "Avatar Card",
        "header": {
          "title": f"Hello {display_name}!"
        },
        "sections": [{ "widgets": [
          { "textParagraph": { "text": "Your avatar picture:" }},
          { "image": { "imageUrl": avatar_url }},
        ]}]
      }
    }]
  }
  # [END chat_avatar_app]
