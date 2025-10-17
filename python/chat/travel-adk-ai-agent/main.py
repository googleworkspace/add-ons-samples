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

import asyncio
import functions_framework
import jwt
import json
from flask import Request, jsonify
from chat import setup_config, find_dm
from gmail import extract_message_contents, get_message
from people import get_person_profile
from travel_agent_ui_render import TravelAgentUiRender
from agent_handler import AgentChat, AgentCommon
from vertex_ai import delete_agent_session, request_agent
from env import RESET_SESSION_COMMAND_ID, BASE_URL
from google.oauth2.credentials import Credentials

# The prefix used by the Google Chat API in the User resource name.
USERS_PREFIX = "users/"

# The prefix used by the Google People API in the People resource name.
PEOPLE_PREFIX = "people/"

# The prefix used by the Google Chat API in the Space resource name.
SPACES_PREFIX = "spaces/"

async def async_adk_ai_agent(request: Request):
    request_json = request.get_json(silent=True)
    request_args = request.args

    if event := request_json:
        if "chat" in event:
            print(f"Event received: {event}")
            # Extract data from the event.
            chat_event = event["chat"]
            user_name = chat_event["user"]["name"]

            if "messagePayload" in chat_event:
                # Handle message events, actions will be taken via Google Chat API calls
                setup_config(chat_event["messagePayload"]["space"]["name"])
                await request_agent(user_name, chat_event["messagePayload"]["message"], AgentChat(TravelAgentUiRender()))
                
                # Respond with an empty response to the Google Chat platform to acknowledge execution
                return {}
            elif "appCommandPayload" in chat_event:
                # Handles command events
                setup_config(chat_event["appCommandPayload"]["space"]["name"])
                if chat_event["appCommandPayload"]["appCommandMetadata"]["appCommandId"] == RESET_SESSION_COMMAND_ID:
                    # Delete session for the user
                    await delete_agent_session(user_name)
                    
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

            user_oauth_token = event['authorizationEventObject']['userOAuthToken']

            del event['authorizationEventObject']
            print(f"Event received: {event}")

            space_name = find_dm(user_name)
            print(f"Space found: {space_name}")
            
            # Handles the session reset action
            reset = False
            resetConfirmation = []
            if request_args.get('reset') != None:
                reset = True
                print(f"Executing reset...")
                await delete_agent_session(user_name)
                resetConfirmation = [{ "textParagraph": { "text": "Alright, let's start from the beginning." }}]
                
            # Extract contextual, host-specific input
            # Could be expanded to calendar, drive, docs, sheets, slides
            hostAppContext = []
            person = get_person_profile(
                credentials=Credentials(token=user_oauth_token),
                people_name=user_name.replace(USERS_PREFIX, PEOPLE_PREFIX),
                person_fields="birthdays"
            )
            hostAppContext.append({ "id": "profile", "name": "Google profile", "value": person })
            print(person)
            if "gmail" in event:
                # Fetch and add selected email in primary text context if any
                gmailEvent = event["gmail"]
                if "messageId" in gmailEvent:
                    message = get_message(
                        credentials=Credentials(token=user_oauth_token),
                        message_id=gmailEvent["messageId"],
                        addon_event_access_token=gmailEvent["accessToken"]
                    )
                    hostAppContext.append({ "id": "email", "name": "Current email", "value": message })
                    print(message)
                else:
                    print("No email is currently selected")
            
            # Handles the send action
            send = False
            answer_sections = []
            if request_args.get('send') != None:
                send = True
                print(f"Executing send...")
                answer_sections = [{ "widgets": [{ "text_paragraph": { "text": "No answer because the message you sent was empty 😥" }}]}]
                common_event_object = event['commonEventObject']
                print(f"Common event object: {common_event_object}")
                if common_event_object.get('formInputs') != None:
                    if common_event_object.get('formInputs').get('message') != None:
                        print(f"Building AI agent request message...")
                        userMessage = "USER MESSAGE TO ANSWER: " + common_event_object.get('formInputs').get('message').get('stringInputs').get('value')[0]
                        selectedContexts = common_event_object.get('formInputs').get('context').get('stringInputs').get('value') if common_event_object.get('formInputs').get('context') != None else []
                        if "email" in selectedContexts and any((item['id'] == 'email') for item in hostAppContext):
                            # Include email context if needed
                            email_subject, email_body = extract_message_contents(next(item for item in hostAppContext if item['id'] == 'email')["value"])
                            userMessage += f"\n\nEMAIL THE USER HAS OPENED ON SCREEN:\nSubject: {email_subject}\nBody:\n---\n{email_body}\n---"
                        if "profile" in selectedContexts and any((item['id'] == 'profile') for item in hostAppContext):
                            # Include profile context if needed
                            userMessage += f"\n\nPUBLIC PROFILE OF THE USER IN JSON FORMAT: {json.dumps(next(item for item in hostAppContext if item['id'] == 'profile')["value"])}"
                        print(f"Answering message: {userMessage}...")
                        travel_common_agent = AgentCommon(TravelAgentUiRender())
                        await request_agent(user_name, userMessage, travel_common_agent)
                        answer_sections = travel_common_agent.get_answer_sections()

            # Handles UI card
            hostAppContextSources = { "selectionInput": {
                "name": "context",
                "label": "Context",
                "type": "SWITCH",
                "items": [{ "text": c["name"], "value": c["id"], "selected": False } for c in hostAppContext]
            }}
            print(f"{hostAppContextSources}")

            card = { "sections": [{ "widgets": resetConfirmation +
                [{ "textInput": { "name": "message", "label": "Message", "type": "MULTIPLE_LINE" }}] +
                ([hostAppContextSources] if len(hostAppContext) > 0 else []) +
                [{ "decoratedText": { "button": {
                    "text": "Send",
                    "type": "FILLED",
                    "icon": { "materialIcon": { "name": "send" }},
                    "onClick": { "action": { "function": BASE_URL + "?send=true" }},
                    "width": { "type": "TYPE_FILL_CONTAINER" }
                }}},
                { "decoratedText": { "button": {
                    "text": "Reset session",
                    "type": "OUTLINED",
                    "icon": { "materialIcon": { "name": "cleaning_services" }},
                    "onClick": { "action": { "function": BASE_URL + "?reset=true" }}
                }}},
                { "decoratedText": { "button": {
                    "text": "Open Chat",
                    "type": "OUTLINED",
                    "icon": { "iconUrl": "https://www.gstatic.com/images/branding/productlogos/chat_2023q4/v2/192px.svg"},
                    "onClick": { "openLink": { "url": f"https://chat.google.com/dm/{space_name.replace(SPACES_PREFIX, "")}" }}
                }}}]
            }] + answer_sections }
            print(f"{card}")

            if reset is True or send is True:
                return { "action": { "navigations": [{ "updateCard": card }]}}
            else:
                return card

    return "Error: Unknown action", 400

@functions_framework.http
def adk_ai_agent(request: Request):
    """Function triggered by Google Workspace add on events."""
    result = asyncio.run(async_adk_ai_agent(request))
    if isinstance(result, dict):
        return jsonify(result)
    elif isinstance(result, tuple) and len(result) == 2:
        return result
    else:
        return result, 200
