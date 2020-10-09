/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Callback for rendering the main card.
 * @param {Object} e - Event from add-on server
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage(e) {
  const builder = CardService.newCardBuilder();

  const numParagraphsInput = CardService.newTextInput().setTitle('Number of paragraphs')
      .setFieldName('paragraphs')
      .setHint('Enter # of paragraphs to generate')
      .setValue('1');

  const lengthInput = CardService.newSelectionInput().setTitle('Average length of paragraph')
      .setFieldName('length')
      .setType(CardService.SelectionInputType.DROPDOWN)
      .addItem('Short', 'short', true)
      .addItem('Medium', 'medium', false)
      .addItem('Long', 'long', false)
      .addItem('Very long', 'verylong', false);

  const submitAction = CardService.newAction()
      .setFunctionName('onGenerateText')
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);
  const submitButton = CardService.newTextButton()
      .setText('Generate and insert text')
      .setOnClickAction(submitAction);

  const optionsSection = CardService.newCardSection()
      .addWidget(numParagraphsInput)
      .addWidget(lengthInput)
      .addWidget(submitButton);

  builder.addSection(optionsSection);
  return builder.build();
}

/**
 * Action for generating and inserting text.
 * @param {Object} e - Event from add-on server
 * @return {CardService.ActionResponse} result of action
 */
function onGenerateText(e) {
  const options = {
    paragraphs: e.formInput.paragraphs,
    length: e.formInput.length,
  };
  let content = '';
  switch (e.hostApp) {
    case 'docs':
      const doc = DocumentApp.getActiveDocument();
      const cursor = doc.getCursor();
      if (!cursor) {
        return notify('Unable to insert text, no cursor.');
      }
      content = generateText({style: 'plaintext', ...options});
      cursor.insertText(content);
      return notify('Text inserted');
    case 'slides':
      const slides = SlidesApp.getActivePresentation();
      const textRange = slides.getSelection().getTextRange();
      if (!textRange) {
        return notify('Unable to insert text, no cursor.');
      }
      content = generateText({style: 'plaintext', ...options});
      textRange.insertText(0, content);
      return notify('Text inserted');
    case 'sheets':
      const sheets = SpreadsheetApp.getActiveSpreadsheet();
      const cell = sheets.getCurrentCell();
      if (!cell) {
        return notify('Unable to insert text, no cursor.');
      }
      content = generateText({style: 'plaintext', ...options});
      cell.setValue(content);
      return notify('Text inserted');
    case 'gmail':
      content = generateText({style: 'html', ...options});
      const updateAction = CardService.newUpdateDraftBodyAction()
          .addUpdateContent(content, CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT);
      return CardService.newUpdateDraftActionResponseBuilder()
          .setUpdateDraftBodyAction(updateAction)
          .build();
    default:
      return notify('Host app not supported.');
  }
}

/**
 * Generate placeholder text using the API at http://loripsum.net
 *
 * @param {Object|Array} options - API options to pass through.
 * @return {String} generated text to insert
 */
function generateText(options) {
  const optionValues = Object.entries(options).map(([k, v]) => v).join('/');
  const url = `https://loripsum.net/api/${optionValues}`;
  const response = UrlFetchApp.fetch(url);
  return response.getContentText();
}

/**
 * Builds an action response with a notification message only.
 *
 * @param {string} message - Message to display to user
 * @return {CardService.ActionResponse} response
 */
function notify(message) {
  const notification = CardService.newNotification().setText(message);
  return CardService.newActionResponseBuilder()
      .setNotification(notification)
      .build();
}
