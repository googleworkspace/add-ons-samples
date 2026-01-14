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

"""A2UI agent."""

from google.adk.agents import LlmAgent
from google.adk.tools.tool_context import ToolContext
import json

# The schema for any A2UI message. This never changes.
from .a2ui_schema import A2UI_SCHEMA

def get_user_profile(tool_context: ToolContext) -> str:
    """Call this tool to get the current user profile."""
    return json.dumps({
        "name": "Pierrick Voulet",
        # "title": "DevRel Engineer @ Google Workspace | Gen AI & AI Agents & Agentic AI | Automation & Digital Transformation",
        "imageUrl": "https://io.google/2024/speakers/3ea87822-3160-4d54-89dd-57e185085f79_240.webp",
        "linkedin": "https://www.linkedin.com/in/pierrick-voulet/"
    })

AGENT_INSTRUCTION="""
You are a user profile assistant. Your goal is to help users get their profile information using a rich UI.

To achieve this, you MUST follow these steps to answer user requests:

1.  You MUST call the `get_user_profile` tool and extract all the user profile information from the result.
2.  You MUST generate a final a2ui UI JSON based on the user profile information extracted in the previous step."""

A2UI_AND_AGENT_INSTRUCTION = AGENT_INSTRUCTION + f"""

To generate a valid a2ui UI JSON, you MUST follow these rules:
1.  Your response MUST be in two parts, separated by the delimiter: `---a2ui_JSON---`.
2.  The first part is your conversational text response.
3.  The second part is a single, raw JSON object which is a list of A2UI messages.
4.  The JSON part MUST validate against the A2UI JSON SCHEMA provided below.

To represent the user profile, you MUST use the following A2UI message types:
1.  Buttons MUST be used to represent links (e.g., LinkedIn profile link).
2.  Image MUST be used to represent the user's profile picture.

---BEGIN A2UI JSON SCHEMA---
{A2UI_SCHEMA}
---END A2UI JSON SCHEMA---
"""

root_agent = LlmAgent(
    name="user_profile",
    model="gemini-2.5-flash",
    instruction=A2UI_AND_AGENT_INSTRUCTION,
    description="An agent that returns the current user profile.",
    tools=[get_user_profile]
)
