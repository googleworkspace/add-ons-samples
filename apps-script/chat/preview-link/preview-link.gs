/**
 * Copyright 2025 Google LLC.
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

/**
 * Handle messages that have links whose URLs match patterns configured
 * for link previewing.
 * 
 * - Reply with text messages that echo "text.example.com" link URLs in messages.
 * - Attach cards to messages with "support.example.com" link URLs.
 *
 * @param {Object} event The event object from Google Workspace add-on.
 * @return {Object} The action response.
 */
function onMessage(event) {
  // Stores the Google Chat event as a variable.
  const chatMessage = event.chat.messagePayload.message;

  // If the Chat app doesn't detect a link preview URL pattern, reply
  // with a text message that says so.
  if (!chatMessage.matchedUrl) {
    return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
      text: 'No matchedUrl detected.'
    }}}}};
  }

  // [START preview_links_text]
  // Reply with a text message for URLs of the subdomain "text".
  if (chatMessage.matchedUrl.url.includes("text.example.com")) {
    return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
      text: 'event.chat.messagePayload.message.matchedUrl.url: ' + chatMessage.matchedUrl.url
    }}}}};
  }
  // [END preview_links_text]

  // [START preview_links_card]
  // Attach a card to the message for URLs of the subdomain "support".
  if (chatMessage.matchedUrl.url.includes("support.example.com")) {
    // A hard-coded card is used in this example. In a real-life scenario,
    // the case information would be fetched and used to build the card.
    return { hostAppDataAction: { chatDataAction: { updateInlinePreviewAction: { cardsV2: [{
      cardId: 'attachCard',
      card: {
        header: {
          title: 'Example Customer Service Case',
          subtitle: 'Case summary',
        },
        sections: [{ widgets: [
        { decoratedText: { topLabel: 'Case ID', text: 'case123'}},
        { decoratedText: { topLabel: 'Assignee', text: 'Charlie'}},
        { decoratedText: { topLabel: 'Status', text: 'Open'}},
        { decoratedText: { topLabel: 'Subject', text: 'It won\'t turn on...' }},
        { buttonList: { buttons: [{
          text: 'OPEN CASE',
          onClick: { openLink: {
            url: 'https://support.example.com/orders/case123'
          }},
        }, {
          text: 'RESOLVE CASE',
          onClick: { openLink: {
            url: 'https://support.example.com/orders/case123?resolved=y',
          }},
        }, {
          text: 'ASSIGN TO ME',
          // Clicking this button triggers the execution of the function
          // "assign" from the Apps Script project.
          onClick: { action: { function: 'assign'}}
        }]}}
        ]}]
      }
    }]}}}};
  }
  // [END preview_links_card]
}

// [START preview_links_assign]
/**
 * Assigns and updates the card that's attached to a message with a
 * previewed link of the pattern "support.example.com".
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Action response depending on the message author.
 */
function assign(event) {
  // Creates the updated card that displays "You" for the assignee
  // and that disables the button.
  //
  // A hard-coded card is used in this example. In a real-life scenario,
  // an actual assign action would be performed before building the card.
  const message = { cardsV2: [{
    cardId: 'attachCard',
    card: {
      header: {
        title: 'Example Customer Service Case',
        subtitle: 'Case summary',
      },
      sections: [{ widgets: [
        { decoratedText: { topLabel: 'Case ID', text: 'case123'}},
        // The assignee is now "You"
        { decoratedText: { topLabel: 'Assignee', text: 'You'}},
        { decoratedText: { topLabel: 'Status', text: 'Open'}},
        { decoratedText: { topLabel: 'Subject', text: 'It won\'t turn on...' }},
        { buttonList: { buttons: [{
          text: 'OPEN CASE',
          onClick: { openLink: {
            url: 'https://support.example.com/orders/case123'
          }},
        }, {
          text: 'RESOLVE CASE',
          onClick: { openLink: {
            url: 'https://support.example.com/orders/case123?resolved=y',
          }},
        }, {
          text: 'ASSIGN TO ME',
          // The button is now disabled
          disabled: true,
          onClick: { action: { function: 'assign'}}
        }]}}
      ]}]
    }
  }]};

  // Use the adequate action response type. It depends on whether the message
  // the preview link card is attached to was created by a human or a Chat app.
  if(event.chat.buttonClickedPayload.message.sender.type === 'HUMAN') {
    return { hostAppDataAction: { chatDataAction: { updateInlinePreviewAction: message }}};
  } else {
    return { hostAppDataAction: { chatDataAction: { updateMessageAction: message }}};
  }
}
// [END preview_links_assign]
