/**
 * Copyright 2023 Google LLC
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
// [START add_ons_preview_link]
const express = require('express');

// Create and configure the app
const app = express();

// Trust GCPs front end to for hostname/port forwarding
app.set("trust proxy", true);
app.use(express.json());

// Case link preview route
app.post('/caseLinkPreview', (req, res) => {
  const event = req.body;
  const card = caseLinkPreview(event);
  res.json(card);
});

// People link preview route
app.post('/peopleLinkPreview', (req, res) => {
  const event = req.body;
  const card = peopleLinkPreview(event);
  res.json(card);
});

// [START add_ons_case_preview_link]

/**
* Entry point for a support case link preview
*
* @param {!Object} event
* @return {!Card}
*/
// Creates a function that passes an event object as a parameter.
function caseLinkPreview(event) {

  // If the event object URL matches a specified pattern for support case links.
  if (event.docs.matchedUrl.url) {

    // Uses the event object to parse the URL and identify the case ID.
    const segments = event.docs.matchedUrl.url.split('/');
    const caseId = segments[segments.length - 1];

    // Returns the card.
    // Uses the text from the card's header for the title of the smart chip.
    return {
      header: {
        title: `Case ${caseId}: Title bar is broken.`
      },
      sections: [{
        widgets: [{
          textParagraph: {
            text: `Customer can\'t view title on mobile device.`
          }
        }]
      }]
    };
  }
}

// [END add_ons_case_preview_link]
// [START add_ons_people_preview_link]

/**
* Entry point for an employee profile link preview
*
* @param {!Object} event
* @return {!Card}
*/
function peopleLinkPreview(event) {

  // If the event object URL matches a specified pattern for employee profile links.
  if (event.docs.matchedUrl.url) {

    // Builds a preview card with an employee's name, title, email, and profile photo.
    // Returns the card. Uses the text from the card's header for the title of the smart chip.
    return {
      header: {
        title: "Rosario Cruz"
      },
      sections: [{
        widgets: [
          {
            image: {
              imageUrl: 'https://developers.google.com/workspace/add-ons/images/employee-profile.png'
            }
          }, {
            keyValue: {
              icon: "EMAIL",
              content: "rosario@example.com",
              bottomLabel: "Case Manager"
            }
          }
        ]
      }]
    };
  }
}

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
});

// [END add_ons_people_preview_link]
// [END add_ons_preview_link]
