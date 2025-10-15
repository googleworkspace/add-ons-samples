# Copyright 2025 Google LLC. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""The main script for the project, which starts a Flask app
to listen to HTTP requests from Google Workspace add on events."""

import logging
import os
import flask
import jwt 
from database import get_session, store_session, delete_session
# from space import find_dm
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure the application
RESET_SESSION_COMMAND_ID = 1

# The prefix used by the Google Chat API in the User resource name.
USERS_PREFIX = "users/"

# The prefix used by the Google Chat API in the Space resource name.
SPACES_PREFIX = "spaces/"

logging.basicConfig(
    level=logging.INFO,
    style="{",
    format="[{levelname:.1}{asctime} {filename}:{lineno}] {message}"
)

# Initialize a Flask app to handle routing.
app = flask.Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)

@app.route("/", methods=["POST"])
def on_event() -> dict:
    """App route that responds to Google Workspace add on events."""
    if event := flask.request.get_json(silent=True):
        # del event['authorizationEventObject']
        print(f"Event received: {event}")
        if "chat" in event:
            # Extract data from the event.
            chat_event = event["chat"]
            user_name = chat_event["user"]["name"]
            message_text = chat_event["messagePayload"]["message"]["text"]

            if "messagePayload" in chat_event:
                # TODO
                # Handle message events
                # Reply a Chat message with the link
                return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": { "message": {
                    "text": "Echo: " + message_text
                }}}}}
            elif "appCommandPayload" in chat_event:
                # Handles command events
                if chat_event["appCommandPayload"]["appCommandMetadata"]["appCommandId"] == RESET_SESSION_COMMAND_ID:
                    # Reset ADK session for the user.
                    delete_session(user_name)
                    # Reply a Chat message with confirmation
                    return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": { "message": {
                        "text": "OK, let's start from the beginning, what can I help you with?"
                    }}}}}
        else:
            # Extract data from the event.
            user_name = USERS_PREFIX + jwt.decode(
                event['authorizationEventObject']['userIdToken'],
                algorithms=["RS256"],
                options={"verify_signature": False}
            )['sub']
            print(f"User found: {user_name}")
            # space_name = find_dm(user_name)
            # print(f"Space found: {space_name}")

            # Handles the session reset action
            print(flask.request.args.to_dict())
            reset = False
            update = False
            if flask.request.args.get('reset') != None:
                print(f"Executing reset...")
                delete_session(user_name)
                reset = True

            # Handles UI card
            card = { "sections": [{ "widgets": [
                { "textParagraph": { "text": "Alright, let's start from the beginning.\n\nWhat can I help you with?" if reset is True else "What can I help you with?" }},
                { "textInput": { "name": "question", "label": "Question" }},
                { "buttonList": { "buttons": [
                    {
                        "text": "Ask",
                        "type": "FILLED",
                        "icon": { "materialIcon": { "name": "help" }},
                        "onClick": { "action": { "function": "https://agentspace-chat-app.uc.r.appspot.com?answer" }}
                    },
                    {
                        "text": "Reset",
                        "type": "OUTLINED",
                        "icon": { "materialIcon": { "name": "autorenew" }},
                        "onClick": { "action": { "function": "https://agentspace-chat-app.uc.r.appspot.com?reset=true" }}
                    },
                    # {
                    #     "text": "Chat",
                    #     "type": "OUTLINED",
                    #     "icon": { "materialIcon": { "name": "chat" }},
                    #     "onClick": { "openLink": { "url": f"https://chat.google.com/dm/{space_name.replace(SPACES_PREFIX, "")}" }}
                    # }
                ]}}
            ]}]}
            
            if reset is True or update is True:
                return { "action": { "navigations": [{ "updateCard": card }]}}
            else:
                return card
        # TODO: optional, add contextual-based logic
        # elif "gmail" in event:
        #     return {}
        # elif "calendar" in event:
        #     return {}
        # elif "drive" in event:
        #     return {}
        # elif "docs" in event:
        #     return {}

    return "Error: Unknown action"

if __name__ == "__main__":
    PORT=os.getenv("PORT", "8080")
    app.run(port=PORT)
