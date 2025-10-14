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

import asyncio
import json
import urllib.parse
import io
import base64
import re

# Chat API
from google.oauth2.service_account import Credentials
from google.apps import chat_v1 as google_chat
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# Vertex AI API
from google.adk.sessions import VertexAiSessionService
from vertexai import agent_engines

SERVICE_ACCOUNT_FILE = 'credentials_chat.json'
APP_AUTH_OAUTH_SCOPE = ["https://www.googleapis.com/auth/chat.bot"]

USERS_PREFIX = 'users/'
SPACES_PREFIX = 'spaces/'

spaceName = 'spaces/iMGKjCAAAAE'
userName = 'users/117395548653558734883'

projectNumber = '394838622210'
agentLocation = 'us-central1'
engineID = '2327045991443726336'
reasoningEngine = f"projects/{projectNumber}/locations/{agentLocation}/reasoningEngines/{engineID}"

session_service = VertexAiSessionService(projectNumber, agentLocation)

def create_google_chat_cloud_client():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)

    return google_chat.ChatServiceClient(
        credentials = creds,
        client_options={
            "scopes": APP_AUTH_OAUTH_SCOPE
        }
    )
    
google_chat_cloud_client = create_google_chat_cloud_client()

def get_author_emoji(author) -> str:
    if author == snake_to_user_readable("inspiration_agent"):
        return "ℹ️"
    elif author == snake_to_user_readable("place_agent"):
        return "📍"
    if author == snake_to_user_readable("poi_agent"):
        return "🗼"
    if author == snake_to_user_readable("map_tool"):
        return "🗺️"
    if author == snake_to_user_readable("planning_agent"):
        return "📅"
    return "🤖"        

def build_message(author="Agent", text="", cards_v2=[], final=True) -> dict:
    emoji = get_author_emoji(author)
    if text:
        # TODO: "text_syntax": 'MARKDOWN'
        cards_v2.insert(0, { "card": { "sections": [{ "widgets": [{ "text_paragraph": { "text": text }}]}]}})
    return {
        "text": f"{emoji} *{author}*{'' if text else ' ✅'}",
        "cards_v2": cards_v2,
        "accessory_widgets": create_status_accessory_widgets() if final is False else []
    }

def create_message(author="Agent", text="", cards_v2=[], final=True) -> str:
    return google_chat_cloud_client.create_message(google_chat.CreateMessageRequest(
        parent = spaceName,
        message = build_message(author=author, text=text, cards_v2=cards_v2, final=final)
    )).name

def update_message(messageName, author="Agent", text="", cards_v2=[], final=True):
    message = build_message(author=author, text=text, cards_v2=cards_v2, final=final)
    message['name'] = messageName
    return google_chat_cloud_client.update_message(google_chat.UpdateMessageRequest(
        message = message,
        update_mask = "*"
    ))

def create_status_accessory_widgets(text="In progress...", materialIconName="progress_activity") -> list:
    return [{ "button_list": { "buttons": [{
        "text": text,
        "icon": { "material_icon": { "name": materialIconName}},
        "on_click": { "open_link": { "url": "https://google.com"}},
        "disabled": True
    }]}}]

def create_destination_cards(destinations=[]) -> list:
    carousel_cards = []
    for item in destinations:
        carousel_card_widgets = []
        
        # 1. Add image
        image_url = item.get("image")
        if image_url:
            carousel_card_widgets.append({ "image": { "image_url": image_url }})

        # 2. Add text
        destination_name = item.get("name", "Unknown")
        country = item.get("country", "Unknown")
        carousel_card_widgets.append({ "text_paragraph": { "text": f"**{destination_name}, {country}**" }})
        carousel_cards.append({ "widgets": carousel_card_widgets })
        
    return [{ "card": { "sections": [{ "widgets": [{ "carousel": { "carousel_cards": carousel_cards }}]}]}}]

