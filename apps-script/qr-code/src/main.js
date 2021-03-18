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

const DATA_MAX_LENGTH = 500;
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_MIN_WIDTH = 10;

/**
 * Callback for rendering the main card.
 * @param {Object} e - Event from add-on server
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage(e) {
  const builder = CardService.newCardBuilder();

  const dataInput = CardService.newTextInput().setTitle('Data to encode')
      .setFieldName('data')
      .setHint(`Required. Up to ${DATA_MAX_LENGTH} characters`);

  const widthInput = CardService.newTextInput().setTitle('Generated image width')
      .setFieldName('width')
      .setValue('200')
      .setHint(`Required. Number between ${IMAGE_MIN_WIDTH} and ${IMAGE_MAX_WIDTH}, inclusive.`);

  const submitAction = CardService.newAction()
      .setFunctionName('onGenerateImage')
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);
  const submitButton = CardService.newTextButton()
      .setText('Generate and insert QR code')
      . setOnClickAction(submitAction);
  const optionsSection = CardService.newCardSection()
      .addWidget(dataInput)
      .addWidget(widthInput)
      .addWidget(submitButton);

  builder.addSection(optionsSection);
  return builder.build();
}

/**
 * Action for generating and inserting QR Code.
 * @param {Object} e - Event from add-on server
 * @return {CardService.ActionResponse} result of action
 */
function onGenerateImage(e) {
  const data = e.formInput.data;
  let width = e.formInput.width;

  if (!data || data.length == 0) {
    return notify('Please specify the data to encode.');
  }
  if (data.length > DATA_MAX_LENGTH) {
    return notify('Data is too long. Please limit to 500 characters.');
  }

  try {
    width = parseInt(width);
  } catch (e) {
    return notify('Width isn\'t a number.');
  }

  if (width < IMAGE_MIN_WIDTH) {
    return notify('Image width too small. Must be between 10 and 1000, inclusive.');
  }

  if (width > IMAGE_MAX_WIDTH) {
    return notify('Image width too large. Must be between 10 and 1000, inclusive.');
  }

  const imageUrl = generateQrCodeUrl(data, width);
  let image;
  switch (e.hostApp) {
    case 'docs':
      const doc = DocumentApp.getActiveDocument();
      const cursor = doc.getCursor();
      if (!cursor) {
        return notify('Unable to insert image, no cursor.');
      }
      image = UrlFetchApp.fetch(imageUrl);
      cursor.insertInlineImage(image);
      return notify('QR code inserted');
    case 'slides':
      const slides = SlidesApp.getActivePresentation();
      const page = slides.getSelection().getCurrentPage();
      if (!page) {
        return notify('Unable to insert image, no page selected.');
      }
      image = UrlFetchApp.fetch(imageUrl);
      page.insertImage(image);
      return notify('QR code inserted');
    case 'sheets':
      const sheets = SpreadsheetApp.getActiveSpreadsheet();
      const cell = sheets.getCurrentCell();
      if (!cell) {
        return notify('Unable to insert image, no cursor.');
      }
      image = UrlFetchApp.fetch(imageUrl);
      cell.getSheet().insertImage(image, cell.getColumn(), cell.getRow());
      return notify('QR code inserted');
    case 'gmail':
      const html = `<img style="display: block" src="${imageUrl}"/>`;
      const updateAction = CardService.newUpdateDraftBodyAction()
          .addUpdateContent(html, CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT);
      return CardService.newUpdateDraftActionResponseBuilder()
          .setUpdateDraftBodyAction(updateAction)
          .build();
    default:
      return notify('Host app not supported.');
  }
}

/**
 * Generate a URL for a QR code image at http://goqr.me/api/
 *
 * @param {string} data - data to encode
 * @param {number} width - image width/height
 * @return {String} url for QR code image
 */
function generateQrCodeUrl(data, width) {
  const encodedData = encodeURIComponent(data);
  const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=${width}x${width}`;
  return url;
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
