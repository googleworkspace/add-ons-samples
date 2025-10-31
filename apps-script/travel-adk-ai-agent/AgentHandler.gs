// Copyright 2025 Google LLC. All Rights Reserved.
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

const ERROR_MESSAGE = "❌ Something went wrong";

// --- AgentCommon (IAiAgentHandler for non-Chat host apps) ---

class AgentCommon extends IAiAgentHandler {
  constructor(uiRender) {
    super(uiRender);
    this.turnCardSections = [];
  }

  // --- IAiAgentHandler implementation ---

  extractContentFromInput(input) {
    return { "role": "user", "parts": [{ "text": input }] };
  }

  finalAnswer(author, text, success, failure) {
    this.addSection(this.buildSection(author, text, [], success, failure));
  }

  functionCallingInitiation(author, name) {
    return this.addSection(this.buildSection(
      name,
      `Working on **${snakeToUserReadable(author)}**'s request...`,
      [],
      false,
      false
    ));
  }

  functionCallingCompletion(author, name, response, outputId) {
    this.updateSection(outputId, this.buildSection(
      name,
      "",
      this.uiRender.getAgentResponseWidgets(name, response),
      true,
      false
    ));
  }

  functionCallingFailure(name, outputId) {
    this.updateSection(
      outputId,
      this.buildSection(name, ERROR_MESSAGE, [], false, true)
    );
  }

  // --- Utility functions ---

  addSection(section) {
    console.log("Adding section in stack...");
    this.turnCardSections.push(section);
    return this.turnCardSections.length - 1; 
  }

  updateSection(index, section) {
    console.log("Updating section in stack...");
    this.turnCardSections[index] = section;
  }

  getAnswerSections() {
    return this.turnCardSections.slice().reverse();
  }

  buildSection(author, text, widgets, success, failure) {
    let displayedText = `${this.uiRender.getAuthorEmoji(author)} **${snakeToUserReadable(author)}**${success ? ' ✅' : ''}${text ? `\n\n${text}` : ''}`;
    displayedText = markdownToHtml(this.substituteListingsFromMarkdown(displayedText)).replace(/\n/g, '\n\n');
    const textWidgets = [CardService.newTextParagraph().setText(displayedText)];
    const accessoryWidgets = success || failure ? [] : this.uiRender.createStatusAccessoryWidgets();

    const section = CardService.newCardSection();
    textWidgets.concat(widgets).concat(accessoryWidgets).forEach(widget => section.addWidget(widget));
    return section;
  }

  substituteListingsFromMarkdown(text) {
    const pattern = /^\s*([*-+]|\d+\.)\s+/gm; // 'm' for multiline
    return text.replace(pattern, '-> ');
  }
}

// --- AgentChat (IAiAgentHandler for Chat apps) ---

class AgentChat extends IAiAgentHandler {

  // --- IAiAgentHandler implementation ---

  extractContentFromInput(input) {
    const parts = [{ "text": input.text }];
    if (input.attachment && Array.isArray(input.attachment)) {
      for (const attachment of input.attachment) {
        parts.push({ "inline_data": {
          "mime_type": attachment.contentType,
          "data": downloadChatAttachment(
            attachment.attachmentDataRef.resourceName
          )
        }});
      }
    }
    return { "role": "user", "parts": parts };
  }

  finalAnswer(author, text, success, failure) {
    createMessage(this.buildMessage(author, text, [], success, failure));
  }

  functionCallingInitiation(author, name) {
    return createMessage(this.buildMessage(
        name,
        `Working on **${snakeToUserReadable(author)}**'s request...`,
        [],
        false,
        false
    ));
  }

  functionCallingCompletion(author, name, response, outputId) {
    const widgets = this.uiRender.getAgentResponseWidgets(name, response);
    updateMessage(outputId, this.buildMessage(
      name,
      "",
      [this.wrapWidgetsInCardsV2(widgets)],
      true,
      false
    ));
  }

  functionCallingFailure(name, outputId) {
    updateMessage(
      outputId,
      this.buildMessage(name, ERROR_MESSAGE, [], false, true)
    );
  }

  // --- Utility functions ---

  buildMessage(author, text, cardsV2, success, failure) {
    if (text) {
      cardsV2.unshift(this.wrapWidgetsInCardsV2([CardService.newTextParagraph().setText(text.replace(/\n/g, '\n\n'))]));
    }
    const messageBuilder = CardService.newChatResponseBuilder();
    messageBuilder.setText(`${this.uiRender.getAuthorEmoji(author)} *${snakeToUserReadable(author)}*${success ? ' ✅' : ''}`);
    cardsV2.forEach(cardV2 => { messageBuilder.addCardsV2(cardV2) });
    let message = JSON.parse(messageBuilder.build().printJson());

    // TODO: remove these workarounds after CardService fixes
    this.replaceCarouselImageTextParagrahWithImage(message);
    this.addTextSyntaxToTextParagraphs(message);
    this.addAccessoryWidgets(message, success || failure ? [] : this.uiRender.createStatusAccessoryWidgets());

    if(isInDebugMode()) {
      console.log(`Built message: ${JSON.stringify(message)}`);
    }
    return message;
  }

  wrapWidgetsInCardsV2(widgets = []) {
    const section = CardService.newCardSection();
    widgets.forEach(widget => { section.addWidget(widget) });
    return CardService.newCardWithId().setCard(CardService.newCardBuilder().addSection(section).build());
  }

  // TODO: remove this workaround when CardService can add Image widgets in CarouselCards
  replaceCarouselImageTextParagrahWithImage(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceCarouselImageTextParagrahWithImage(item));
    }
    if (obj.carouselCards && Array.isArray(obj.carouselCards)) {
      obj.carouselCards = obj.carouselCards.map(card => {
        if (card.widgets && Array.isArray(card.widgets) && card.widgets.length >= 2) {
          const firstWidget = card.widgets[0];
          if (firstWidget.textParagraph && card.widgets[1].textParagraph) {
            card.widgets[0] = { "image": { "imageUrl": firstWidget.textParagraph.text }};
          }
        }
        return this.replaceCarouselImageTextParagrahWithImage(card);
      });
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = this.replaceCarouselImageTextParagrahWithImage(obj[key]);
      }
    }
    return obj;
  }

  // TODO: remove this workaround when CardService can set textSyntax, do it directly when building text paragraphs
  addTextSyntaxToTextParagraphs(obj) {
    if (obj === null || typeof obj !== 'object') {
      return;
    }
    if (Array.isArray(obj)) {
      for (const element of obj) {
        this.addTextSyntaxToTextParagraphs(element);
      }
      return;
    }
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key === 'textParagraph') {
          const textParaObject = obj[key];
          if (textParaObject && typeof textParaObject === 'object' && !Array.isArray(textParaObject)) {
            textParaObject.textSyntax = "MARKDOWN";
          }
        }
        const value = obj[key];
        if (value && typeof value === 'object') {
          this.addTextSyntaxToTextParagraphs(value);
        }
      }
    }
  }

  // TODO: remove this workaround when CardService can set accessory widget
  addAccessoryWidgets(message, accessoryWidgets = []) {
    const section = CardService.newCardSection();
    accessoryWidgets.forEach(accessoryWidget => { section.addWidget(accessoryWidget) });
    const card = JSON.parse(CardService.newCardBuilder().addSection(section).build().printJson());
    message['accessoryWidgets'] = card.sections[0].widgets;
  }
}
