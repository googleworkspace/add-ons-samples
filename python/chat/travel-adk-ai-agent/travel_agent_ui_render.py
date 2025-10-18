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

import requests
import markdown
import urllib.parse
import re
from vertex_ai import IAiAgentUiRender
from env import is_in_debug_mode, NA_IMAGE_URL

class TravelAgentUiRender(IAiAgentUiRender):
    """UI render implementation for the Travel AI Agent."""

    # ----- IAiAgentUiRender interface implementation

    def ignored_authors(self) -> list:
        """Returns the list of authors to be ignored for function calling."""
        return [] if is_in_debug_mode() else ["memorize"]
    
    def get_author_emoji(self, author) -> str:
        """Returns an emoji representing the author."""
        if author == "inspiration_agent":
            return "ℹ️"
        elif author == "place_agent":
            return "📍"
        if author == "poi_agent":
            return "🗼"
        if author == "map_tool":
            return "🗺️"
        if author == "planning_agent":
            return "📅"
        if author == "memorize":
            return "🧠"
        return "🤖"

    def create_status_accessory_widgets(self, text="In progress...", materialIconName="progress_activity") -> list:
        """Creates a status accessory widget with a disabled button showing agent progress."""
        return [{ "button_list": { "buttons": [{
            "text": text,
            "icon": { "material_icon": { "name": materialIconName}},
            "on_click": { "open_link": { "url": "https://google.com"}},
            "disabled": True
        }]}}]

    def get_agent_response_widgets(self, name: str, response):
        """Returns the widgets to render for a given agent response."""
        widgets = []
        match name:
            case "poi_agent": # POISuggestions (with place_name, address, image_url)
                if self.is_chat:
                    widgets = self.create_poi_agent_widgets(response["places"])
            case "place_agent": # DestinationIdeas (with name, country, image)
                if self.is_chat:
                    widgets = self.create_place_agent_widgets(response["places"])
            case "map_tool": # POISuggestions (with map_url and place_id)
                if self.is_chat:
                    widgets = self.create_map_tool_widgets(response["places"])
            case "google_search_grounding": # Text with URLs
                widgets = self.create_google_search_grounding_widgets(response["result"])
            case "memorize": # Status
                widgets = self.create_memorize_widgets(response["status"])
            case _:
                pass
        return widgets

    # ------ Utility functions

    def create_text_paragraph(self, text):
        """Creates a text paragraph widget, handling markdown for non-chat UIs."""
        return { "text_paragraph": { "text": text, "text_syntax": "MARKDOWN" }} if self.is_chat else { "text_paragraph": { "text": markdown.markdown(text) }}

    def create_memorize_widgets(self, status=None) -> list:
        """Creates widgets for the memorize agent response."""
        if not status:
            return []
        return [self.create_text_paragraph(status)]
    
    def create_place_agent_widgets(self, destinations=[]) -> list:
        """Creates widgets for the place agent response."""
        if len(destinations) == 0:
            return []
        carousel_cards = []
        for item in destinations:
            carousel_card_widgets = []
            # Image
            image_url = item.get("image")
            if image_url:
                # Set default image if the provided image URL is valid
                carousel_card_widgets.append({ "image": { "image_url": image_url if self.is_url_image(image_url) else NA_IMAGE_URL }})
            # Text
            destination_name = item.get("name", "Unknown")
            country = item.get("country", "Unknown")
            carousel_card_widgets.append(self.create_text_paragraph(f"**{destination_name}, {country}**"))
            carousel_cards.append({ "widgets": carousel_card_widgets })
        return [{ "carousel": { "carousel_cards": carousel_cards }}]

    def create_poi_agent_widgets(self, places=[]) -> list:
        """Creates widgets for the poi agent response."""
        if len(places) == 0:
            return []
        carousel_cards = []
        for item in places:
            carousel_card_widgets = []
            footer_widgets = []
            # Image
            image_url = item.get("image_url")
            if image_url:
                # Set default image if the provided image URL is valid
                carousel_card_widgets.append({ "image": { "image_url": image_url if self.is_url_image(image_url) else NA_IMAGE_URL }})
            # Text
            carousel_card_widgets.append(self.create_text_paragraph(f"**{item.get("place_name")}**"))
            carousel_cards.append({ "widgets": carousel_card_widgets, "footer_widgets": footer_widgets })
        return [{ "carousel": { "carousel_cards": carousel_cards }}]
    
    def create_map_tool_widgets(self, places=[]) -> list:
        """Creates widgets for the map tool agent response."""
        if len(places) == 0:
            return []
        carousel_cards = []
        for item in places:
            carousel_card_widgets = []
            footer_widgets = []
            # Text
            carousel_card_widgets.append(self.create_text_paragraph(f"**{item.get("place_name")}**"))
            # Google Maps button link
            place_name = urllib.parse.quote_plus(item.get("place_name"))
            address = urllib.parse.quote_plus(item.get("address"))
            footer_widgets.append({ "button_list": { "buttons": [{ "text": "Open Maps", "on_click": { "open_link": {
                "url": f"https://www.google.com/maps/search/?api=1&query={place_name},{address}"
            }}}]}})
            carousel_cards.append({ "widgets": carousel_card_widgets, "footer_widgets": footer_widgets })
        return [{ "carousel": { "carousel_cards": carousel_cards }}]

    def create_google_search_grounding_widgets(self, text="") -> list:
        """Creates widgets for the google search grounding response."""
        # Extract URLs from the text
        url_pattern = r'https?://\S+'
        urls = re.findall(url_pattern, text)
        if len(urls) == 0:
            return []
        sourceButtons = []
        for url in urls:
            sourceButtons.append({ "text": urllib.parse.urlparse(url).netloc, "on_click": { "open_link": { "url": url }}})
        return [{ "button_list": { "buttons": sourceButtons }}]

    def is_url_image(self, image_url):
        """Checks if a given URL points to an image."""
        return requests.head(image_url).headers["content-type"] in ["image/png", "image/jpeg", "image/jpg"]
