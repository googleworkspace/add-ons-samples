# Copyright 2024 Google LLC
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
# [START add_ons_3p_resources]

from typing import Any, Mapping
from urllib.parse import urlparse

import os
import json
import flask
import functions_framework


@functions_framework.http
def create_3p_resources(req: flask.Request):
    """Responds to any HTTP request related to 3P resource creations.
    Args:
      req: HTTP request context.
    Returns:
      The response object.
    """
    event = req.get_json(silent=True)
    parameters = event["commonEventObject"]["parameters"] if "parameters" in event["commonEventObject"] else None
    if parameters is not None and parameters["submitCaseCreationForm"]:
        return submit_case_creation_form(event)
    else:
        return create_case_input_card(event)


# [START add_ons_3p_resources_create_case_card]


def create_case_input_card(event, errors = {}, isUpdate = False):
    """A support case link preview.
    Args:
      event: The event object.
      errors: An optional dict of per-field error messages.
      isUpdate: Whether to return the form as an updateCard navigation.
    Returns:
      A card or an action reponse.
    """
    card_header1 = {
        "title": "Create a support case"
    }

    card_section1_text_input1 = {
        "textInput": {
            "name": "name",
            "label": "Name"
        }
    }

    card_section1_text_input2 = {
        "textInput": {
            "name": "description",
            "label": "Description",
            "type": "MULTIPLE_LINE"
        }
    }

    card_section1_selection_input1 = {
        "selectionInput": {
            "name": "priority",
            "label": "Priority",
            "type": "DROPDOWN",
            "items": [{
                "text": "P0",
                "value": "P0"
            }, {
                "text": "P1",
                "value": "P1"
            }, {
                "text": "P2",
                "value": "P2"
            }, {
                "text": "P3",
                "value": "P3"
            }]
        }
    }
    
    card_section1_selection_input2 = {
        "selectionInput": {
            "name": "impact",
            "label": "Impact",
            "items": [{
                "text": "Blocks a critical customer operation",
                "value": "Blocks a critical customer operation"
            }]
        }
    }

    card_section1_button_list1_button1_action1 = {
        "function": os.environ["URL"],
        "parameters": [
        {
            "key": "submitCaseCreationForm",
            "value": True
        }
        ],
        "persistValues": True
    }

    card_section1_button_list1_button1 = {
        "text": "Create",
        "onClick": {
            "action": card_section1_button_list1_button1_action1
        }
    }

    card_section1_button_list1 = {
        "buttonList": {
            "buttons": [card_section1_button_list1_button1]
        }
    }

    # Builds the creation form and adds error text for invalid inputs.
    card_section1 = []
    if "name" in errors:
        card_section1.append(create_error_text_paragraph(errors["name"]))
    card_section1.append(card_section1_text_input1)
    if "description" in errors:
        card_section1.append(create_error_text_paragraph(errors["description"]))
    card_section1.append(card_section1_text_input2)
    if "priority" in errors:
        card_section1.append(create_error_text_paragraph(errors["priority"]))
    card_section1.append(card_section1_selection_input1)
    if "impact" in errors:
        card_section1.append(create_error_text_paragraph(errors["impact"]))

    card_section1.append(card_section1_selection_input2)
    card_section1.append(card_section1_button_list1)

    card = {
        "header": card_header1,
        "sections": [{
            "widgets": card_section1
        }]
    }

    if isUpdate:
        return {
            "renderActions": {
                "action": {
                        "navigations": [{
                        "updateCard": card
                    }]
                }
            }
        }
    else:
        return {
            "action": {
                "navigations": [{
                    "pushCard": card
                }]
            }
        }


# [END add_ons_3p_resources_create_case_card]
# [START add_ons_3p_resources_submit_create_case]


def submit_case_creation_form(event):
    """Called when the creation form is submitted.
    
    If form input is valid, returns a render action that inserts a new link
    into the document. If invalid, returns an updateCard navigation that
    re-renders the creation form with error messages.
    Args:
      event: The event object.
    Returns:
      A card or an action reponse.
    """
    formInputs = event["commonEventObject"]["formInputs"] if "formInputs" in event["commonEventObject"] else None
    case_details = {
        "name":  None,
        "description": None,
        "priority": None,
        "impact": None,
    }
    if formInputs is not None:
        case_details["name"] = formInputs["name"]["stringInputs"]["value"][0] if "name" in formInputs else None
        case_details["description"] = formInputs["description"]["stringInputs"]["value"][0] if "description" in formInputs else None
        case_details["priority"] = formInputs["priority"]["stringInputs"]["value"][0] if "priority" in formInputs else None
        case_details["impact"] = formInputs["impact"]["stringInputs"]["value"][0] if "impact" in formInputs else None

    errors = validate_form_inputs(case_details)
    if len(errors) > 0:
        return create_case_input_card(event, errors, True) # Update mode
    else:
        title = f'Case {case_details["name"]}'
        url = "https://example.com/support/cases/" + json.dumps(case_details, separators=(',', ':'))
        return create_link_render_action(title, url)

# [END add_ons_3p_resources_submit_create_case]
# [START add_ons_3p_resources_validate_inputs]

def validate_form_inputs(case_details):
    """Validates form inputs for case creation.
    Args:
      case_details: The values of each form input submitted by the user.
    Returns:
      A dict from field name to error message. An empty object represents a valid form submission.
    """
    errors = {}
    if case_details["name"] is None:
        errors["name"] = "You must provide a name"
    if case_details["description"] is None:
        errors["description"] = "You must provide a description"
    if case_details["priority"] is None:
        errors["priority"] = "You must provide a priority"
    if case_details["impact"] is not None and case_details["priority"] not in ['P0', 'P1']:
        errors["impact"] = "If an issue blocks a critical customer operation, priority must be P0 or P1"
    return errors

def create_error_text_paragraph(error_message):
    """Returns a text paragraph with red text indicating a form field validation error.
    Args:
      error_essage: A description of the invalid input.
    Returns:
      A text paragraph.
    """
    return {
        "textParagraph": {
            "text": '<font color=\"#BA0300\"><b>Error:</b> ' + error_message + '</font>'
        }
    }

# [END add_ons_3p_resources_validate_inputs]
# [START add_ons_3p_resources_link_render_action]

def create_link_render_action(title, url):
    """Returns a render action that inserts a link into the document.
    Args:
      title: The title of the link to insert.
      url: The URL of the link to insert.
    Returns:
      A render action.
    """
    return {
        "renderActions": {
            "action": {
                "links": [{
                    "title": title,
                    "url": url
                }]
            }
        }
    }

# [END add_ons_3p_resources_link_render_action]
# [END add_ons_3p_resources]