def create_place_cards(places=[]) -> list:
    carousel_cards = []
    for item in places:
        carousel_card_widgets = []
        footer_widgets = []
        
        # 1. Add image
        image_url = item.get("image_url")
        if image_url:
            carousel_card_widgets.append({ "image": { "image_url": image_url }})

        # 2. Add text
        carousel_card_widgets.append({ "text_paragraph": { "text": f"**{item.get("place_name")}**" }})
        
        # 3. Add Google Maps button link
        place_name = urllib.parse.quote_plus(item.get("place_name"))
        address = urllib.parse.quote_plus(item.get("address"))
        footer_widgets.append({ "button_list": { "buttons": [{ "text": "Open Maps", "on_click": { "open_link": {
            "url": f"https://www.google.com/maps/search/?api=1&query={place_name},{address}"
        }}, "width": { "type": "TYPE_FILL_CONTAINER" }}]}})

        carousel_cards.append({ "widgets": carousel_card_widgets, "footerWidgets": footer_widgets })
        
    return [{ "card": { "sections": [{ "widgets": [{ "carousel": { "carouselCards": carousel_cards }}]}]}}]

def create_source_cards(text="") -> list:
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+|www\.[^\s/$.?#].[^\s]*'
    urls = re.findall(url_pattern, text)
    cleaned_urls = [url.rstrip('.,;)') for url in urls]
    cleaned_urls = cleaned_urls[:5]
    if len(cleaned_urls) > 0:
        sourceButtons = []
        for url in cleaned_urls:
            sourceButtons.append({ "text": urllib.parse.urlparse(url).netloc, "on_click": { "open_link": { "url": url }}})
        return [{ "card": { "sections": [{ "widgets": [{ "button_list": { "buttons": sourceButtons }}]}]}}]
        
    return []

def snake_to_user_readable(snake_case_string="") -> str:
    return snake_case_string.replace('_', ' ').title()

def get_user_pseudo_id() -> str:
    # TODO: Base64 it so that we do not have to do ID processing like string replacements.
    return userName.replace(USERS_PREFIX, '') + "_" + spaceName.replace(SPACES_PREFIX, '')

async def get_or_create_session() -> str:
    userPseudoId = get_user_pseudo_id()
    listSessions = await session_service.list_sessions(app_name=reasoningEngine, user_id=userPseudoId)
    if listSessions and len(listSessions.sessions) > 0:
        # Return the first session found
        print(f"Found existing session: {listSessions.sessions[0].id}")
        return listSessions.sessions[0].id

    # Create a new session
    session = await session_service.create_session(app_name=reasoningEngine, user_id=userPseudoId)
    print(f"Created new session: {session.id}")
    return session.id

async def request_adk_agent(message, clean=True):
    # Create a new Vertex AI session
    print("Initialize session...")
    session_id = await get_or_create_session()

    print(f"Requesting remote agent: {reasoningEngine}...")
    ai_agent = agent_engines.get(reasoningEngine)
    function_call_message_map = {}
    for event_raw in ai_agent.stream_query(user_id=userName, session_id=session_id, message=message):
        # Transform
        event = dict(event_raw)
        
        # Logging
        print(json.dumps(event))

        # Retrieve the agent responsible for generating the content
        author = snake_to_user_readable(event["author"])

        # Ignore events that are not linked to contents for the end-user
        if "content" not in event:
            print(f"{author}: internal event")
            continue

        # Retrieve function calls and responses
        function_calls = [
            e["function_call"]
            for e in event["content"]["parts"]
            if "function_call" in e
        ]
        function_responses = [
            e["function_response"]
            for e in event["content"]["parts"]
            if "function_response" in e
        ]

        if "text" in event["content"]["parts"][0]:
            text = event["content"]["parts"][0]["text"]
            print(f"\n{author} {text}")
            # TODO: Create new Chat message with final text, thoughts, and done status
            create_message(author=author, text=text, cards_v2=[])

        if function_calls:
            for function_call in function_calls:
                id = function_call["id"]
                if function_call["name"] != "transfer_to_agent":
                    function_call_message_map[id] = create_message(
                        author=snake_to_user_readable(function_call["name"]),
                        text=f"Working on **{author}**'s request...",
                        cards_v2=[],
                        final=False)
                else:
                    print(f"{author}: internal event, initiate transfer to another agent")

        elif function_responses:
            for function_response in function_responses:
                id = function_response["id"]
                name = function_response["name"]
                response = function_response["response"]
                message_name = function_call_message_map.get(id)
                print(
                    f'{author}\nResponse from: "{name}"\nresponse: {json.dumps(response, indent=2)}\n'
                )
                match name:
                    # Update messages with results.
                    case "place_agent":
                        print("\n[app]: To render a carousel of destinations")
                        update_message(
                            messageName=message_name,
                            author=snake_to_user_readable(name),
                            text="",
                            cards_v2=[]
                            # TODO: cards_v2=create_destination_cards(response["places"])
                        )
                    case "map_tool":
                        print("\n[app]: To render a map of pois")
                        update_message(
                            messageName=message_name,
                            author=snake_to_user_readable(name),
                            text="",
                            cards_v2=[]
                            # TODO: cards_v2=create_place_cards(response["places"])
                        )
                    case "google_search_grounding":
                        print("\n[app]: To render source links")
                        update_message(
                            messageName=message_name,
                            author=snake_to_user_readable(name),
                            text="",
                            cards_v2=create_source_cards(response["result"])
                        )
                    case "transfer_to_agent": 
                        print(f"{author}: internal event, complete transfer to another agent")
                    case _:
                        update_message(
                            messageName=message_name,
                            author=snake_to_user_readable(name),
                            text="",
                            cards_v2=[]
                        )

    if clean is True:
        print("Deleting session...")
        await session_service.delete_session(app_name=reasoningEngine, user_id=get_user_pseudo_id(), session_id=session_id)
    
    print("Turn run complete.")

def get_content_from_chat_message_payload(payload) -> dict:
    # Initialize with the text part which is always present
    parts = [{ "text": payload.get("message").get("text") }]
    
    # Add images based on the message attachments
    if "attachment" in payload.get("message"):
        for attachment in payload.get("message").get("attachment"):
            # TODO
            # attachmentBase64Data = downloadChatAttachment(attachment.get("attachmentDataRef").get("resourceName"))
            attachmentBase64Data = file_to_base64("./image.jpg")
            inline_data_part = {
                "inline_data": {
                    "mime_type": attachment.get("contentType"),
                    "data": attachmentBase64Data
                }
            }
            parts.append(inline_data_part)
        
    # return types.Content(role="user", parts=parts)
    return {
        "role": "user",
        "parts": parts
    }

def create_google_chat_api_client():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE).with_scopes(APP_AUTH_OAUTH_SCOPE)
    return build('chat', 'v1', credentials=creds)
    
