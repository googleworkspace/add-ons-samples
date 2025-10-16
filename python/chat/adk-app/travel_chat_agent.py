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
from chat import create_message, update_message, downloadChatAttachment
from ai_agent_handler import IAiAgentHandler
from typing import Any

class TravelChatAgent(IAiAgentHandler):
    def final_answer(self, author: str, text: str):
        create_message(message=self.build_message(author=author, text=text, cards_v2=[]))

    def function_calling_initiation(self, author: str, name: str) -> Any:
        return create_message(message=self.build_message(
            author=snake_to_user_readable(name),
            text=f"Working on **{author}**'s request...",
            cards_v2=[],
            final=False
        ))

    def function_calling_completion(self, author: str, name: str, response, output_id):
        widgets = get_agent_response_widgets(name=name, response=response)
        update_message(
            name=output_id,
            message=self.build_message(
                author=snake_to_user_readable(name),
                text="",
                cards_v2=self.wrap_widgets_in_cards_v2(widgets) if len(widgets) > 0 else []
            )
        )

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

    def build_message(self, author="Agent", text="", cards_v2=[], final=True) -> dict:
        emoji = get_author_emoji(author)
        if text:
            # TODO: "text_syntax": 'MARKDOWN'
            cards_v2.insert(0, { "card": { "sections": [{ "widgets": [{ "text_paragraph": { "text": text }}]}]}})
        return {
            "text": f"{emoji} *{author}*{'' if text else ' ✅'}",
            "cards_v2": cards_v2,
            "accessory_widgets": create_status_accessory_widgets() if final is False else []
        }

    def wrap_widgets_in_cards_v2(self, widgets=[]) -> list:
        return [{ "card": { "sections": [{ "widgets": widgets }]}}]
