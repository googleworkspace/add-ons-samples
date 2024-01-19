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
from urllib.parse import urlparse, unquote

import flask
import functions_framework
import json


@functions_framework.http
def create_link_preview(req: flask.Request):
    """Responds to any HTTP request related to link previews.
    Args:
      req: HTTP request context.
    Returns:
      The response object.
    """
    event = req.get_json(silent=True)
    if event["docs"]["matchedUrl"]["url"]:
        url = event["docs"]["matchedUrl"]["url"]
        parsed_url = urlparse(url)
        if parsed_url.hostname == "example.com":
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

    # Parses the URL to identify the case details.
    segments = url.split("/")
    case_details = json.loads(unquote(segments[len(segments) - 1]));
    print(case_details)

    # Returns the card.
    # Uses the text from the card's header for the title of the smart chip.
    return {
        "action": {
            "linkPreview": {
                "title": f'Case {case_details["name"]}',
                "previewCard": {
                    "header": {
                        "title": f'Case {case_details["name"]}'
                    },
                    "sections": [{
                        "widgets": [{
                            "textParagraph": {
                                "text": case_details["description"]
                            }
                        }]
                    }],
                }
            }
        }
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
        "action": {
            "linkPreview": {
                "title": "Rosario Cruz",
                "previewCard": {
                    "header": {
                        "title": "Rosario Cruz"
                    },
                    "sections": [{
                        "widgets": [
                            {
                                "image": {
                                    "imageUrl": "https://developers.google.com/workspace/add-ons/images/employee-profile.png"
                                }
                            },
                            {
                                "decoratedText": {
                                    "startIcon": {
                                        "knownIcon": "EMAIL"
                                    },
                                    "text": "rosario@example.com",
                                    "bottomLabel": "Case Manager",
                                }
                            },
                        ]
                    }],
                }
            }
        }
    }


# [END add_ons_people_preview_link]
# [END add_ons_preview_link]
