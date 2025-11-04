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

// The main script for the project with all Google Workspace add on event callback functions

// --- The main Chat entry functions ---

// Handle incoming Google Chat message events, actions will be taken via Google Chat API calls
function onMessage(event) {
  if (isInDebugMode()) {
    console.log(`MESSAGE event received (Chat): ${JSON.stringify(event)}`);
  }
  // Extract data from the event.
  const chatEvent = event.chat;
  setChatConfig(chatEvent.messagePayload.space.name);

  // Request AI agent to answer the message and use the Chat handler and UI renderer
  requestAgent(chatEvent.user.name, chatEvent.messagePayload.message, new AgentChat(new TravelAgentUiRender(true)))
  // Respond with an empty response to the Google Chat platform to acknowledge execution
  return null; 
}

// Handles incoming Gogole Chat app command events (slash & quick commands).
function onAppCommand(event) {
  if (isInDebugMode()) {
    console.log(`APP_COMMAND event received (Chat): ${JSON.stringify(event)}`);
  }
  // Extract data from the event.
  const chatEvent = event.chat;
  setChatConfig(chatEvent.appCommandPayload.space.name);

  const appCommandMetadata = chatEvent.appCommandPayload.appCommandMetadata;
  switch (appCommandMetadata.appCommandId) {
    case RESET_SESSION_COMMAND_ID:
      // Delete session for the user
      deleteAgentSession(chatEvent.user.name);
      // Reply a Chat message with confirmation
      return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
        text: "OK, let's start from the beginning, what can I help you with?"
      }}}}};
    default:
  }
}

// --- The main Add-on entry function ---

 /**
 * Handles events from other Google Workspace applications (like Gmail) for the add-on UI.
 * Both initial card display and subsequent user interactions (buttons/form submissions) are covered.
 */
