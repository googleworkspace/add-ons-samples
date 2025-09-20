/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createOAuth2Client } from './user-auth.js';
import { SPACES_PREFIX, EMAILS_PREFIX, DatabaseService } from './database.js';
import { v1, v1alpha, v1beta } from '@google-cloud/discoveryengine';
import { google } from 'googleapis';

const projectNumber = process.env.PROJECT_NUMBER || 'your-google-cloud-project-number';
const agentLocation = process.env.AGENT_LOCATION || 'your-agent-location';
const agentModel =  process.env.AGENT_MODEL || 'gemini-2.5-flash/answer_gen/v1';
const engineID = process.env.ENGINE_ID || 'your-engine-id';
const discoveryengineV1Alpha = v1alpha;
const discoveryengineV1 = v1;

// Chat app authentication
const credentialsChat = './credentials_chat_app.json'; 
const chatScopes = ['https://www.googleapis.com/auth/chat.bot'];

/**
 * Initializes the Discovery Engine Session Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<SessionServiceClient>} An initialized
 *     Discovery Engine Session Service client.
 */
async function initializeSessionServiceClient(userName) {
  return new discoveryengineV1Alpha.SessionServiceClient({
    authClient: await createOAuth2Client(userName)
  });
};

/**
 * Initializes the Discovery Engine Conversational Search Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<ConversationalSearchServiceClient>} An initialized
 *     Discovery Engine Conversational Search Service client.
 */
async function initializeConversationalSearchServiceClient(userName) {
  return new discoveryengineV1Alpha.ConversationalSearchServiceClient({
    authClient: await createOAuth2Client(userName)
  });
};

/**
 * Initializes the Assistant Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<AssistantServiceClient>} An initialized Asssitant Search
 *     Service client.
 */
async function initializeAssistantSearchServiceClient(userName) {
  return new discoveryengineV1.AssistantServiceClient({
    authClient: await createOAuth2Client(userName)
  });
};

/**
 * Initializes the Chat Service client with app credentials.
 * 
 * @returns {Promise<google.chat} An initialized Chat Service client.
 */
async function initializeChatServiceClient() {
  // Create Chat service client with application credentials
  const chatAuth = new google.auth.JWT({
    keyFile: credentialsChat,
    scopes: chatScopes
  });
  await chatAuth.authorize();
  return google.chat({
    version: 'v1',
    auth: chatAuth,
  });
};

/**
 * Generate a user pseudo composite ID.
 * 
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceId The ID of the space the discussion is taking place.
 * @return {Promise<string>} The generated user ID.
 */
async function getUserPseudoId(userName, spaceId) {
  // TODO: Base64 it so that we do not have to do ID processing like string replacements.
  return await DatabaseService.getUserId(userName) + "_" + spaceId.replace(SPACES_PREFIX, '').replace(EMAILS_PREFIX, '');
};

/**
 * Retrieve an Agentspace session.
 * 
 * @param {!SessionServiceClient} sessionService The Discovery Engine Session Service client
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceId The ID of the space the discussion is taking place.
 * @return {Promise<Session | null>} The session or null if not found.
 */
async function getSession(sessionService, userName, spaceId) {
  const userPseudoId = await getUserPseudoId(userName, spaceId);

  // Find sessions for the given user and space that are in progress
  const [sessions] = await sessionService.listSessions({
    parent: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/engines/${engineID}`,
    filter: `user_pseudo_id = ${userPseudoId} AND state = IN_PROGRESS`
  });
  if (sessions.length > 0) {
    // Return the first session found
    console.log('Found existing session: ' + JSON.stringify(sessions[0]));
    return sessions[0];
  }
  return null;
};

/**
 * Retrieve an Agentspace session. Create a new one if it does not exist.
 * 
 * @param {!SessionServiceClient} sessionService The Discovery Engine Session Service client
 * @param {!string} userName The resource name of the user.
 * @param {!string} spaceId The ID of the space the discussion is taking place.
 * @return {Promise<string>} The generated session's resource name.
 */
async function getOrCreateSession(sessionService, userName, spaceId) {
  const existingSession = await getSession(sessionService, userName, spaceId);
  if (existingSession != null) {
    // Return the resource name of session found
    return existingSession.name;
  }

  // Create a new session
  const userPseudoId = await getUserPseudoId(userName, spaceId);
  const [session] = await sessionService.createSession({
    parent: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/engines/${engineID}`,
    session: { userPseudoId: userPseudoId }
  });
  console.log('Created new session: ' + JSON.stringify(session));
  return session.name;
};

