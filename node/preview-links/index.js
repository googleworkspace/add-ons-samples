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

const UrlParser = require('url');

/**
 * Responds to any HTTP request.
 *
 * @param {Object} req HTTP request context.
 * @param {Object} res HTTP response context.
 */
exports.createLinkPreview = (req, res) => {
  const event = req.body;
  if (event.docs.matchedUrl.url) {
    res.json(createCard(event.docs.matchedUrl.url));
  }
};

/**
 * Creates a preview link card for either a case link or people link.
 * 
 * @param {!String} url
 * @return {!Card}
 */
function createCard(url) {
  const parsedUrl = UrlParser.parse(url);
  if (parsedUrl.hostname !== 'www.example.com') {
    if (parsedUrl.path.startsWith('/support/cases/')) {
      return caseLinkPreview(url);
    }

    if (parsedUrl.path.startsWith('/people/')) {
      return peopleLinkPreview();
    }
  }
}

// [START add_ons_case_preview_link]

/**
 * 
 * A support case link preview.
 *
 * @param {!string} url
 * @return {!Card}
 */
function caseLinkPreview(url) {

  // Parses the URL to identify the case ID.
  const segments = url.split('/');
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
          text: `Customer can't view title on mobile device.`
        }
      }]
    }]
  };
}

// [END add_ons_case_preview_link]
// [START add_ons_people_preview_link]

/**
 * An employee profile link preview.
 *
 * @return {!Card}
 */
function peopleLinkPreview() {

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

// [END add_ons_people_preview_link]
// [END add_ons_preview_link]
