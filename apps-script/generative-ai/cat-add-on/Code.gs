/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// --- Add-on Entry Points ---

/**
 * Returns the add-on's homepage card.
 *
 * @param {GoogleAppsScript.Addons.EventObject} e The event object.
 * @returns {GoogleAppsScript.Card_Service.Card} The constructed Card object.
 */
function onHomepage(e) {
  // Calls the card builder function defined in CardBuilder.js
  return createCatCard();
}

/**
 * Handles the button click action to refresh the card with a new cat image.
 *
 * @param {GoogleAppsScript.Addons.EventObject} e The event object.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} The action response to update the card.
 */
function updateCatImage(e) {
  // Re-run the function that generates the new image and builds the card.
  const updatedCard = createCatCard();

  // Create an ActionResponse to push the new card to the user's interface.
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(updatedCard))
    .build();
}

// NOTE: This function needs access to the global constants defined in Configuration.gs

/**
 * Creates a card with an AI-generated cat image and a refresh button.
 *
 * @returns {GoogleAppsScript.Card_Service.Card} The card object.
 */
function createCatCard() {
  // Calls the API function defined in VertexAI.js
  const imageDataUri = generateImage(IMAGE_PROMPT);

  // Define the action to be taken when the button is clicked
  // Calls the function defined in Code.gs
  const updateAction = CardService.newAction()
    .setFunctionName('updateCatImage');

  // Create the "Generate New Cat" button
  const button = CardService.newTextButton()
    .setText('Generate New Cat 🐈')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(updateAction);

  // Create the image widget using the generated Data URI
  const imageWidget = CardService.newImage()
    .setImageUrl(imageDataUri)
    .setAltText('An AI-generated cat');

  // Build the card structure
  const header = CardService.newCardHeader().setTitle('AI Generated Cat');
  const section = CardService.newCardSection()
    .addWidget(imageWidget)
    .addWidget(button);

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}