async function createOrUpdateChatMessage(chatClient, spaceName, messageName, answer, thoughts, lastThought, state) {
  const text = answer ? answer : '...';
  let cardsV2 = [];
  let accessoryWidgets = [];
  let lastThoughtTitle = lastThought ? extractThoughtTitle(lastThought) : undefined;
  
  switch (state) {
    case 'IN_PROGRESS':
      accessoryWidgets.push(getProgressAccessoryWidget((lastThoughtTitle ? lastThoughtTitle : 'In progress') + '...', 'progress_activity'));
      break;
    case 'FAILED':
      accessoryWidgets.push(getProgressAccessoryWidget('Failed', 'cancel'));
      break;
    case 'SUCCEEDED':
      accessoryWidgets.push(getProgressAccessoryWidget('Done', 'check'));
      break;
    case 'SKIPPED':
      accessoryWidgets.push(getProgressAccessoryWidget('Skipped', 'error'));
      break;
    default:
  }

  if(state !== 'IN_PROGRESS' && thoughts) {
    cardsV2.push({
      cardId: "thoughtsCard",
      card: { sections: [{
        header: "Thoughts",
        collapsible: true,
        widgets: [{ textParagraph: { text: transformThoguthsToChatTextParagraphFormat(thoughts)}}]
      }]}
    });
  }

  if (!messageName) {
    // Create a Chat message dedicated to the generated content
    const response = await chatClient.spaces.messages.create({
      parent: spaceName,
      requestBody: {
        text: text,
        accessoryWidgets: accessoryWidgets,
        cardsV2: cardsV2
      }
    });
    messageName = response.data.name;
  } else {
    // Update the Chat message by concatenating the response chunks
    await chatClient.spaces.messages.patch({
      name: messageName,
      updateMask: 'text,accessory_widgets,cards_v2,attachment',
      requestBody: {
        text: text,
        accessoryWidgets: accessoryWidgets,
        cardsV2: cardsV2
      }
    });
  }
  return messageName;
};

function getProgressAccessoryWidget(text, materialIconName) {
  return { buttonList: { buttons: [{
    text: text,
    icon: { materialIcon: { name: materialIconName}},
    onClick: { openLink: { url: "https://google.com"}},
    disabled: true
  }]}};
};

