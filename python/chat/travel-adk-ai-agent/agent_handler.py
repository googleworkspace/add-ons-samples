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

import markdown
import re
from chat import create_message, update_message, downloadChatAttachment
from vertex_ai import snake_to_user_readable, IAiAgentHandler, IAiAgentUiRender
from typing import Any

class AgentCommon(IAiAgentHandler):
    def __init__(self, ui_render: IAiAgentUiRender):
        super().__init__(ui_render)
        self.turn_card_sections = []   

    def extract_content_from_input(self, input) -> dict:
        # Return AI contents with text part which is always present
        return { "role": "user", "parts": [{ "text": input }] }
    
    def final_answer(self, author: str, text: str):
        self.add_section(section=self.build_section(author=author, text=text, widgets=[]))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        return self.add_section(section=self.build_section(
            author=name,
            text=f"Working on **{snake_to_user_readable(author)}**'s request...",
            widgets=[],
            final=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        self.update_section(
            index=output_id,
            section=self.build_section(
                author=name,
                text="",
                widgets=self.ui_render.get_agent_response_widgets(name=name, response=response)
            )
        )

    # ------ Utility functions

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
        displayedText = f"{self.ui_render.get_author_emoji(author)} **{snake_to_user_readable(author)}**{f' ✅' if final else ''}{f'\n\n{text}' if text else ''}"
        textWidgets = [{ "text_paragraph": { "text": markdown.markdown(self.remove_listings_from_markdown(displayedText)).replace('\n', '\n\n') }}]
        return { "widgets": textWidgets + widgets + ([] if final else self.ui_render.create_status_accessory_widgets()) }
    
    def remove_listings_from_markdown(self, markdown: str) -> str:
        pattern = re.compile(r'^\s*([*-+]|\d+\.)\s+', re.MULTILINE)
        return pattern.sub('-> ', markdown)


class AgentChat(IAiAgentHandler):
    def extract_content_from_input(self, input) -> dict:
        # Initialize with the text part which is always present
        parts = [{ "text": input.get("text") }]
        
        # Add images based on the message attachments
        if "attachment" in input:
            for attachment in input.get("attachment"):
                attachmentBase64Data = downloadChatAttachment(attachment.get("attachmentDataRef").get("resourceName"))
                inline_data_part = {
                    "inline_data": {
                        "mime_type": attachment.get("contentType"),
                        "data": attachmentBase64Data
                    }
                }
                parts.append(inline_data_part)
        
        # Return AI contents
        return { "role": "user", "parts": parts }

    def final_answer(self, author: str, text: str):
        create_message(message=self.build_message(author=author, text=text, cards_v2=[]))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        return create_message(message=self.build_message(
            author=name,
            text=f"Working on **{snake_to_user_readable(author)}**'s request...",
            cards_v2=[],
            final=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        widgets = self.ui_render.get_agent_response_widgets(name=name, response=response)
        update_message(
            name=output_id,
            message=self.build_message(
                author=name,
                text="",
                cards_v2=self.wrap_widgets_in_cards_v2(widgets) if len(widgets) > 0 else []
            )
        )

    # ------ Utility functions

    def build_message(self, author="Agent", text="", cards_v2=[], final=True) -> dict:
        if text:
            cards_v2.insert(0, { "card": { "sections": [{ "widgets": [{ "text_paragraph": { "text": markdown.markdown(text) }}]}]}})
        return {
            "text": f"{self.ui_render.get_author_emoji(author)} *{snake_to_user_readable(author)}*{f' ✅' if final else ''}",
            "cards_v2": cards_v2,
            "accessory_widgets": [] if final else self.ui_render.create_status_accessory_widgets()
        }

    def wrap_widgets_in_cards_v2(self, widgets=[]) -> list:
        return [{ "card": { "sections": [{ "widgets": widgets }]}}]
