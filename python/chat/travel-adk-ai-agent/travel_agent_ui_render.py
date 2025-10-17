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

import urllib.parse
import re
from vertex_ai import IAiAgentUiRender

class TravelAgentUiRender(IAiAgentUiRender):
    def get_author_emoji(self, author) -> str:
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
        return "🤖"

    def create_status_accessory_widgets(self, text="In progress...", materialIconName="progress_activity") -> list:
        return [{ "button_list": { "buttons": [{
            "text": text,
            "icon": { "material_icon": { "name": materialIconName}},
            "on_click": { "open_link": { "url": "https://google.com"}},
            "disabled": True
        }]}}]

    def get_agent_response_widgets(self, name: str, response):
        widgets = []
        match name:
            case "place_agent":
                # TODO: widgets = self.create_destination_widgets(response["places"])
                pass
            case "map_tool":
                # TODO: widgets = self.create_place_widgets(response["places"])
                pass
            case "google_search_grounding":
                widgets = self.create_source_widgets(response["result"])
            case _:
                pass
        return widgets

    # ------ Utility functions

    def create_destination_widgets(self, destinations=[]) -> list:
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
            
        return [{ "carousel": { "carousel_cards": carousel_cards }}]

    def create_place_widgets(self, places=[]) -> list:
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
            
        return [{ "carousel": { "carouselCards": carousel_cards }}]

    def create_source_widgets(self, text="") -> list:
        url_pattern = r'https?://\S+'
        urls = re.findall(url_pattern, text)
        if len(urls) > 0:
            sourceButtons = []
            for url in urls:
                sourceButtons.append({ "text": urllib.parse.urlparse(url).netloc, "on_click": { "open_link": { "url": url }}})
            return [{ "button_list": { "buttons": sourceButtons }}]
            
        return []
