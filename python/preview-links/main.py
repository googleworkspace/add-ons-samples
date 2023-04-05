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
from urllib.parse import urlparse

import flask
import functions_framework


@functions_framework.http
def create_link_preview(req: flask.Request):
    """Responds to any HTTP request.
    Args:
      req: HTTP request context.
    Returns:
      The response object.
    """
    event = req.get_json(silent=True)
    if event["docs"]["matchedUrl"]["url"]:
        return create_card(event["docs"]["matchedUrl"]["url"])


def create_card(url):
    """Creates a preview link card for either a case link or people link.
    Args:
      url: The matched url.
    Returns:
      A case link preview card or a people link preview card.
    """
    parsed_url = urlparse(url)
    if parsed_url.hostname != "www.example.com":
        return {}

    if parsed_url.path.startswith("/support/cases/"):
        return case_link_preview(url)

    if parsed_url.path.startswith("/people/"):
        return people_link_preview()

    return {}


# [START add_ons_case_preview_link]


def case_link_preview(url):
    """A support case link preview.
    Args:
      url: The case link.
    Returns:
      A case link preview card.
    """

    # Parses the URL to identify the case ID.
    segments = url.split("/")
    case_id = segments[-1]

    # Returns the card.
    # Uses the text from the card's header for the title of the smart chip.
    return {
        "header": {"title": f"Case {case_id}: Title bar is broken."},
        "sections": [
            {
                "widgets": [
                    {
                        "textParagraph": {
                            "text": "Customer can't view title on mobile device."
                        }
                    }
                ]
            }
        ],
    }


# [END add_ons_case_preview_link]
# [START add_ons_people_preview_link]


def people_link_preview():
    """An employee profile link preview.
    Returns:
      A people link preview card.
    """

    # Builds a preview card with an employee's name, title, email, and profile photo.
    # Returns the card. Uses the text from the card's header for the title of the smart chip.
    return {
        "header": {"title": "Rosario Cruz"},
        "sections": [
            {
                "widgets": [
                    {
                        "image": {
                            "imageUrl": "https:#developers.google.com/workspace/add-ons/images/employee-profile.png"
                        }
                    },
                    {
                        "keyValue": {
                            "icon": "EMAIL",
                            "content": "rosario@example.com",
                            "bottomLabel": "Case Manager",
                        }
                    },
                ]
            }
        ],
    }


# [END add_ons_people_preview_link]
# [END add_ons_preview_link]
