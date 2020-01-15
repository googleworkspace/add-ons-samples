// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Extracted information from GitHub links.

 * @typedef {Object} GitHubLink
 * @property {string} owner - User or organization that owns the repository.
 * @property {string} repo - Name of the repository.
 * @property {string} action - Action to dispatch.
 * @property {number} id - ID of the issue or pull request.
 */

/**
 * Retrieves the current message given an add-on event.
 * @param {Event} event - Add-on event
 * @return {Message}
 */
function getCurrentMessage(event) {
  var accessToken = event.messageMetadata.accessToken;
  var messageId = event.messageMetadata.messageId;
  GmailApp.setCurrentMessageAccessToken(accessToken);
  return GmailApp.getMessageById(messageId);
}

/**
 * Extracts pull requests or issues from one or more messages.
 *
 * @param {string|string[]} messageBodies - message bodies to scan for links.
 * @return {GitHubLink[]} extracted link information, empty array if none found.
 */
function extractGitHubLinks(messageBodies) {
  var bodies = _.castArray(messageBodies);
  var links = [];
  _.each(bodies, function(body) {
    extractGitHubLinksFromText_(body, links);
  });
  return _.uniqBy(links, function(item) {
    return item.owner + item.repo + item.id;
  });
}

/**
 * Extracts pull requests or issues from text.
 *
 * @param {string|string[]} text - raw text to scan for links.
 * @param {GitHubLink[]} appendTo - Array to append results to.
 */
function extractGitHubLinksFromText_(text, appendTo) {
  var re = /https:\/\/github.com\/([^\/]+?)\/([^\/]+?)\/(issues|pull)\/(\d+)/gi;
  while ((match = re.exec(text)) !== null) {
    var type = stripHtmlTags(match[3]);
    appendTo.push({
      owner: stripHtmlTags(match[1]),
      repo: stripHtmlTags(match[2]),
      id: parseInt(stripHtmlTags(match[4])),
      type: type,
    });
  }
}
/**
 * Strips HTML tags from a string. Not a general purpose implementation,
 * just removes anything encased in <>.
 *
 * @param {string} str - text to strip tags from.
 * @return {string}
 */
function stripHtmlTags(str) {
  return str.replace(/<.+?>/g, '');
}
