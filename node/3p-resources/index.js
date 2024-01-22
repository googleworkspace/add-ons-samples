/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START add_ons_preview_link]

/**
 * Responds to any HTTP request related to link previews.
 *
 * @param {Object} req An HTTP request context.
 * @param {Object} res An HTTP response context.
 */
exports.createLinkPreview = (req, res) => {
  const event = req.body;
  if (event.docs.matchedUrl.url) {
    const url = event.docs.matchedUrl.url;
    const parsedUrl = new URL(url);
    // If the event object URL matches a specified pattern for preview links.
    if (parsedUrl.hostname === 'example.com') {
      if (parsedUrl.pathname.startsWith('/support/cases/')) {
        return res.json(caseLinkPreview(parsedUrl));
      }

      if (parsedUrl.pathname.startsWith('/people/')) {
        return res.json(peopleLinkPreview());
      }
    }
  }
};

// [START add_ons_case_preview_link]

/**
 * 
 * A support case link preview.
 *
 * @param {!URL} url The event object.
 * @return {!Card} The resulting preview link card.
 */
function caseLinkPreview(url) {
  // Builds a preview card with the case name, and description
  // Uses the text from the card's header for the title of the smart chip.
  // Parses the URL and identify the case details.
  const name = `Case ${url.searchParams.get("name")}`;
  return {
    action: {
      linkPreview: {
        title: name,
        previewCard: {
          header: {
            title: name
          },
          sections: [{
            widgets: [{
              textParagraph: {
                text: url.searchParams.get("description")
              }
            }]
          }]
        }
      }
    }
  };
}

// [END add_ons_case_preview_link]
// [START add_ons_people_preview_link]

/**
 * An employee profile link preview.
 *
 * @param {!URL} url The event object.
 * @return {!Card} The resulting preview link card.
 */
function peopleLinkPreview() {
  // Builds a preview card with an employee's name, title, email, and profile photo.
  // Uses the text from the card's header for the title of the smart chip.
  return {
    action: {
      linkPreview: {
        title: "Rosario Cruz",
        previewCard: {
          header: {
            title: "Rosario Cruz"
          },
          sections: [{
            widgets: [
              {
                image: {
                  imageUrl: 'https://developers.google.com/workspace/add-ons/images/employee-profile.png'
                }
              }, {
                decoratedText: {
                  startIcon: {
                    knownIcon: "EMAIL"
                  },
                  text: "rosario@example.com",
                  bottomLabel: "Case Manager"
                }
              }
            ]
          }]
        }
      }
    }
  };
}

// [END add_ons_people_preview_link]
// [END add_ons_preview_link]

// [START add_ons_3p_resources]

/**
 * Responds to any HTTP request related to 3P resource creations.
 *
 * @param {Object} req An HTTP request context.
 * @param {Object} res An HTTP response context.
 */
exports.create3pResources = (req, res) => {
  const event = req.body;
  if (event.commonEventObject.parameters?.submitCaseCreationForm) {
    res.json(submitCaseCreationForm(event));
  } else {
    res.json(createCaseInputCard(event));
  }
};

// [START add_ons_3p_resources_create_case_card]

/**
 * Produces a support case creation form card.
 * 
 * @param {!Object} event The event object.
 * @param {!Object=} errors An optional map of per-field error messages.
 * @param {boolean} isUpdate Whether to return the form as an update card navigation.
 * @return {!Card|!ActionResponse} The resulting card or action response.
 */
