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

// --- Session Management ---

function getReasoningEngine() {
  return `projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${ENGINE_ID}`;
}

function getAgentUserPseudoId(userName) {
  return userName.replace(USERS_PREFIX, '');
}

function deleteAgentSession(userName) {
  const sessionId = getAgentSession(getAgentUserPseudoId(userName));
  if (sessionId) {
    console.log(`Deleting session ${sessionId}...`);
    const responseContentJson = UrlFetchApp.fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/${getReasoningEngine()}/sessions/${sessionId}`,
      {
        method: 'delete',
        headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
        contentType: 'application/json',
        muteHttpExceptions: true
      }
    ).getContentText();
    pollLroStatus(JSON.parse(responseContentJson).name);
    console.log(`Session ${sessionId} deleted.`);
  } else {
    console.log(`No session found for ${userName}, nothing to delete`);
  }
}

function createAgentSession(userName) {
  const responseContentJson = JSON.parse(UrlFetchApp.fetch(
    `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/${getReasoningEngine()}/sessions`,
    {
      method: 'post',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      contentType: 'application/json',
      payload: JSON.stringify({ "userId": getAgentUserPseudoId(userName) }),
      muteHttpExceptions: true
    }
  ).getContentText());
  const createdSessionId = getSessionId(responseContentJson.name);
  console.log(`Created session ID: ${createdSessionId}`);
  pollLroStatus(responseContentJson.name);
  return createdSessionId;
}

function getAgentSession(userId = "117395548653558734883") {
  const responseContentJson = UrlFetchApp.fetch(
    `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/${getReasoningEngine()}/sessions?filter=user_id%3D%22${userId}%22`,
    {
      method: 'get',
      headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
      contentType: 'application/json',
      muteHttpExceptions: true
    }
  ).getContentText();
  const response = JSON.parse(responseContentJson);
  const sessions = response.sessions || [];
  if (sessions.length > 0) {
    const sessionId = getSessionId(sessions[0].name);
    console.log(`Found existing session: ${sessionId}`);
    return sessionId
  }
  return undefined;
}

function getOrCreateAgentSession(userName) {
  let sessionId = getAgentSession(getAgentUserPseudoId(userName));
  if (!sessionId) {
    sessionId = createAgentSession(userName);
    console.log(`Created new session: ${sessionId}`);
  }
  return sessionId;
}

function getSessionId(resourceName) {
  const regex = /\/sessions\/([^/]+)(?:\/.*)?/;
  const match = resourceName.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// ---  Agent request handling ---

class IAiAgentUiRender {
  constructor(isChat) {
    this.isChat = isChat;
  }
  ignoredAuthors() { throw new Error("Not Implemented"); }
  getAuthorEmoji(author) { throw new Error("Not Implemented"); }
  createStatusAccessoryWidgets(text, materialIconName) { throw new Error("Not Implemented"); }
  getAgentResponseWidgets(name, response) { throw new Error("Not Implemented"); }
}

class IAiAgentHandler {
  constructor(uiRender) {
    this.uiRender = uiRender;
  }
  extractContentFromInput(input) { throw new Error("Not Implemented"); }
  finalAnswer(author, text, success, failure) { throw new Error("Not Implemented"); }
  functionCallingInitiation(author, name) { throw new Error("Not Implemented"); }
  functionCallingCompletion(author, name, response, outputId) { throw new Error("Not Implemented"); }
  functionCallingFailure(name, outputId) { throw new Error("Not Implemented"); }
}

function requestAgent(userName, input, handler) {
  // Mapping for function call output tracking
  const functionCallOutputMap = {};
  const functionCallOutputAgentMap = {};
  const functionCallOngoingIds = [];

  let attempt = 0;
  let responded = false;

  try {
    console.log("Initializing the session...");
    const sessionId = getOrCreateAgentSession(userName);
    
    // Retry loop in case of no response from the agent
    while (attempt < MAX_AI_AGENT_RETRIES && !responded) {
      attempt += 1;
      console.log(`Attempting agent request #${attempt} / ${MAX_AI_AGENT_RETRIES}...`);
      const responseContentText = UrlFetchApp.fetch(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/${getReasoningEngine()}:streamQuery?alt=sse`,
        {
          method: 'post',
          headers: { 'Authorization': `Bearer ${getCredentials().getAccessToken()}` },
          contentType: 'application/json',
          payload: JSON.stringify({
            "class_method": "async_stream_query",
            "input": {
              "user_id": getAgentUserPseudoId(userName),
              "session_id": sessionId,
              "message": handler.extractContentFromInput(input),
            }
          }),
          muteHttpExceptions: true
        }
      ).getContentText();
      
      // Process the SSE response (one line per event)
      const events = responseContentText.split('\n').filter(s => s.trim().length > 0);
      console.log(`Received ${events.length} agent events.`);
      for (const eventJson of events) {
        responded = true;
        if (isInDebugMode()) {
          console.log("Event: " + eventJson);
        }
        const event = JSON.parse(eventJson);

        // Retrieve the agent responsible for generating the content
        const author = event.author;
        
        // Skip internal events
        if (!event.content) {
          console.log(`${author}: internal event`);
          continue;
        }

        // Retrieve function calls and responses
        const parts = event.content.parts || [];
        const functionCalls = parts.filter(p => p.function_call).map(p => p.function_call);
        const functionResponses = parts.filter(p => p.function_response).map(p => p.function_response);

        // Handle final answer
        const textPart = parts.find(p => p.text);
        if (textPart) {
          const text = textPart.text;
          console.log(`${author}: ${text}`);
          handler.finalAnswer(author, text, true, false);
        }

        // Handle agent funtion calling initiation
        if (functionCalls.length > 0) {
          for (const functionCall of functionCalls) {
            const id = functionCall.id;
            const name = functionCall.name;
            // Skip internal function calls
            if (name !== "transfer_to_agent" && !handler.uiRender.ignoredAuthors().includes(name)) {
              console.log(`${author}: function calling initiation ${name}`);
              functionCallOutputMap[id] = handler.functionCallingInitiation(author, name);
              functionCallOutputAgentMap[id] = name;
              functionCallOngoingIds.push(id);
            } else {
              console.log(`${author}: internal event, function calling initiation ${name}`);
            }
          }
        }

        // Handle agent function calling completion
        else if (functionResponses.length > 0) {
          for (const functionResponse of functionResponses) {
            const id = functionResponse.id;
            const name = functionResponse.name;
            const response = functionResponse.response;
            // Skip internal function calls
            if (name !== "transfer_to_agent" && !handler.uiRender.ignoredAuthors().includes(name)) {
              // Retrieve the output resource ID for the function call
              const outputId = functionCallOutputMap[id];
              console.log(`${author}: function calling completion ${name}`);
              handler.functionCallingCompletion(author, name, response, outputId);
              const index = functionCallOngoingIds.indexOf(id);
              if (index > -1) functionCallOngoingIds.splice(index, 1);
            } else {
              console.log(`${author}: internal event, completed transfer`);
            }
          }
        }
      }
      console.log(responded ? "Agent responded to the request." : "No response received from the agent.");
    }
  } catch (e) {
    console.error(`Error occurred while requesting AI agent: ${e}`);
    // Update all ongoing agent outputs with a failure status
    for (const id of functionCallOngoingIds) {
      handler.functionCallingFailure(
        functionCallOutputAgentMap[id],
        functionCallOutputMap[id]
      );
    }
    // Send a final answer indicating the failure
    handler.finalAnswer(
      "Agent",
      "Something went wrong, I could not answer that specific question. Please try again later.",
      false,
      true
    );
  }
}