function extractThoughtTitle(thought) {
  const match = thought.match(/\*\*(.*?)\*\*/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
};

function transformThoguthsToChatTextParagraphFormat(thoughts) {
  const boldTransformed = thoughts.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  const newlineTransformed = boldTransformed.replace(/\n\n/g, '\n');
  return newlineTransformed;
};

/**
 * Service to generate answers using user credentials.
 */
export const AgentspaceService = {
  /**
   * Delete an Agentspace session. Do nothing if it does not exist.
   *
   * @param {!string} userName The resource name of the user.
   * @param {!string} spaceName The resource name of the chat space.
   * @return {Promise<void>}
   */
  deleteSession: async function (userName, spaceName) {
    // Create the service client with user credentials
    const sessionService = await initializeSessionServiceClient(userName);

    const session = await getSession(sessionService, userName, spaceName);
    if (session != null) {
      // Delete the first session found
      await sessionService.deleteSession({ name: session.name });
      console.log('Deleted session: ' + JSON.stringify(session));
    }
  },

  ///////////////////////////
  // Conversional Search
  ///////////////////////////

  /**
   * Generate answers using user credentials.
   *
   * @param {!string} preamble The premabule to use.
   * @param {!string} message The text message to answer.
   * @param {!string} userName The resource name of the user whose credentials
   *     will be used to call the API.
   * @param {!string} spaceId The ID of the space the discussion is taking place.
   * @param {OAuth2Client} authClient The auth client to use for access.
   * @returns {Promise<Answer>} The answer.
   */
  generateSearchAnswer: async function (preamble, message, userName, spaceId, authClient) {
    // Create service clients with user credentials
    const sessionService = authClient ? new discoveryengineV1Alpha.SessionServiceClient({ authClient: authClient }) : await initializeSessionServiceClient(userName);
    const conversationalSearchService = authClient ? new discoveryengineV1Alpha.ConversationalSearchServiceClient({ authClient: authClient }) : await initializeConversationalSearchServiceClient(userName);

    // Retrieve session
    const session = await getOrCreateSession(sessionService, userName, spaceId);

    // Create request object with all options
    const relatedQuestionsSpec = { enable: true };
    const searchSpec = { searchParams: { maxReturnResults: 25 }};
    const queryUnderstandingSpec = {
      queryRephraserSpec: {
        disable: false,
        maxRephraseSteps: 1
      },
      disableSpellCorrection: false
    };
    const answerGenerationSpec = {
      modelSpec: { modelVersion: agentModel },
      promptSpec: { preamble: preamble },
      includeCitations: true,
      ignoreAdversarialQuery: true,
      ignoreNonAnswerSeekingQuery: true,
      ignoreJailBreakingQuery: true,
      ignoreLowRelevantContent: true
    };
    const request = {
      servingConfig: conversationalSearchService.projectLocationCollectionEngineServingConfigPath(projectNumber, agentLocation, 'default_collection', engineID, 'default_search:answer'),
      query: { text: message },
      session: session,
      queryUnderstandingSpec,
      searchSpec,
      answerGenerationSpec,
      relatedQuestionsSpec,
    };
    console.log(JSON.stringify(request));

    // Get the generated response
    const [response] = await conversationalSearchService.answerQuery(request);
    console.log('Generated answer: '+ JSON.stringify(response));

    return response.answer;
  },

  /**
   * Extract sources metadata from generated answer's:
   * 1. Get reference indexes from citations.
   * 2. Get document resource names from references.
   * 3. Get document titles, links, and data store types from search results.
   *
   * @param {!Answer} answer The generated answer.
   * @returns {Promise<Array>} The extracted sources.
   */
  extractSourcesFromGeneratedSearchAnswer: async function (answer) {
    let sources = [];

    // Get reference indexes from citations
    let citationReferenceIdsSet = new Set();
    if (answer.citations && answer.citations.length > 0) {
      answer.citations.forEach(citation => {
        if (citation.sources && citation.sources.length > 0) {
          citation.sources.forEach(source => {
            if (source.referenceId) {
              citationReferenceIdsSet.add(parseInt(source.referenceId));
            }
          });
        }
      });
    }
    const citationReferenceIds = Array.from(citationReferenceIdsSet);
    console.log('Citation reference IDs found: ' + JSON.stringify(citationReferenceIds));

    // Get document resource names from references
    let documentReferences = [];
    if (answer.references && answer.references.length > 0) {
      citationReferenceIds.forEach(citationReferenceId => {
        if (answer.references[citationReferenceId].structuredDocumentInfo?.document) {
          documentReferences.push(answer.references[citationReferenceId].structuredDocumentInfo?.document);
        }
      });
    }
    console.log('Referenced documents found: ' + JSON.stringify(documentReferences));

    // Get document titles, links, and data store types from search results
    if (answer.steps && answer.steps.length > 0) {
      answer.steps.forEach(step => {
        if (step.actions && step.actions.length > 0) {
          step.actions.forEach(action => {
            if (action.observation && action.observation.searchResults && action.observation.searchResults.length > 0) {
              action.observation.searchResults.forEach(result => {
                // Only add referenced sources that have a title and a link defined
                if (documentReferences.includes(result.document)) {
                  const structDataFields = result.structData?.fields;
                  if (structDataFields && structDataFields.link?.stringValue && structDataFields.link?.stringValue) {
                    let iconUrl = undefined;
                    switch (structDataFields['att.t.data_store_type']?.stringValue) {
                      case "GOOGLE_DRIVE":
                        iconUrl = "https://www.gstatic.com/images/branding/productlogos/drive_2020q4/v10/192px.svg";
                        break;
                      case "GOOGLE_CALENDAR":
                        iconUrl = "https://www.gstatic.com/images/branding/productlogos/calendar_2020q4/v13/192px.svg";
                        break;
                      case "GOOGLE_MAIL":
                        iconUrl = "https://www.gstatic.com/images/branding/productlogos/gmail_2020q4/v11/192px.svg";
                        break;
                      case "GOOGLE_GROUPS":
                        iconUrl = "https://www.gstatic.com/images/branding/productlogos/groups/v9/192px.svg";
                        break;
                      case "GOOGLE_SITES":
                        iconUrl = "https://www.gstatic.com/images/branding/productlogos/sites_2020q4/v6/192px.svg";
                        break;
                      default:
                    }
                    sources.push({
                      title: structDataFields.title?.stringValue,
                      link: structDataFields.link?.stringValue,
                      iconUrl
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    return sources;
  },

  ///////////////////////////
  // Assistant
  ///////////////////////////

  /**
   * Generate answers using user credentials.
   *
   * @param {!string} preamble The premabule to use.
   * @param {!string} message The text message to answer.
   * @param {!string} userName The resource name of the user whose credentials
   *     will be used to call the API.
   * @param {!string} spaceId The ID of the space the discussion is taking place.
   * @param {OAuth2Client} authClient The auth client to use for access.
   * @returns {Promise<Answer>} The answer.
   */
  generateAndSendAssistAnswer: async function (preamble, message, userName, spaceId) {
    // Create service clients with user credentials
    const sessionService = await initializeSessionServiceClient(userName);
    const assistantSearchService = await initializeAssistantSearchServiceClient(userName);
    const chatService = await initializeChatServiceClient();

    // Retrieve session
    const session = await getOrCreateSession(sessionService, userName, spaceId);

    // Create request object with all options
    const request = {
      name: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/engines/${engineID}/assistants/default_assistant`,
      session : session,
      query: { text: `${preamble}\n\n\n${message}`},
      toolsSpec: {
        // Do not seem to work for some reason
        // vertexAiSearchSpec: {
        //   dataStoreSpecs: [
        //     { dataStore: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/dataStores/calendar_1756838626252_google_calendar`},
        //     { dataStore: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/dataStores/drive_1756906912463`},
        //     { dataStore: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/dataStores/groups_1756907469299`},
        //     { dataStore: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/dataStores/gmail_1756839093462_google_mail`},
        //     { dataStore: `projects/${projectNumber}/locations/${agentLocation}/collections/default_collection/dataStores/sites_1757608207475`}
        //   ]
        // },
        webGroundingSpec: {}
      }
    };
    console.log('Request: ' + JSON.stringify(request));

    // Get the generated response
    const responseStream = await assistantSearchService.streamAssist(request);
    responseStream.on('error', (err) => { throw(err) });
    responseStream.on('end', () => { /* API call completed */ });

    // Go through the response chunks received from the stream
    let i = 0;
    let messageName = undefined;
    let answer = "";
    let thoughts = "";
    let lastThought = undefined;
    for await (const chunk of responseStream) {
      console.log('Chunk #' + i + ': ' + JSON.stringify(chunk));
      for (const reply of chunk.answer.replies) {
        console.log('Reply grounded content: ' + JSON.stringify(reply.groundedContent));
        const replyContent = reply.groundedContent.content;
        if (replyContent) {
          switch(replyContent.data) {
            case 'text':
              if (replyContent.thought) {
                lastThought = replyContent.text.includes('\n') ? replyContent.text : '\n**' + replyContent.text + '**\n\n\n';
                thoughts += lastThought;
              } else {
                answer += replyContent.text;
              }
              break;
            case 'inlineData':
            case 'file':
            case 'executableCode':
            case 'codeExecutionResult':
            default:
          }
          messageName = await createOrUpdateChatMessage(chatService, spaceId, messageName, answer, thoughts, lastThought, chunk.answer.state);
        }
      }
      messageName = await createOrUpdateChatMessage(chatService, spaceId, messageName, answer, thoughts, lastThought, chunk.answer.state);
      i++;
    }
    return messageName;
  },
}