function onAddonEvent(event) {
  if (isInDebugMode()) {
    console.log(`Event received (Addon): ${JSON.stringify(event)}`);
  }

  // Extract data from the event.
  const userName = getCurrentUserName();
  console.log(`User found: ${userName}`);
  const spaceName = findChatAppDm(userName);
  console.log(`Space found: ${spaceName}`);

  // Extract contextual, host-specific input
  // Note; This could be expanded to calendar, drive, docs, sheets, slides
  const availableContext = [];
  // Fetch and add user profile context
  const person = getPersonProfile(userName.replace(USERS_PREFIX, PEOPLE_PREFIX), 'birthdays');
  availableContext.push({ id: "profile", name: "Google profile", value: person });
  if (isInDebugMode()) {
    console.log(`Person: ${person}`);
  }
  if (event.gmail) {
    // Fetch and add current email context if any
    gmailEvent = event.gmail;
    if (gmailEvent.messageId) {
        message = getEmail(gmailEvent.messageId, gmailEvent.accessToken);
        availableContext.push({ id: "email", name: "Current email", value: message });
        if (isInDebugMode()) {
          console.log(`Email: ${message.getId()}`);
        }
    } else {
      console.log("No email is currently selected");
    }
  }

  const parameters = event.parameters || {};

  // Handles the session reset action
  let resetConfirmationWidgets = [];
  const isReset = parameters.reset === 'true';
  if (isReset) {
    console.log(`Executing reset action for ${userName}...`);
    deleteAgentSession(userName);
    resetConfirmationWidgets.push(
      CardService.newTextParagraph().setText("Alright, let's start from the beginning.")
    );
  }

  // Handles the send action
  let answerSections = [];
  const isSend = parameters.send === 'true';
  if (isSend) {
    console.log(`Executing send action for ${userName}...`);

    const commonEventObject = event.commonEventObject || {};
    if (isInDebugMode()) {
      console.log(`Common event object: ${JSON.stringify(commonEventObject)}`);
    }
    const formInputs = commonEventObject.formInputs || {};
    const messageInput = formInputs.message;
    const contextInputs = formInputs.context;
    
    // Extract form input values
    let userMessage = "";
    if (messageInput && messageInput.stringInputs && messageInput.stringInputs.value.length > 0) {
      userMessage = messageInput.stringInputs.value[0];
    }
    if (userMessage.length > 0) {
      console.log("Building the AI agent request message...");
      userMessage = "USER MESSAGE TO ANSWER: " + userMessage;
      if (contextInputs && contextInputs.stringInputs && contextInputs.stringInputs.value.length > 0) {
        const selectedContexts = contextInputs.stringInputs.value;
        if (selectedContexts.includes("email")) {
          // Include email context if requested by user
          emailContents = extractEmailContents(availableContext.find(item => item.id === "email").value);
          userMessage += `\n\nEMAIL THE USER HAS OPENED ON SCREEN:\nSubject: ${emailContents.subject}\nBody:\n---\n${emailContents.bodyText}\n---`;
        }
        if (selectedContexts.includes("profile")) {
          // Include profile context if requested by user
          userMessage += `\n\nPUBLIC PROFILE OF THE USER IN JSON FORMAT: ${JSON.stringify(availableContext.find(item => item.id === "profile").value)}`;
        }
      }
      if (isInDebugMode()) {
        console.log(`Answering message: ${userMessage}...`);
      }
      // Request AI agent to answer the message and use the common handler and UI renderer
      const travelCommonAgent = new AgentCommon(new TravelAgentUiRender(false))
      requestAgent(userName, userMessage, travelCommonAgent);
      answerSections = travelCommonAgent.getAnswerSections();
    } else {
      answerSections.push(CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText("No answer because the message you sent was empty 😥")
      ));
    }
  }
  
  // Handles UI Card
  
  // Build context selection (if available)
  let contextSourcesWidget = null;
  if (availableContext.length > 0) {
    const selectionInput = CardService.newSelectionInput()
      .setTitle("Context")
      .setFieldName("context")
      .setType(CardService.SelectionInputType.SWITCH);
    availableContext.forEach(c => {
      selectionInput.addItem(c.name, c.id, false);
    });
    contextSourcesWidget = selectionInput;
  }
  
  // Build the primary section widgets
  const primaryWidgets = [];
  primaryWidgets.push(...resetConfirmationWidgets);
  primaryWidgets.push(
    CardService.newTextInput()
      .setFieldName("message")
      .setTitle("Message")
      .setMultiline(true)
  );
  if (contextSourcesWidget) {
    primaryWidgets.push(contextSourcesWidget);
  }
  
  // Build action buttons
  const sendAction = CardService.newAction()
    .setFunctionName('onAddonEvent')
    .setParameters({ 'send': 'true' });
  const resetAction = CardService.newAction()
    .setFunctionName('onAddonEvent')
    .setParameters({ 'reset': 'true' });
  primaryWidgets.push(
    CardService.newDecoratedText()
      .setButton(CardService.newTextButton()
        .setText("Send")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setMaterialIcon(CardService.newMaterialIcon().setName("send"))
        .setOnClickAction(sendAction)
      )
  );
  primaryWidgets.push(
    CardService.newDecoratedText()
      .setButton(CardService.newTextButton()
        .setText("Reset session")
        .setMaterialIcon(CardService.newMaterialIcon().setName("cleaning_services"))
        .setOnClickAction(resetAction)
      )
  );
  primaryWidgets.push(
    CardService.newDecoratedText()
      .setButton(CardService.newTextButton()
        .setText("Open Chat")
        .setIconUrl("https://www.gstatic.com/images/branding/productlogos/chat_2023q4/v2/192px.svg")
        .setOpenLink(CardService.newOpenLink()
          .setUrl(`https://chat.google.com/dm/${spaceName.replace(SPACES_PREFIX,'')}`)
        )
      )
  );

  // Build the card
  const card = CardService.newCardBuilder();
  primarySection = CardService.newCardSection();
  primaryWidgets.forEach(widget => primarySection.addWidget(widget));
  card.addSection(primarySection);
  answerSections.forEach(section => card.addSection(section));
  const builtCard = card.build();
  if (isInDebugMode()) {
    consloe.log(`Generated card: ${builtCard.printJson()}`);
  }

  if (isReset || isSend) {
    // Update existing card
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(builtCard))
      .build();
  } else {
    // Initial card render
    return builtCard;
  }
}
