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
// [START add_ons_case_preview_link]

/**
* Entry point for a support case link preview.
*
* @param {!Object} event The event object.
* @return {!Card} The resulting preview link card.
*/
function caseLinkPreview(event) {

  // If the event object URL matches a specified pattern for support case links.
  if (event.docs.matchedUrl.url) {

    // Uses the event object to parse the URL and identify the case details.
    const caseDetails = parseQuery(event.docs.matchedUrl.url);

    // Builds a preview card with the case name, and description
    const caseHeader = CardService.newCardHeader()
      .setTitle(`Case ${caseDetails["name"][0]}`);
    const caseDescription = CardService.newTextParagraph()
      .setText(caseDetails["description"][0]);

    // Returns the card.
    // Uses the text from the card's header for the title of the smart chip.
    return CardService.newCardBuilder()
      .setHeader(caseHeader)
      .addSection(CardService.newCardSection().addWidget(caseDescription))
      .build();
  }
}

/**
* Extracts the URL parameters from the given URL.
*
* @param {!string} url The URL to parse.
* @return {!Map} A map with the extracted URL parameters.
*/
function parseQuery(url) {
  const query = url.split("?")[1];
  if (query) {
    return query.split("&")
    .reduce(function(o, e) {
      var temp = e.split("=");
      var key = temp[0].trim();
      var value = temp[1].trim();
      value = isNaN(value) ? value : Number(value);
      if (o[key]) {
        o[key].push(value);
      } else {
        o[key] = [value];
      }
      return o;
    }, {});
  }
  return null;
}

// [END add_ons_case_preview_link]
// [END add_ons_preview_link]

// [START add_ons_3p_resources]
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

  const cardHeader = CardService.newCardHeader()
    .setTitle('Create a support case')

  const cardSectionTextInput1 = CardService.newTextInput()
    .setFieldName('name')
    .setTitle('Name')
    .setMultiline(false);

  const cardSectionTextInput2 = CardService.newTextInput()
    .setFieldName('description')
    .setTitle('Description')
    .setMultiline(true);

  const cardSectionSelectionInput1 = CardService.newSelectionInput()
    .setFieldName('priority')
    .setTitle('Priority')
    .setType(CardService.SelectionInputType.DROPDOWN)
    .addItem('P0', 'P0', false)
    .addItem('P1', 'P1', false)
    .addItem('P2', 'P2', false)
    .addItem('P3', 'P3', false);

  const cardSectionSelectionInput2 = CardService.newSelectionInput()
    .setFieldName('impact')
    .setTitle('Impact')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Blocks a critical customer operation', 'Blocks a critical customer operation', false);

  const cardSectionButtonListButtonAction = CardService.newAction()
    .setPersistValues(true)
    .setFunctionName('submitCaseCreationForm')
    .setParameters({});

  const cardSectionButtonListButton = CardService.newTextButton()
    .setText('Create')
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(cardSectionButtonListButtonAction);

  const cardSectionButtonList = CardService.newButtonSet()
    .addButton(cardSectionButtonListButton);

  // Builds the form inputs with error texts for invalid values.
  const cardSection = CardService.newCardSection();
  if (errors?.name) {
    cardSection.addWidget(createErrorTextParagraph(errors.name));
  }
  cardSection.addWidget(cardSectionTextInput1);
  if (errors?.description) {
    cardSection.addWidget(createErrorTextParagraph(errors.description));
  }
  cardSection.addWidget(cardSectionTextInput2);
  if (errors?.priority) {
    cardSection.addWidget(createErrorTextParagraph(errors.priority));
  }
  cardSection.addWidget(cardSectionSelectionInput1);
  if (errors?.impact) {
    cardSection.addWidget(createErrorTextParagraph(errors.impact));
  }

  cardSection.addWidget(cardSectionSelectionInput2);
  cardSection.addWidget(cardSectionButtonList);

  const card = CardService.newCardBuilder()
    .setHeader(cardHeader)
    .addSection(cardSection)
    .build();

  if (isUpdate) {
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  } else {
    return card;
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
    name: event.formInput.name,
    description: event.formInput.description,
    priority: event.formInput.priority,
    impact: !!event.formInput.impact,
  };

  const errors = validateFormInputs(caseDetails);
  if (Object.keys(errors).length > 0) {
    return createCaseInputCard(event, errors, /* isUpdate= */ true);
  } else {
    const title = `Case ${caseDetails.name}`;
    // Adds the case details as parameters to the generated link URL.
    const url = 'https://example.com/support/cases/?' + generateQuery(caseDetails);
    return createLinkRenderAction(title, url);
  }
}

/**
* Build a query path with URL parameters.
*
* @param {!Map} parameters A map with the URL parameters.
* @return {!string} The resulting query path.
*/
function generateQuery(parameters) {
  return Object.entries(parameters).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map(e => `${k}=${encodeURIComponent(e)}`) : `${k}=${encodeURIComponent(v)}`
  ).join("&");
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
  if (!caseDetails.name) {
    errors.name = 'You must provide a name';
  }
  if (!caseDetails.description) {
    errors.description = 'You must provide a description';
  }
  if (!caseDetails.priority) {
    errors.priority = 'You must provide a priority';
  }
  if (caseDetails.impact && caseDetails.priority !== 'P0' && caseDetails.priority !== 'P1') {
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
  return CardService.newTextParagraph()
    .setText('<font color=\"#BA0300\"><b>Error:</b> ' + errorMessage + '</font>');
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