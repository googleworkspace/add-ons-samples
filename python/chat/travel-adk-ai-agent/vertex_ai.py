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

"""Service that handles Vertex AI API operations."""

import json
from google.adk.sessions import VertexAiSessionService
from vertexai import agent_engines
from env import PROJECT_NUMBER, LOCATION, ENGINE_ID, MAX_AI_AGENT_RETRIES
from abc import ABC, abstractmethod
from typing import Any

USERS_PREFIX = 'users/'

REASONING_ENGINE = f"projects/{PROJECT_NUMBER}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"

session_service = VertexAiSessionService(PROJECT_NUMBER, LOCATION)

def snake_to_user_readable(snake_case_string="") -> str:
    return snake_case_string.replace('_', ' ').title()

def get_user_pseudo_id(userName) -> str:
    return userName.replace(USERS_PREFIX, '')

async def delete_agent_session(userName) -> str:
    session_id = await get_agent_session(userName)
    if session_id != None:
        print(f"Deleting session {session_id}...")
        return await session_service.delete_session(app_name=REASONING_ENGINE, user_id=get_user_pseudo_id(userName), session_id=session_id)
    print(f"No session found for {userName}, nothing to delete")

async def get_agent_session(userName) -> str:
    listSessions = await session_service.list_sessions(app_name=REASONING_ENGINE, user_id=get_user_pseudo_id(userName))
    if listSessions and len(listSessions.sessions) > 0:
        # Return the first session found
        print(f"Found existing session: {listSessions.sessions[0].id}")
        return listSessions.sessions[0].id
    return None

async def get_or_create_agent_session(userName) -> str:
    session_id = await get_agent_session(userName)
    if session_id == None:
        # Create a new session
        session = await session_service.create_session(app_name=REASONING_ENGINE, user_id=get_user_pseudo_id(userName))
        session_id = session.id
        print(f"Created new session: {session_id}")
    return session_id

class IAiAgentUiRender(ABC):
    """Interface AI Agent UI renders need to implement."""

    @abstractmethod
    def get_author_emoji(self, author) -> str:
        pass
    
    @abstractmethod
    def create_status_accessory_widgets(self, text="In progress...", materialIconName="progress_activity") -> list:
        pass

    @abstractmethod
    def get_agent_response_widgets(self, name: str, response):
        pass

class IAiAgentHandler(ABC):
    """Interface AI Agent handlers need to implement."""
    
    ui_render: IAiAgentUiRender
    
    def __init__(self, ui_render: IAiAgentUiRender):
        self.ui_render = ui_render
        
    @abstractmethod
    def extract_content_from_input(self, input) -> dict:
        pass
    
    @abstractmethod
    def final_answer(self, author: str, text: str):
        pass

    @abstractmethod
    def function_calling_initiation(self, author: str, name: str) -> Any:
        pass

    @abstractmethod
    def function_calling_completion(self, author: str, name: str, response, output_id):
        pass

async def request_agent(userName: str, input, handler: IAiAgentHandler):
    print("Initializing the session...")
    session_id = await get_or_create_agent_session(userName)

    print(f"Requesting remote agent: {REASONING_ENGINE}...")
    ai_agent = agent_engines.get(REASONING_ENGINE)
    function_call_output_map = {}
    attempt = 0
    responded = False
    while attempt < MAX_AI_AGENT_RETRIES and not responded:
        attempt += 1
        print(f"Attempting agent request #{attempt} / {MAX_AI_AGENT_RETRIES}...")
        for event_raw in ai_agent.stream_query(user_id=userName, session_id=session_id, message=handler.extract_content_from_input(input=input)):
            responded = True
            
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

            # Handle final answer
            if "text" in event["content"]["parts"][0]:
                text = event["content"]["parts"][0]["text"]
                print(f"\n{author} {text}")
                handler.final_answer(author, text)

            # Handle agent funtion calling initiation
            if function_calls:
                for function_call in function_calls:
                    id = function_call["id"]
                    name = function_call["name"]
                    if name != "transfer_to_agent":
                        print(f"\n{author}: function calling initiation {name}")
                        function_call_output_map[id] = handler.function_calling_initiation(author, name)
                    else:
                        print(f"\n{author}: internal event, function calling initiation {name}")

            # Handle agent function calling completion
            elif function_responses:
                for function_response in function_responses:
                    id = function_response["id"]
                    name = function_response["name"]
                    response = function_response["response"]
                    if name != "transfer_to_agent":
                        output_id = function_call_output_map.get(id)
                        print(f'\n{author}: function calling completion {name}:\n{json.dumps(response, indent=2)}\n')
                        handler.function_calling_completion(author, name, response, output_id)
                    else:
                        print(f"\n{author}: internal event, completed transfer")

        print("Agent responded to the request." if responded is True else "No response received from the agent.")
