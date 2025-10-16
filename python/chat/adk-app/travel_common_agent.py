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

from vertex_ai import snake_to_user_readable
from travel_agent_ui import *
from ai_agent_handler import IAiAgentHandler
from typing import Any

class TravelCommonAgent(IAiAgentHandler):
    def __init__(self, *args, **kwargs):
        self.turn_card_sections = []    

    def final_answer(self, author: str, text: str):
        self.add_section(section=self.build_section(author=author, text=text, widgets=[]))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        return self.add_section(section=self.build_section(
            author=snake_to_user_readable(name),
            text=f"Working on **{author}**'s request...",
            widgets=[],
            final=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        self.update_section(
            index=output_id,
            section=self.build_section(
                author=snake_to_user_readable(name),
                text="",
                widgets=get_agent_response_widgets(name=name, response=response)
            )
        )

    def extract_content_from_input(self, input) -> dict:
        # Return AI contents with text part which is always present
        return { "role": "user", "parts": [{ "text": input }] }
    
    def add_section(self, section) -> int:
        print(f"Adding section...")
        self.turn_card_sections.append(section)
        return len(self.turn_card_sections) - 1
    
    def update_section(self, index: int, section):
        print(f"Updating section...")
        self.turn_card_sections[index] = section
        
    def get_answer_sections(self) -> list:
        return self.turn_card_sections[::-1]

    def build_section(self, author="Agent", text="", widgets=[], final=True) -> dict:
        emoji = get_author_emoji(author)
        displayedText = f"{emoji} *{author}*{f'\n\n{text}' if text else ' ✅'}"
        # TODO: "text_syntax": 'MARKDOWN'
        textWidgets = [{ "text_paragraph": { "text": displayedText }}]
        return { "widgets": textWidgets + widgets + (create_status_accessory_widgets() if final is False else []) }
