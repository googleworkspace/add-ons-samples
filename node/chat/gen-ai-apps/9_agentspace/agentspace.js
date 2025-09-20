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

const projectNumber = process.env.PROJECT_NUMBER || 'your-google-cloud-project-number';
const agentLocation = process.env.AGENT_LOCATION || 'your-agent-location';
const agentModel =  process.env.AGENT_MODEL || 'gemini-2.5-flash/answer_gen/v1';
const engineID = process.env.ENGINE_ID || 'your-engine-id';
const discoveryengine = v1alpha;

/**
 * Initializes the Discovery Engine Session Service client with user credentials.
 * 
 * @param {!string} userName The resource name of the user providing the credentials.
 * @returns {Promise<SessionServiceClient>} An initialized
 *     Discovery Engine Session Service client.
 */
async function initializeSessionServiceClient(userName) {
  return new discoveryengine.SessionServiceClient({
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
  return new discoveryengine.ConversationalSearchServiceClient({
    authClient: await createOAuth2Client(userName)
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
  generateAnswer: async function (preamble, message, userName, spaceId, authClient) {
    // Create service clients with user credentials
    const sessionService = authClient ? new discoveryengine.SessionServiceClient({ authClient: authClient }) : await initializeSessionServiceClient(userName);
    const conversationalSearchService = authClient ? new discoveryengine.ConversationalSearchServiceClient({ authClient: authClient }) : await initializeConversationalSearchServiceClient(userName);

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
  extractSourcesFromGeneratedAnswer: async function (answer) {
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
  }
}
