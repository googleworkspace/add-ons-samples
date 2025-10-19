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
from google_workspace import create_message, update_message, download_chat_attachment
from vertex_ai import IAiAgentHandler, IAiAgentUiRender
from typing import Any

# Error message to display when something goes wrong
ERROR_MESSAGE = "❌ Something went wrong"

def snake_to_user_readable(snake_case_string="") -> str:
    """Converts a snake_case_string to a user-readable Title Case string."""
    return snake_case_string.replace('_', ' ').title()

class AgentCommon(IAiAgentHandler):
    """AI Agent handler implementation for non-Chat host apps."""

    # ----- IAiAgentHandler interface implementation

    def __init__(self, ui_render: IAiAgentUiRender):
        super().__init__(ui_render)
        self.turn_card_sections = []   

    def extract_content_from_input(self, input) -> dict:
        # For non-Chat host apps, the input is a simple text string
        return { "role": "user", "parts": [{ "text": input }] }
    
    def final_answer(self, author: str, text: str, success: bool, failure: bool):
        """Adds the final answer section to the turn card sections."""
        self.add_section(section=self.build_section(author=author, text=text, widgets=[], success=success, failure=failure))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        """Adds a function calling initiation section to the turn card sections."""
        return self.add_section(section=self.build_section(
            author=name,
            text=f"Working on **{snake_to_user_readable(author)}**'s request...",
            widgets=[],
            success=False,
            failure=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        """Updates the function calling section with the completion response."""
        self.update_section(
            index=output_id,
            section=self.build_section(
                author=name,
                text="",
                widgets=self.ui_render.get_agent_response_widgets(name=name, response=response),
                success=True,
                failure=False
            )
        )

    def function_calling_failure(self, name: str, output_id: str):
        """Updates the function calling section with a failure status."""
        self.update_section(
            index=output_id,
            section=self.build_section(
                author=name,
                text=ERROR_MESSAGE,
                widgets=[],
                success=False,
                failure=True
            )
        )

    # ------ Utility functions

    def add_section(self, section) -> int:
        """Adds a new section to the turn card sections and returns its index."""
        print(f"Adding section in stack...")
        self.turn_card_sections.append(section)
        return len(self.turn_card_sections) - 1
    
    def update_section(self, index: int, section):
        """Updates an existing section in the turn card sections."""
        print(f"Updating section in stack...")
        self.turn_card_sections[index] = section
        
    def get_answer_sections(self) -> list:
        """Returns the turn card sections in reverse order for display."""
        return self.turn_card_sections[::-1]

    def build_section(self, author, text, widgets, success: bool, failure: bool) -> dict:
        """Builds a card section for the given author, text, and widgets."""
        displayedText = f"{self.ui_render.get_author_emoji(author)} **{snake_to_user_readable(author)}**{f' ✅' if success else ''}{f'\n\n{text}' if text else ''}"
        textWidgets = [{ "text_paragraph": { "text": markdown.markdown(self.substitute_listings_from_markdown(displayedText)).replace('\n', '\n\n') }}]
        return { "widgets": textWidgets + widgets + ([] if success or failure else self.ui_render.create_status_accessory_widgets(text="In progress...", material_icon_name="progress_activity")) }

    def substitute_listings_from_markdown(self, markdown: str) -> str:
        """Removes markdown listings (bulleted and numbered) from the given markdown text."""
        pattern = re.compile(r'^\s*([*-+]|\d+\.)\s+', re.MULTILINE)
        return pattern.sub('-> ', markdown)

class AgentChat(IAiAgentHandler):
    """AI Agent handler implementation for Chat apps."""

    # ----- IAiAgentHandler interface implementation

    def extract_content_from_input(self, input) -> dict:
        # For Chat host apps, the input can contain text and attachments
        parts = [{ "text": input.get("text") }]
        if "attachment" in input:
            for attachment in input.get("attachment"):
                attachmentBase64Data = download_chat_attachment(attachment.get("attachmentDataRef").get("resourceName"))
                inline_data_part = { "inline_data": {
                    "mime_type": attachment.get("contentType"),
                    "data": attachmentBase64Data
                }}
                parts.append(inline_data_part)
        return { "role": "user", "parts": parts }

    def final_answer(self, author: str, text: str, success: bool, failure: bool):
        """Sends the final answer as a Chat message."""
        create_message(message=self.build_message(author=author, text=text, cards_v2=[], success=success, failure=failure))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        """Sends a function calling initiation message in Chat and returns the message name as output ID."""
        return create_message(message=self.build_message(
            author=name,
            text=f"Working on **{snake_to_user_readable(author)}**'s request...",
            cards_v2=[],
            success=False,
            failure=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        """Updates the function calling message in Chat with the completion response."""
        widgets = self.ui_render.get_agent_response_widgets(name=name, response=response)
        update_message(
            name=output_id,
            message=self.build_message(
                author=name,
                text="",
                cards_v2=self.wrap_widgets_in_cards_v2(widgets) if len(widgets) > 0 else [],
                success=True,
                failure=False
            )
        )

    def function_calling_failure(self, name: str, output_id: str):
        """Updates the function calling section with a failure status."""
        update_message(
            name=output_id,
            message=self.build_message(
                author=name,
                text=ERROR_MESSAGE,
                cards_v2=[],
                success=False,
                failure=True
            )
        )

    # ------ Utility functions

    def build_message(self, author, text, cards_v2, success: bool, failure: bool) -> dict:
        """Builds a Chat message for the given author, text, and cards_v2."""
        if text:
            cards_v2.insert(0, { "card": { "sections": [{ "widgets": [{ "text_paragraph": { "text": text.replace('\n', '\n\n'), "text_syntax": "MARKDOWN" }}]}]}})
        return {
            "text": f"{self.ui_render.get_author_emoji(author)} *{snake_to_user_readable(author)}*{f' ✅' if success else ''}",
            "cards_v2": cards_v2,
            "accessory_widgets": [] if success or failure else self.ui_render.create_status_accessory_widgets(text="In progress...", material_icon_name="progress_activity")
        }

    def wrap_widgets_in_cards_v2(self, widgets=[]) -> list:
        """Wraps the given widgets in Chat cards_v2 structure."""
        return [{ "card": { "sections": [{ "widgets": widgets }]}}]
