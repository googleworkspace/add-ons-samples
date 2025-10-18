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

"""The main script for the project, which starts a Google Cloud Functions app
to listen to HTTP requests from Google Workspace add on events."""

import asyncio
import functions_framework
import jwt
import json
from flask import Request, jsonify
from google_workspace import set_chat_config, find_chat_app_dm, extract_email_contents, get_email, get_person_profile, USERS_PREFIX, SPACES_PREFIX, PEOPLE_PREFIX
from travel_agent_ui_render import TravelAgentUiRender
from agent_handler import AgentChat, AgentCommon
from vertex_ai import delete_agent_session, request_agent
from env import RESET_SESSION_COMMAND_ID, BASE_URL, is_in_debug_mode
from google.oauth2.credentials import Credentials

async def async_adk_ai_agent(request: Request):
    """Async function triggered by Google Workspace add on events."""
    request_json = request.get_json(silent=True)
    request_args = request.args

    if event := request_json:
        # The logic differs whether the event is from Chat or another host app
        if "chat" in event:
            if is_in_debug_mode():
                print(f"Event received: {event}")
            # Extract data from the event.
            chat_event = event["chat"]
            user_name = chat_event["user"]["name"]

            if "messagePayload" in chat_event:
                # Handle message events, actions will be taken via Google Chat API calls
                set_chat_config(chat_event["messagePayload"]["space"]["name"])
                # Request AI agent to answer the message and use the Chat handler and UI renderer
                await request_agent(user_name, chat_event["messagePayload"]["message"], AgentChat(TravelAgentUiRender(is_chat=True)))
                
                # Respond with an empty response to the Google Chat platform to acknowledge execution
                return {}
            elif "appCommandPayload" in chat_event:
                # Handles command events
                set_chat_config(chat_event["appCommandPayload"]["space"]["name"])
                if chat_event["appCommandPayload"]["appCommandMetadata"]["appCommandId"] == RESET_SESSION_COMMAND_ID:
                    # Delete session for the user
                    await delete_agent_session(user_name)
                    
                    # Reply a Chat message with confirmation
                    return { "hostAppDataAction": { "chatDataAction": { "createMessageAction": { "message": {
                        "text": "OK, let's start from the beginning, what can I help you with?"
                    }}}}}
        else:
            # Extract auth data from the event
            user_name = USERS_PREFIX + jwt.decode(
                event['authorizationEventObject']['userIdToken'],
                algorithms=["RS256"],
                options={"verify_signature": False}
            )['sub']
            user_oauth_token = event['authorizationEventObject']['userOAuthToken']
            # Remove authorization object to avoid leaking tokens in logs
            del event['authorizationEventObject']

            if is_in_debug_mode():
                print(f"Event received: {event}")

            print(f"User found: {user_name}")            
            space_name = find_chat_app_dm(user_name)
            print(f"Space found: {space_name}")
            
            # Extract contextual, host-specific input
            # Note; This could be expanded to calendar, drive, docs, sheets, slides
            host_app_context = []
            # Fetch and add user profile context
            person = get_person_profile(
                credentials=Credentials(token=user_oauth_token),
                people_name=user_name.replace(USERS_PREFIX, PEOPLE_PREFIX),
                person_fields="birthdays"
            )
            host_app_context.append({ "id": "profile", "name": "Google profile", "value": person })
            if is_in_debug_mode():
                print(f"Person: {person}")
            if "gmail" in event:
                # Fetch and add current email context if any
                gmail_event = event["gmail"]
                if "messageId" in gmail_event:
                    message = get_email(
                        credentials=Credentials(token=user_oauth_token),
                        message_id=gmail_event["messageId"],
                        addon_event_access_token=gmail_event["accessToken"]
                    )
                    host_app_context.append({ "id": "email", "name": "Current email", "value": message })
                    if is_in_debug_mode():
                        print(f"Email: {message}")
                else:
                    print("No email is currently selected")
            
            # Handles the session reset action
            reset = False
            reset_confirmation_widgets = []
            if request_args.get('reset') != None:
                reset = True
                print(f"Executing reset action...")
                await delete_agent_session(user_name)
                reset_confirmation_widgets = [{ "text_paragraph": { "text": "Alright, let's start from the beginning." }}]
                
            # Handles the send action
            send = False
            answer_sections = []
            if request_args.get('send') != None:
                send = True
                print(f"Executing send action...")
                answer_sections = [{ "widgets": [{ "text_paragraph": { "text": "No answer because the message you sent was empty 😥" }}]}]
                common_event_object = event.get('commonEventObject', {})
                if is_in_debug_mode():
                    print(f"Common event object: {common_event_object}")
                if common_event_object.get('formInputs', {}).get('message') != None:
                    print(f"Building the AI agent request message...")
                    user_message = "USER MESSAGE TO ANSWER: " + common_event_object['formInputs']['message']['stringInputs']['value'][0]
                    selected_contexts = common_event_object['formInputs']['context']['stringInputs']['value'] if 'context' in common_event_object['formInputs'] else []
                    if "email" in selected_contexts and any((item['id'] == 'email') for item in host_app_context):
                        # Include email context if requested by user
                        email_subject, email_body = extract_email_contents(next(item for item in host_app_context if item['id'] == 'email')["value"])
                        user_message += f"\n\nEMAIL THE USER HAS OPENED ON SCREEN:\nSubject: {email_subject}\nBody:\n---\n{email_body}\n---"
                    if "profile" in selected_contexts and any((item['id'] == 'profile') for item in host_app_context):
                        # Include profile context if requested by user
                        user_message += f"\n\nPUBLIC PROFILE OF THE USER IN JSON FORMAT: {json.dumps(next(item for item in host_app_context if item['id'] == 'profile')["value"])}"
                    if is_in_debug_mode():
                        print(f"Answering message: {user_message}...")
                    # Request AI agent to answer the message and use the common handler and UI renderer
                    travel_common_agent = AgentCommon(TravelAgentUiRender(is_chat=False))
                    await request_agent(user_name, user_message, travel_common_agent)
                    answer_sections = travel_common_agent.get_answer_sections()

            # Handles UI card
            host_app_context_sources = { "selectionInput": {
                "name": "context",
                "label": "Context",
                "type": "SWITCH",
                "items": [{ "text": c["name"], "value": c["id"], "selected": False } for c in host_app_context]
            }}
            card = { "sections": [{ "widgets": reset_confirmation_widgets +
                [{ "textInput": { "name": "message", "label": "Message", "type": "MULTIPLE_LINE" }}] +
                ([host_app_context_sources] if len(host_app_context) > 0 else []) +
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
            if is_in_debug_mode():
                print(f"Generated card: {card}")

            if reset is True or send is True:
                # Update existing card
                return { "action": { "navigations": [{ "updateCard": card }]}}
            else:
                # Initial card render
                return card
            
    return "Error: Unknown action", 400

@functions_framework.http
def adk_ai_agent(request: Request):
    """Function triggered by Google Workspace add on events."""
    # Run the async handler which is required in Google Cloud Functions runtime
    result = asyncio.run(async_adk_ai_agent(request))
    if isinstance(result, dict):
        return jsonify(result)
    elif isinstance(result, tuple) and len(result) == 2:
        return result
    else:
        return result, 200
