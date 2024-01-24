# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License")
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# [START add_ons_preview_link]

from typing import Any, Mapping
from urllib.parse import urlparse, parse_qs

import flask
import functions_framework


@functions_framework.http
def create_link_preview(req: flask.Request):
    """Responds to any HTTP request related to link previews.
    Args:
      req: An HTTP request context.
    Returns:
      An HTTP response context.
    """
    event = req.get_json(silent=True)
    if event["docs"]["matchedUrl"]["url"]:
        url = event["docs"]["matchedUrl"]["url"]
        parsed_url = urlparse(url)
        # If the event object URL matches a specified pattern for preview links.
        if parsed_url.hostname == "example.com":
            if parsed_url.path.startswith("/support/cases/"):
                return case_link_preview(parsed_url)

    return {}


# [START add_ons_case_preview_link]


def case_link_preview(url):
    """A support case link preview.
    Args:
      url: A matching URL.
    Returns:
      The resulting preview link card.
    """

    # Parses the URL and identify the case details.
    query_string = parse_qs(url.query)
    name = f'Case {query_string["name"][0]}'
    # Uses the text from the card's header for the title of the smart chip.
    return {
        "action": {
            "linkPreview": {
                "title": name,
                "previewCard": {
                    "header": {
                        "title": name
                    },
                    "sections": [{
                        "widgets": [{
                            "textParagraph": {
                                "text": query_string["description"][0]
                            }
                        }]
                    }],
                }
            }
        }
    }


# [END add_ons_case_preview_link]
# [END add_ons_preview_link]