google_chat_api_client = create_google_chat_api_client()

def downloadChatAttachment(attachment_name) -> str:
    request = google_chat_api_client.media().download_media(resourceName=attachment_name)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)

    done = False
    while done is False:
        downloader.next_chunk()

    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def file_to_base64(file_path: str) -> str:
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

if __name__ == "__main__":
    # Scenario 1 (multi-agent)
    scenario_1_turn_1 = { "message": { "text": "Looking for inspirations around the Americas" }}
    asyncio.run(request_adk_agent(get_content_from_chat_message_payload(scenario_1_turn_1), False))
    scenario_1_turn_2 = { "message": { "text": "Can you tell me more about Machu Pichu, what are the points of interest?" }}
    # asyncio.run(request_adk_agent(get_content_from_chat_message_payload(scenario_1_turn_2), False))
    scenario_1_turn_3 = { "message": { "text": "Let's plan a trip to Peru!" }}
    # asyncio.run(request_adk_agent(get_content_from_chat_message_payload(scenario_1_turn_3), True))
    
    # Scenario 2 (multimodal)
    scenario_2_turn_1 = { "message": {
        "text": "I want to go there!",
        "attachment": [{ "attachmentDataRef": { "resourceName": "???" }, "contentType": "image/jpeg" }]
    }}
    # asyncio.run(request_adk_agent(get_content_from_chat_message_payload(scenario_2_turn_1), True))

    # Scenario 3 (grounding)
    # Deploy the ADK agent adding this line "Make sure to also return a list of source URLs you found the information with."
    # at the end of the prompt for the google_search_grounding tool defined in file /tools/search.py.
    scenario_3_turn_1 = { "message": { "text": "I have a week long trip booked to Paris starting in 3 days from Newark airport. Flights, seats, hotel, room, and costs do not matter. Could you give me an update on visa requirements?" }}
    # asyncio.run(request_adk_agent(get_content_from_chat_message_payload(scenario_3_turn_1), True))
