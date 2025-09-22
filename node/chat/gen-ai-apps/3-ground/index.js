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
import { env } from './env.js';

const app = express();
app.use(express.json());

const genAI = new GoogleGenAI({vertexai: true, project: env.projectID, location: env.location});

/**
 * Handles HTTP requests from the Google Workspace add-on.
 *
 * @param {Object} req - The HTTP request object sent from Google Workspace.
 * @param {Object} res - The HTTP response object.
 */
app.post('/', async (req, res) => {
  const userMessage = req.body.chat.messagePayload.message.text

  // Send the user's message to the model to generate the answer
  const prompt = 'Use simple text for concise answers. The only formatting options you can use is to (1) surround some text with a single star for bold such as `*text*` for strong emphasis (2) surround some text with a single underscore for italic such as `_text_` for gentle emphasis (3) surround some text with a single tild for strikethrough such as `~text~` for removal (4) use a less than before and a pipe followed by link text after followed by a more than after a given URL to make it a hyperlink such as `<https://example.com|link text>` for resource referencing (5) use a backslash followed by the letter n for a new line such as `\\n` for readibility (6) surround some text with a single backquote such as `\`text\`` for quoting code (7) surround an entire paragraph with three backquotes in dedicated lines such as `\`\`\`\nparagraph\n\`\`\`` for quoting code (8) prepend lines with list items with a single star or hyphen followed by a single space such as `* list item` or `- list item` for bulleting ; DO NOT USE ANY OTHER FORMATTING OTHER THAN THOSE. Answer the following message in the same language: ' + userMessage;
  const aiResponse = await genAI.models.generateContent({
    model: env.model,
    contents: prompt,
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

app.listen(env.port, () => {
  console.log(`Listening on port ${env.port}`);
});
