// Copyright 2020 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Callback for rendering the card for a specific Gmail message.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onGmailMessage(e) {
  console.log(e);
  // Get the ID of the message the user has open.
  const messageId = e.gmail.messageId;

  // Get an access token scoped to the current message and use it for GmailApp
  // calls.
  const accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  // Get the subject of the email.
  const message = GmailApp.getMessageById(messageId);
  let subject = message.getThread().getFirstMessageSubject();

  // Remove labels and prefixes.
  subject = subject
      .replace(/^([rR][eE]|[fF][wW][dD])\:\s*/, '')
      .replace(/^\[.*?\]\s*/, '');

  // If neccessary, truncate the subject to fit in the image.
  subject = truncate(subject);

  return createCatCard(subject);
}

/**
 * Callback for rendering the card for the compose action dialog.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onGmailCompose(e) {
  console.log(e);
  const header = CardService.newCardHeader()
      .setTitle('Insert cat')
      .setSubtitle('Add a custom cat image to your email message.');
  // Create text input for entering the cat's message.
  const input = CardService.newTextInput()
      .setFieldName('text')
      .setTitle('Caption')
      .setHint('What do you want the cat to say?');
  // Create a button that inserts the cat image when pressed.
  const action = CardService.newAction()
      .setFunctionName('onGmailInsertCat');
  const button = CardService.newTextButton()
      .setText('Insert cat')
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  const buttonSet = CardService.newButtonSet()
      .addButton(button);
  // Assemble the widgets and return the card.
  const section = CardService.newCardSection()
      .addWidget(input)
      .addWidget(buttonSet);
  const card = CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section);
  return card.build();
}

/**
 * Callback for inserting a cat into the Gmail draft.
 * @param {Object} e The event object.
 * @return {CardService.UpdateDraftActionResponse} The draft update response.
 */
function onGmailInsertCat(e) {
  console.log(e);
  // Get the text that was entered by the user.
  const text = e.formInput.text;
  // Use the "Cat as a service" API to get the cat image. Add a "time" URL
  // parameter to act as a cache buster.
  const now = new Date();
  let imageUrl = 'https://cataas.com/cat';
  if (text) {
    // Replace formward slashes in the text, as they break the CataaS API.
    const caption = text.replace(/\//g, ' ');
    imageUrl += Utilities.formatString('/says/%s?time=%s',
        encodeURIComponent(caption), now.getTime());
  }
  const imageHtmlContent = '<img style="display: block; max-height: 300px;" src="' +
      imageUrl + '"/>';
  const response = CardService.newUpdateDraftActionResponseBuilder()
      .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
          .addUpdateContent(imageHtmlContent, CardService.ContentType.MUTABLE_HTML)
          .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
      .build();
  return response;
}

