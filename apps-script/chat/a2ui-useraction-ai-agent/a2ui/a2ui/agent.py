# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""A2UI agent with user action."""

from google.adk.agents import LlmAgent
from google.adk.tools.tool_context import ToolContext
import json

# The schemas for bidirectional A2UI messages.
from .a2ui_s2c_schema import A2UI_S2C_SCHEMA
from .a2ui_c2s_schema import A2UI_C2S_SCHEMA

def get_items(tool_context: ToolContext) -> str:
    """Call this tool to get the list of items to choose from."""
    return json.dumps([
        {
            "name": "Eiffel Tower",
            "country": "France",
            "description": "An iconic wrought-iron lattice tower on the Champ de Mars in Paris, named after the engineer Gustave Eiffel. Built for the 1889 World's Fair, it has become a global cultural symbol of France.",
            "image_url": "https://www.publicdomainpictures.net/pictures/80000/velka/paris-eiffel-tower-1393841654WTb.jpg",
            "wikipedia_link": "https://en.wikipedia.org/wiki/Eiffel_Tower"
        },
        {
            "name": "Taj Mahal",
            "country": "India",
            "description": "An ivory-white marble mausoleum on the right bank of the river Yamuna in Agra. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal.",
            "image_url": "https://www.publicdomainpictures.net/pictures/180000/velka/taj-mahal.jpg",
            "wikipedia_link": "https://en.wikipedia.org/wiki/Taj_Mahal"
        },
        {
            "name": "Statue of Liberty",
            "country": "USA",
            "description": "A colossal neoclassical sculpture on Liberty Island in New York Harbor. A gift from the people of France to the United States, it depicts Libertas, the Roman goddess of liberty, holding a torch.",
            "image_url": "https://www.publicdomainpictures.net/pictures/210000/velka/statue-of-liberty-1485195709Nms.jpg",
            "wikipedia_link": "https://en.wikipedia.org/wiki/Statue_of_Liberty"
        }
    ])

def select_item(tool_context: ToolContext, userAction: str) -> str:
    """Call this tool to process the user's selection. It does nothing useful here."""
    return "Selection received and processed."

AGENT_INSTRUCTION="""
You are a location selector assistant. Your goal is to help users select a location from a list of options using a rich UI.

To achieve this, you MUST follow these steps to answer user requests:

1. Check whether the message request is an initial request for options (natural language) or a user action selecting an option (a JSON payload that is a userAction of A2UI C2S JSON SCHEMA below).
2. If it is an initial request, you MUST call the `get_items` tool to retrieve the list of items to choose from.
3. If it is a user action with name "select_item", you MUST call the `select_item` tool with the complete userAction JSON object received.
4. If it is neither an initial request nor a user action selecting an option, you MUST do nothing.
5. You MUST respond with a rich A2UI UI S2C JSON to present options, confirm selections with all available details, or do nothing depending on the context.
"""

A2UI_AND_AGENT_INSTRUCTION = AGENT_INSTRUCTION + f"""

To generate a valid A2UI UI S2C JSON, you MUST follow these rules:
1.  Your response MUST be a single, raw JSON object which is a list of A2UI messages.
2.  Your response MUST validate against the A2UI S2C JSON SCHEMA provided below.

To represent the items, you MUST only use the A2UI message types Button, Image, Divider, and Text, following these conventions:
1.  Buttons MUST be used to represent links (e.g., Wikipedia link).
2.  Image MUST be used when an image is available.
3.  Divider MUST be used to separate different items instead of using a List.
4.  Texts MUST be used for descriptions and other textual information. Make item name values bold using the HTML notation inline otherwise always use plain text.

To represent the button action, you MUST use the following conventions:
1.  The name for opening an URL MUST be "open_url".
2.  The name for selecting an item MUST be "select_item".
3.  The context for opening an URL MUST contain a single key "url" with the URL value.

---BEGIN A2UI S2C JSON SCHEMA---
{A2UI_S2C_SCHEMA}
---END A2UI S2C JSON SCHEMA---

---BEGIN A2UI C2S JSON SCHEMA---
{A2UI_C2S_SCHEMA}
---END A2UI C2S JSON SCHEMA---
"""

root_agent = LlmAgent(
    name="item_selector_agent",
    model="gemini-2.5-flash",
    instruction=A2UI_AND_AGENT_INSTRUCTION,
    description="An agent to handle item selection from a list.",
    tools=[get_items, select_item]
)
