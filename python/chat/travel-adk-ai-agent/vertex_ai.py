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
from google_workspace import USERS_PREFIX
from abc import ABC, abstractmethod
from env import is_in_debug_mode
from typing import Any

# Reasoning engine resource name
REASONING_ENGINE = f"projects/{PROJECT_NUMBER}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"

# ------- Session management

# Session service client instance singleton
session_service = VertexAiSessionService(PROJECT_NUMBER, LOCATION)

def get_agent_user_pseudo_id(userName) -> str:
    """Extracts the pseudo user ID from the full user resource name."""
    return userName.replace(USERS_PREFIX, '')

async def delete_agent_session(userName) -> str:
    """Deletes the agent session associated with the given user."""
    session_id = await get_agent_session(userName)
    if session_id != None:
        print(f"Deleting session {session_id}...")
        return await session_service.delete_session(app_name=REASONING_ENGINE, user_id=get_agent_user_pseudo_id(userName), session_id=session_id)
    print(f"No session found for {userName}, nothing to delete")

async def get_agent_session(userName) -> str:
    """Retrieves the agent session associated with the given user."""
    listSessions = await session_service.list_sessions(app_name=REASONING_ENGINE, user_id=get_agent_user_pseudo_id(userName))
    if listSessions and len(listSessions.sessions) > 0:
        # Return the first session found
        print(f"Found existing session: {listSessions.sessions[0].id}")
        return listSessions.sessions[0].id
    return None

async def get_or_create_agent_session(userName) -> str:
    """Retrieves or creates the agent session associated with the given user."""
    session_id = await get_agent_session(userName)
    if session_id == None:
        # Create a new session
        session = await session_service.create_session(app_name=REASONING_ENGINE, user_id=get_agent_user_pseudo_id(userName))
        session_id = session.id
        print(f"Created new session: {session_id}")
    return session_id

# ------- Agent request handling

class IAiAgentUiRender(ABC):
    """Interface AI Agent UI renders need to implement."""

    # Indicates whether the UI is in chat mode (impacts Card framework features and limitations)
    is_chat: bool

    def __init__(self, is_chat: bool):
        self.is_chat = is_chat
        
    @abstractmethod
    def ignored_authors(self) -> list:
        """Returns the list of authors to be ignored for function calling."""
        pass

    @abstractmethod
    def get_author_emoji(self, author) -> str:
        """Returns an emoji representing the author."""
        pass
    
    @abstractmethod
    def create_status_accessory_widgets(self, text: str, material_icon_name: str) -> list:
        """Creates a status accessory widget with a disabled button showing agent progress."""
        pass

    @abstractmethod
    def get_agent_response_widgets(self, name: str, response):
        """Returns the widgets to render for a given agent response."""
        pass

class IAiAgentHandler(ABC):
    """Interface AI Agent handlers need to implement."""
    
    ui_render: IAiAgentUiRender
    
    def __init__(self, ui_render: IAiAgentUiRender):
        self.ui_render = ui_render
        
    @abstractmethod
    def extract_content_from_input(self, input) -> dict:
        """Transforms the user input to AI message with contents."""
        pass
    
    @abstractmethod
    def final_answer(self, author: str, text: str, success: bool, failure: bool):
        """Handles the final answer from the agent."""
        pass

    @abstractmethod
    def function_calling_initiation(self, author: str, name: str) -> Any:
        """Handles the initiation of a function calling from the agent."""
        pass

    @abstractmethod
    def function_calling_completion(self, author: str, name: str, response, output_id):
        """Handles the completion of a function calling from the agent."""
        pass

    @abstractmethod
    def function_calling_failure(self, name: str, output_id: str):
        """Handles the failure of a function calling from the agent."""
        pass
        
async def request_agent(userName: str, input, handler: IAiAgentHandler):
    """Sends a request to the AI agent and processes the response using the given handler."""
    try:
        print("Initializing the session...")
        session_id = await get_or_create_agent_session(userName)

        print(f"Requesting remote agent: {REASONING_ENGINE}...")
        ai_agent = agent_engines.get(REASONING_ENGINE)
        # Keep track of the mapping between function call IDs and output resource IDs
        function_call_output_map = {}
        # Keep track of the mapping between function call IDs and agents
        function_call_output_agent_map = {}
        # Keep track of ongoing function calls
        function_call_ongoing_ids = []
        attempt = 0
        responded = False
        # Retry loop in case of no response from the agent
        while attempt < MAX_AI_AGENT_RETRIES and not responded:
            attempt += 1
            print(f"Attempting agent request #{attempt} / {MAX_AI_AGENT_RETRIES}...")
            # Stream the agent response
            for event_raw in ai_agent.stream_query(user_id=userName, session_id=session_id, message=handler.extract_content_from_input(input=input)):
                responded = True
                event = dict(event_raw)
                if is_in_debug_mode():
                    print(f"Event: {json.dumps(event)}")

                # Retrieve the agent responsible for generating the content
                author = event["author"]

                # Ignore events that are not useful for the end-user
                if "content" not in event:
                    print(f"\n{author}: internal event")
                    continue

                # Retrieve function calls and responses
                function_calls = [e["function_call"] for e in event["content"]["parts"] if "function_call" in e]
                function_responses = [e["function_response"] for e in event["content"]["parts"] if "function_response" in e]

                # Handle final answer
                if "text" in event["content"]["parts"][0]:
                    text = event["content"]["parts"][0]["text"]
                    print(f"\n{author}: {text}")
                    handler.final_answer(author=author, text=text, success=True, failure=False)

                # Handle agent funtion calling initiation
                if function_calls:
                    for function_call in function_calls:
                        id = function_call["id"]
                        name = function_call["name"]
                        # Skip internal function calls
                        if name != "transfer_to_agent" and name not in handler.ui_render.ignored_authors():
                            print(f"\n{author}: function calling initiation {name}")
                            function_call_output_map[id] = handler.function_calling_initiation(author=author, name=name)
                            function_call_output_agent_map[id] = name
                            function_call_ongoing_ids.append(id)
                        else:
                            print(f"\n{author}: internal event, function calling initiation {name}")

                # Handle agent function calling completion
                elif function_responses:
                    for function_response in function_responses:
                        id = function_response["id"]
                        name = function_response["name"]
                        response = function_response["response"]
                        # Skip internal function calls
                        if name != "transfer_to_agent" and name not in handler.ui_render.ignored_authors():
                            # Retrieve the output resource ID for the function call
                            output_id = function_call_output_map.get(id)
                            print(f'\n{author}: function calling completion {name}')
                            if is_in_debug_mode():
                                print(f'Function calling response: {json.dumps(response, indent=2)}')
                            handler.function_calling_completion(author=author, name=name, response=response, output_id=output_id)
                            function_call_ongoing_ids.remove(id)
                        else:
                            print(f"\n{author}: internal event, completed transfer")

            print("Agent responded to the request." if responded is True else "No response received from the agent.")
    except Exception as e:
        print(f"Error occurred while requesting AI agent: {e}")
        # Update all ongoing agent outputs with a failure status
        for id in function_call_ongoing_ids:
            handler.function_calling_failure(
                name=function_call_output_agent_map.get(id),
                output_id=function_call_output_map.get(id)
            )
            function_call_ongoing_ids.remove(id)
        # Send a final answer indicating the failure
        handler.final_answer(
            author="Agent",
            text="Something went wrong, I could not answer that specific question. Please try again later.",
            success=False,
            failure=True
        )
