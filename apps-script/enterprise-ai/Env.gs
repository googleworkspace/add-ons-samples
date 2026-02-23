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

// Environment variables

const REASONING_ENGINE_RESOURCE_NAME = PropertiesService.getScriptProperties().getProperty('REASONING_ENGINE_RESOURCE_NAME');

// Get reasoning engine resource name
function getReasoningEngine() {
  return REASONING_ENGINE_RESOURCE_NAME;
}

const LOCATION = PropertiesService.getScriptProperties().getProperty('LOCATION');

// Get reasoning engine location
function getLocation() {
  const parts = REASONING_ENGINE_RESOURCE_NAME.split('/'); 
  const locationIndex = parts.indexOf('locations') + 1;
  return parts[locationIndex];
}

const DEBUG = parseInt(PropertiesService.getScriptProperties().getProperty('DEBUG')) || 0;

// Returns whether the application is running in debug mode.
function isInDebugMode() {
  return DEBUG == 1
}

const AGENT_ID = PropertiesService.getScriptProperties().getProperty('AGENT_ID') || `${getReasoningEngine()}/assistants/default_assistant/agents/default_agent`;

// Get Gemini Enterprise agent ID
function getAgentId() {
  return AGENT_ID;
}
