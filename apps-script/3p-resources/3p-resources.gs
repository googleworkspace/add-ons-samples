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
* Entry point for a support case link preview
*
* @param {!Object} event
* @return {!Card}
*/
// Creates a function that passes an event object as a parameter.
function caseLinkPreview(event) {

  // If the event object URL matches a specified pattern for support case links.
  if (event.docs.matchedUrl.url) {

    // Uses the event object to parse the URL and identify the case ID.
    const segments = event.docs.matchedUrl.url.split('/');
    const caseDetails = JSON.parse(decodeURIComponent(segments[segments.length - 1]));

    // Builds a preview card with the case ID, title, and description
    const caseHeader = CardService.newCardHeader()
      .setTitle(`Case: ${caseDetails.name}`);
    const caseDescription = CardService.newTextParagraph()
      .setText(caseDetails.description);

    // Returns the card.
    // Uses the text from the card's header for the title of the smart chip.
    return CardService.newCardBuilder()
      .setHeader(caseHeader)
      .addSection(CardService.newCardSection().addWidget(caseDescription))
      .build();
  }
}

// [END add_ons_case_preview_link]
// [START add_ons_people_preview_link]

/**
* Entry point for an employee profile link preview
*
* @param {!Object} event
* @return {!Card}
*/
function peopleLinkPreview(event) {

  // If the event object URL matches a specified pattern for employee profile links.
  if (event.docs.matchedUrl.url) {

    // Builds a preview card with an employee's name, title, email, and profile photo.
    const userHeader = CardService.newCardHeader().setTitle("Rosario Cruz");
    const userImage = CardService.newImage()
      .setImageUrl("https://developers.google.com/workspace/add-ons/images/employee-profile.png");
    const userInfo = CardService.newDecoratedText()
      .setText("rosario@example.com")
      .setBottomLabel("Case Manager")
      .setIcon(CardService.Icon.EMAIL);
    const userSection = CardService.newCardSection()
      .addWidget(userImage)
      .addWidget(userInfo);

    // Returns the card. Uses the text from the card's header for the title of the smart chip.
    return CardService.newCardBuilder()
      .setHeader(userHeader)
      .addSection(userSection)
      .build();
  }
}

// [END add_ons_people_preview_link]
// [END add_ons_preview_link]

// [START add_ons_3p_resources]
// [START add_ons_3p_resources_create_case_card]

/**
 * Produces a support case creation form.
 * 
 * @param {!Object} event The event object.
 * @param {!Object=} errors An optional map of per-field error messages.
 * @param {boolean} isUpdate Whether to return the form as an updateCard navigation.
 * @return {!Card|!ActionResponse}
 */
function createCaseInputCard(event, errors, isUpdate) {

  const cardHeader1 = CardService.newCardHeader()
    .setTitle('Create a support case')

  const cardSection1TextInput1 = CardService.newTextInput()
    .setFieldName('name')
    .setTitle('Name')
    .setMultiline(false);

  const cardSection1TextInput2 = CardService.newTextInput()
    .setFieldName('description')
    .setTitle('Description')
    .setMultiline(true);

  const cardSection1SelectionInput1 = CardService.newSelectionInput()
    .setFieldName('priority')
    .setTitle('Priority')
    .setType(CardService.SelectionInputType.DROPDOWN)
    .addItem('P0', 'P0', false)
    .addItem('P1', 'P1', false)
    .addItem('P2', 'P2', false)
    .addItem('P3', 'P3', false);

  const cardSection1SelectionInput2 = CardService.newSelectionInput()
    .setFieldName('impact')
    .setTitle('Impact')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Blocks a critical customer operation', 'Blocks a critical customer operation', false);

  const cardSection1ButtonList1Button1Action1 = CardService.newAction()
    .setPersistValues(true)
    .setFunctionName('submitCaseCreationForm')
    .setParameters({});

  const cardSection1ButtonList1Button1 = CardService.newTextButton()
    .setText('Create')
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setOnClickAction(cardSection1ButtonList1Button1Action1);

  const cardSection1ButtonList1 = CardService.newButtonSet()
    .addButton(cardSection1ButtonList1Button1);

  // Builds the creation form and adds error text for invalid inputs.
  const cardSection1 = CardService.newCardSection();
  if (errors?.name) {
    cardSection1.addWidget(createErrorTextParagraph(errors.name));
  }
  cardSection1.addWidget(cardSection1TextInput1);
  if (errors?.description) {
    cardSection1.addWidget(createErrorTextParagraph(errors.description));
  }
  cardSection1.addWidget(cardSection1TextInput2);
  if (errors?.priority) {
    cardSection1.addWidget(createErrorTextParagraph(errors.priority));
  }
  cardSection1.addWidget(cardSection1SelectionInput1);
  if (errors?.impact) {
    cardSection1.addWidget(createErrorTextParagraph(errors.impact));
  }

  cardSection1.addWidget(cardSection1SelectionInput2);
  cardSection1.addWidget(cardSection1ButtonList1);

  const card = CardService.newCardBuilder()
    .setHeader(cardHeader1)
    .addSection(cardSection1)
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
 * Called when the creation form is submitted. If form input is valid, returns a render action
 * that inserts a new link into the document. If invalid, returns an updateCard navigation that
 * re-renders the creation form with error messages.
 * 
 * @param {!Object} event The event object containing form inputs.
 * @return {!Card|!RenderAction}
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
    const title = caseDetails.name;
    const url = 'https://example.com/support/cases/' + encodeURIComponent(JSON.stringify(caseDetails));
    return createLinkRenderAction(title, url);
  }
}

// [END add_ons_3p_resources_submit_create_case]
// [START add_ons_3p_resources_validate_inputs]

/**
 * Validates form inputs for case creation.
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
  if (caseDetails.impact && caseDetails.priority === 'P2' || caseDetails.impact && caseDetails.priority === 'P3') {
    errors.impact = 'If an issue blocks a critical customer operation, priority must be P0 or P1';
  }

  return errors;
}

/**
 * Returns a TextParagraph with red text indicating a form field validation error.
 * 
 * @param {string} errorMessage A description of the invalid input.
 * @return {!TextParagraph}
 */
function createErrorTextParagraph(errorMessage) {
  return CardService.newTextParagraph()
    .setText('<font color=\"#BA0300\"><b>Error:</b> ' + errorMessage + '</font>');
}

// [END add_ons_3p_resources_validate_inputs]
// [START add_ons_3p_resources_link_render_action]

/**
 * Returns a RenderAction that inserts a link into the document.
 * @param {string} title The title of the link to insert.
 * @param {string} url The URL of the link to insert.
 * @return {!RenderAction}
 */
function createLinkRenderAction(title, url) {
  return {
    renderActions: {
      action: {
        links: [{ title, url }]
      }
    }
  };
}

// [END add_ons_3p_resources_link_render_action]
// [END add_ons_3p_resources]