function createCaseInputCard(event, errors, isUpdate) {

  const cardHeader1 = {
    title: "Create a support case"
  };

  const cardSection1TextInput1 = {
    textInput: {
      name: "name",
      label: "Name"
    }
  };

  const cardSection1TextInput2 = {
    textInput: {
      name: "description",
      label: "Description",
      type: "MULTIPLE_LINE"
    }
  };

  const cardSection1SelectionInput1 = {
    selectionInput: {
      name: "priority",
      label: "Priority",
      type: "DROPDOWN",
      items: [{
        text: "P0",
        value: "P0"
      }, {
        text: "P1",
        value: "P1"
      }, {
        text: "P2",
        value: "P2"
      }, {
        text: "P3",
        value: "P3"
      }]
    }
  };
  
  const cardSection1SelectionInput2 = {
    selectionInput: {
      name: "impact",
      label: "Impact",
      items: [{
        text: "Blocks a critical customer operation",
        value: "Blocks a critical customer operation"
      }]
    }
  };

  const cardSection1ButtonList1Button1Action1 = {
    function: process.env.URL,
    parameters: [
      {
        key: "submitCaseCreationForm",
        value: true
      }
    ],
    persistValues: true
  };
  
  const cardSection1ButtonList1Button1 = {
    text: "Create",
    onClick: {
      action: cardSection1ButtonList1Button1Action1
    }
  };
  
  const cardSection1ButtonList1 = {
    buttonList: {
      buttons: [cardSection1ButtonList1Button1]
    }
  };

  // Builds the creation form and adds error text for invalid inputs.
  const cardSection1 = [];
  if (errors?.name) {
    cardSection1.push(createErrorTextParagraph(errors.name));
  }
  cardSection1.push(cardSection1TextInput1);
  if (errors?.description) {
    cardSection1.push(createErrorTextParagraph(errors.description));
  }
  cardSection1.push(cardSection1TextInput2);
  if (errors?.priority) {
    cardSection1.push(createErrorTextParagraph(errors.priority));
  }
  cardSection1.push(cardSection1SelectionInput1);
  if (errors?.impact) {
    cardSection1.push(createErrorTextParagraph(errors.impact));
  }

  cardSection1.push(cardSection1SelectionInput2);
  cardSection1.push(cardSection1ButtonList1);

  const card = {
    header: cardHeader1,
    sections: [{
      widgets: cardSection1
    }]
  };
  
  if (isUpdate) {
    return {
      renderActions: {
        action: {
          navigations: [{
            updateCard: card
          }]
        }
      }
    };
  } else {
    return {
      action: {
        navigations: [{
          pushCard: card
        }]
      }
    };
  }
}

// [END add_ons_3p_resources_create_case_card]
// [START add_ons_3p_resources_submit_create_case]

/**
 * Submits the creation form. If valid, returns a render action
 * that inserts a new link into the document. If invalid, returns an
 * update card navigation that re-renders the creation form with error messages.
 * 
 * @param {!Object} event The event object with form input values.
 * @return {!ActionResponse|!SubmitFormResponse} The resulting response.
 */
function submitCaseCreationForm(event) {
  const caseDetails = {
    name: event.commonEventObject.formInputs?.name?.stringInputs?.value[0],
    description: event.commonEventObject.formInputs?.description?.stringInputs?.value[0],
    priority: event.commonEventObject.formInputs?.priority?.stringInputs?.value[0],
    impact: !!event.commonEventObject.formInputs?.impact?.stringInputs?.value[0],
  };

  const errors = validateFormInputs(caseDetails);
  if (Object.keys(errors).length > 0) {
    return createCaseInputCard(event, errors, /* isUpdate= */ true);
  } else {
    const title = `Case ${caseDetails.name}`;
    // Adds the case details as parameters to the generated link URL.
    const url = new URL('https://example.com/support/cases/');
    for (const [key, value] of Object.entries(caseDetails)) {
      url.searchParams.append(key, value);
    }
    return createLinkRenderAction(title, url.href);
  }
}

// [END add_ons_3p_resources_submit_create_case]
// [START add_ons_3p_resources_validate_inputs]

/**
 * Validates case creation form input values.
 * 
 * @param {!Object} caseDetails The values of each form input submitted by the user.
 * @return {!Object} A map from field name to error message. An empty object
 *     represents a valid form submission.
 */
function validateFormInputs(caseDetails) {
  const errors = {};
  if (caseDetails.name === undefined) {
    errors.name = 'You must provide a name';
  }
  if (caseDetails.description === undefined) {
    errors.description = 'You must provide a description';
  }
  if (caseDetails.priority === undefined) {
    errors.priority = 'You must provide a priority';
  }
  if (caseDetails.impact && !(['P0', 'P1']).includes(caseDetails.priority)) {
    errors.impact = 'If an issue blocks a critical customer operation, priority must be P0 or P1';
  }

  return errors;
}

/**
 * Returns a text paragraph with red text indicating a form field validation error.
 * 
 * @param {string} errorMessage A description of input value error.
 * @return {!TextParagraph} The resulting text paragraph.
 */
function createErrorTextParagraph(errorMessage) {
  return {
    textParagraph: {
      text: '<font color=\"#BA0300\"><b>Error:</b> ' + errorMessage + '</font>'
    }
  }
}

// [END add_ons_3p_resources_validate_inputs]
// [START add_ons_3p_resources_link_render_action]

/**
 * Returns a submit form response that inserts a link into the document.
 * 
 * @param {string} title The title of the link to insert.
 * @param {string} url The URL of the link to insert.
 * @return {!SubmitFormResponse} The resulting submit form response.
 */
function createLinkRenderAction(title, url) {
  return {
    renderActions: {
      action: {
        links: [{
          title: title,
          url: url
        }]
      }
    }
  };
}

// [END add_ons_3p_resources_link_render_action]
// [END add_ons_3p_resources]
