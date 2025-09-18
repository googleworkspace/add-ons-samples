/**
 * Copyright 2025 Google LLC
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

import express from 'express';
import { GoogleGenAI } from '@google/genai';

const port = parseInt(process.env.PORT) || 8080;
const projectID = process.env.PROJECT_ID || 'your-google-cloud-project-id';
const location = process.env.LOCATION || 'your-google-cloud-project-location';
const model =  process.env.MODEL || 'gemini-2.5-flash-lite';

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({vertexai: true, project: projectID, location: location});

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  const userMessage = req.body.chat.messagePayload.message.text

  // Send the user's message to the model to generate the answer
  const aiResponse = await genAI.models.generateContent({
    model: model,
    contents: userMessage,
    // Google Search tool is enabled
    config: { tools: [{ googleSearch: {}}]}
  });

  let groundingCardsV2 = undefined;
  const grounding = aiResponse.candidates[0].groundingMetadata;
  // Go through the grounding metadata if any
  if (grounding && grounding.groundingChunks && grounding.groundingChunks.length > 0) {
    let linkButtons = [];
    grounding.groundingChunks.forEach(groundingChunk => {
      if (groundingChunk.web) {
        // Create one link button per web URL returned
        linkButtons.push({
          text: groundingChunk.web.domain,
          onClick: { openLink: { url: groundingChunk.web.uri}}
        });
      }
    });
    // Create a card with link buttons
    groundingCardsV2 = [{
      cardId: "sourcesCard",
      card: { sections: [{
        header: "Sources",
        widgets: [{ buttonList: { buttons: linkButtons}}]
      }]}
    }];
  }
  
  // Send a Chat message with the generated answer
  return res.send({ hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: aiResponse.candidates[0].content.parts[0].text,
    // The sources are referenced in the card
    cardsV2: groundingCardsV2
  }}}}});
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
