/**
 * Copyright 2023 Google LLC
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

/**
 * @fileoverview Service that calls the Vertex AI API for generative AI text
 * prediction.
 */

/**
 * [Vertex AI Platform](https://cloud.google.com/vertex-ai/docs) client library.
 */
const { VertexAI } = require('@google-cloud/vertexai');
const { env } = require('../env.js');

// Prompts used to generate text using Vertex AI.
const generationPrompt = 'Generate the user story description based on the following title. Do not ask any follow up questions, generate anything you can by taking your own assumptions when needed:';
const grammarPrompt = 'Correct the grammar of the following user story description. Only respond with the corrected text:';
const expansionPrompt = 'Expand the following user story description by adding a new paragraph. Only respond with the new version of the text:';

// Initialize Vertex with the Cloud project and location
const vertexAI = new VertexAI({
  project: env.project,
  location: env.location,
});

// Instantiate the model
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  temperature: 0,
});

/**
 * Service that executes AI text prediction.
 */
exports.AIPService = {

  /**
   * Executes AI text prediction to generate a description for a user story.
   * @param {!string} title The title of the user story.
   * @return {Promise<string>} The generated description.
   */
  generateDescription: async function (title) {
    return this.callPredict(`${generationPrompt}\n\n${title}`);
  },

  /**
   * Executes AI text prediction to expand a user story description.
   * @param {!string} description The description of the user story.
   * @return {Promise<string>} The expanded description.
   */
  expandDescription: async function (description) {
    return this.callPredict(`${expansionPrompt}\n\n${description}`);
  },

  /**
   * Executes AI text prediction to correct the grammar of a user story
   * description.
   * @param {!string} description The description of the user story.
   * @return {Promise<string>} The corrected description.
   */
  correctDescription: async function (description) {
    return this.callPredict(`${grammarPrompt}\n\n${description}`);
  },

  /**
   * Executes AI text prediction using the given prompt.
   * @param {!string} prompt The prompt to send in the AI prediction request.
   * @return {Promise<string>} The predicted text.
   */
  callPredict: async function (prompt) {
    const request = {
      contents: [{role: 'user', parts: [{text: prompt, }]}],
    };
    const result = await generativeModel.generateContent(request);
    const response = result.response.candidates[0].content.parts[0].text;

    if (env.logging) {
      console.log(JSON.stringify({
        message: 'callPredict',
        request,
        response,
      }));
    }

    return response;
  },

}
