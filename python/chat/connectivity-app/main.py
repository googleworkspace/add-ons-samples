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
to listen to HTTP requests from Google Workspace add on events and the OAuth
flow callback."""

import logging
import os
import flask
from werkzeug.middleware.proxy_fix import ProxyFix
from oauth_flow import oauth2callback, create_credentials, generate_auth_url
from google.api_core.exceptions import Unauthenticated
from database import get_token, delete_token
from google.apps import meet_v2 as google_meet

# Configure the application
APP_NAME = "Connectivity app"
LOGOUT_COMMAND_ID = 1

logging.basicConfig(
    level=logging.INFO,
    style="{",
    format="[{levelname:.1}{asctime} {filename}:{lineno}] {message}"
)

# Initialize a Flask app to handle routing.
app = flask.Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app)

@app.route("/oauth2", methods=["GET"])
def on_oauth2():
    """App route that handles callback requests from the OAuth2 authorization flow.
    The handler exhanges the code received from the OAuth2 server with a set of
    credentials, stores them in the database, and redirects the request to the
    config complete URL provided in the request.
    """
    return oauth2callback(flask.request.url)

@app.route("/", methods=["POST"])
def on_event() -> dict:
    """App route that responds to Google Workspace add on events from Google Chat."""
    if event := flask.request.get_json(silent=True):
        # Extract data from the event.
        chat_event = event["chat"]
        user_name = chat_event["user"]["name"]
        config_complete_redirect_url = None

        try:
            if "messagePayload" in chat_event:
                # Handle message events
                config_complete_redirect_url = chat_event["messagePayload"]["configCompleteRedirectUri"]

                # Try to obtain an existing OAuth2 token from storage.
                tokens = get_token(user_name)

                if tokens is None:
                    # App doesn't have tokens for the user yet.
                    # Request configuration to obtain OAuth2 tokens.
                    return get_config_request(user_name, config_complete_redirect_url)

                # Authenticate with the user's OAuth2 tokens.
                credentials = create_credentials(
                    tokens["accessToken"], tokens["refreshToken"])
    
                # Call Meet API to create the new space with the user's OAuth2 credentials.
                meet_client = google_meet.SpacesServiceClient(
                    credentials = credentials
                )
                meet_space = meet_client.create_space(google_meet.CreateSpaceRequest())

                # Reply a Chat message with the link
                return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": { "message": {
                    "text": "New Meet was created: " + meet_space.meeting_uri
                }}}}}
            elif "appCommandPayload" in chat_event:
                # Handles command events
                config_complete_redirect_url = chat_event["appCommandPayload"]["configCompleteRedirectUri"]

                if chat_event["appCommandPayload"]["appCommandMetadata"]["appCommandId"] == LOGOUT_COMMAND_ID:
                    # Delete OAuth2 token from storage if any.
                    delete_token(user_name)
                    # Reply a Chat message with confirmation
                    return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": { "message": {
                        "text": "You are now logged out!"
                    }}}}}
        except Unauthenticated:
            # This error probably happened because the user revoked the authorization.
            # So, let's request configuration again.
            return get_config_request(user_name, config_complete_redirect_url)
    return "Error: Unknown action"

def get_config_request(user_name: str, config_complete_redirect_url: str) -> dict:
    """Returns an action response that tells Chat to request configuration for
    the app. The configuration will be tied to the user who sent the event."""
    return { "basicAuthorizationPrompt": {
        "authorizationUrl": generate_auth_url(user_name, config_complete_redirect_url),
        "resource": APP_NAME
    }}

if __name__ == "__main__":
    PORT=os.getenv("PORT", "8080")
    app.run(port=PORT)
