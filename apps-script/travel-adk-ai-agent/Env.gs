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

// Environment variables

const PROJECT_NUMBER = PropertiesService.getScriptProperties().getProperty('PROJECT_NUMBER');
const LOCATION = PropertiesService.getScriptProperties().getProperty('LOCATION');
const ENGINE_ID = PropertiesService.getScriptProperties().getProperty('ENGINE_ID');
const MAX_AI_AGENT_RETRIES = parseInt(PropertiesService.getScriptProperties().getProperty('MAX_AI_AGENT_RETRIES')) || 10;

const RESET_SESSION_COMMAND_ID = 1

const NA_IMAGE_URL = PropertiesService.getScriptProperties().getProperty('NA_IMAGE_URL') || 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png?20210219185637';

const DEBUG = parseInt(PropertiesService.getScriptProperties().getProperty('DEBUG')) || 0;

function isInDebugMode() {
  return DEBUG == 1
}
