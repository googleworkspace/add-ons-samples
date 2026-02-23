// Copyright 2026 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Triggered when the user opens the Gmail Add-on or selects an email.
function onAddonEvent(event) {
  // If this was triggered by a button click, handle it
  if (event.parameters && event.parameters.action === 'send') {
    return handleSendMessage(event);
  }

  // Otherwise, just render the default initial sidebar
  return createSidebarCard();
}

// Creates the standard Gmail sidebar card consisting of a text input and send button.
// Optionally includes an answer section if a response was generated.
function createSidebarCard(optionalAnswerSection) {
  const card = CardService.newCardBuilder();
  const actionSection = CardService.newCardSection();

  // Create text input for the user's message
  const messageInput = CardService.newTextInput()
    .setFieldName("message")
    .setTitle("Message")
    .setMultiline(true);

  // Create action for sending the message
  const sendAction = CardService.newAction()
    .setFunctionName('onAddonEvent')
    .setParameters({ 'action': 'send' });

  const sendButton = CardService.newTextButton()
    .setText("Send message")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(sendAction);

  actionSection.addWidget(messageInput);
  actionSection.addWidget(CardService.newButtonSet().addButton(sendButton));

  card.addSection(actionSection);

  // Attach the response at the bottom if we have one
  if (optionalAnswerSection) {
    card.addSection(optionalAnswerSection);
  }

  return card.build();
}

// Handles clicks from the Send message button.
function handleSendMessage(event) {
  const commonEventObject = event.commonEventObject || {};
  const formInputs = commonEventObject.formInputs || {};
  const messageInput = formInputs.message;

  let userMessage = "";
  if (messageInput && messageInput.stringInputs && messageInput.stringInputs.value.length > 0) {
    userMessage = messageInput.stringInputs.value[0];
  }

  if (!userMessage || userMessage.trim().length === 0) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Please enter a message."))
      .build();
  }

  let finalQueryText = `USER MESSAGE TO ANSWER: ${userMessage}`;

  // If we have an email selected in Gmail, append its content as context
  if (event.gmail && event.gmail.messageId) {
    try {
      GmailApp.setCurrentMessageAccessToken(event.gmail.accessToken);
      const message = GmailApp.getMessageById(event.gmail.messageId);

      const subject = message.getSubject();
      const bodyText = message.getPlainBody() || message.getBody();

      finalQueryText += `\n\nEMAIL THE USER HAS OPENED ON SCREEN:\nSubject: ${subject}\nBody:\n---\n${bodyText}\n---`;
    } catch (e) {
      console.error("Could not fetch Gmail context: " + e);
      // Invalidate the token explicitly so the next prompt requests the missing scopes
      ScriptApp.invalidateAuth();

      CardService.newAuthorizationException()
        .setResourceDisplayName("Enterprise AI")
        .setAuthorizationUrl(ScriptApp.getAuthorizationUrl())
        .throwException();
    }
  }

  try {
    const responseText = queryAgent({ text: finalQueryText, forceNewSession: true });

    // We leverage the 'showdown' library to parse the LLM's Markdown output into HTML
    // We also substitute markdown listings with arrows and adjust newlines for clearer rendering in the sidebar
    let displayedText = substituteListingsFromMarkdown(responseText);
    displayedText = new showdown.Converter().makeHtml(displayedText).replace(/\n/g, '\n\n');

    const textParagraph = CardService.newTextParagraph();
    textParagraph.setText(displayedText);

    const answerSection = CardService.newCardSection()
      .addWidget(textParagraph);

    const updatedCard = createSidebarCard(answerSection);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(updatedCard))
      .build();

  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error fetching response: " + err.message))
      .build();
  }
}

// Removes markdown listings (bulleted and numbered) from the given markdown text.
function substituteListingsFromMarkdown(text) {
  const pattern = /^\s*([*-+]|\d+\.)\s+/gm;
  return text.replace(pattern, '-> ');
}
