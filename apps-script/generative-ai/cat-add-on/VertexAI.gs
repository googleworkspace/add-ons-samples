/**
 * Copyright 2025 Google LLC
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

// --- Configuration & Constants ---

/**
 * Your Google Cloud Project ID for Vertex AI access.
 * ⚠️ WARNING: Update this value before running.
 * NOTE: Ensure the Apps Script project has the 'https://www.googleapis.com/auth/cloud-platform' scope.
 */
const PROJECT_ID = 'your-project-id';
const MODEL_ID = 'gemini-2.5-flash-image';
const IMAGE_PROMPT = 'A high-quality, photorealistic image of a random cat.';

/**
 * Generates an image using the gemini-2.5-flash-image model on Vertex AI
 * and returns it as a Data URI.
 *
 * @param {string} prompt The text prompt to generate the image from.
 * @returns {string} A Data URI string (e.g., 'data:image/png;base64,...') or a fallback image URL on error.
 */
function generateImage(prompt) {
  const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/publishers/google/models/${MODEL_ID}:generateContent`;

  const payload = {
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio: '1:1',
      }
    },
    contents: [{
      role: 'user',
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${ScriptApp.getOAuthToken()}`,
      Accept: 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(ENDPOINT, options);
    const responseBody = response.getContentText();
    const responseData = JSON.parse(responseBody);

    if (response.getResponseCode() !== 200) {
      console.error(`Vertex AI API Error (${response.getResponseCode()}): ${responseBody}`);
      const errorMessage = responseData?.error?.message || 'Unknown API Error';
      throw new Error(`Vertex AI API call failed: ${errorMessage}`);
    }

    const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
      part => part.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart) {
      console.error(`No image data found in response: ${responseBody}`);
      throw new Error('Image generation failed or no image data was returned.');
    }

    const { data: base64Data, mimeType } = imagePart.inlineData;

    return `data:${mimeType};base64,${base64Data}`;

  } catch (e) {
    console.error(`An error occurred during image generation: ${e.toString()}`);
    return 'https://www.google.com/images/errors/robot.png';
  }
}
