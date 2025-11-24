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
// [START chat_incident_response_space_creator]

/**
 * Handles an incident by creating a chat space with the provided title and members, and posting a message.
 * All the actions are done using user credentials.
 *
 * @param {Object} formData - The data submitted by the user. It should contain the fields:
 *                           - title: The display name of the chat space.
 *                           - description: The description of the incident.
 *                           - users: A comma-separated string of user emails to be added to the space.
 * @return {string} The resource name of the new space.
 */
function handleIncident(formData) {
  const users = formData.users.trim().length > 0 ? formData.users.split(',') : [];
  const spaceName = setUpSpace_(formData.title, users);
  addAppToSpace_(spaceName);
  createMessage_(spaceName, formData.description);
  return spaceName;
}

/**
 * Creates a chat space.
 *
 * @return {string} the resource name of the new space.
 */
function setUpSpace_(displayName, users) {
  const memberships = users.map(email => ({
    member: {
      name: `users/${email}`,
      type: "HUMAN"
    }
  }));
  const request = {
    space: {
      displayName: displayName,
      spaceType: "SPACE"
    },
    memberships: memberships
  };
  // Call Chat API method spaces.setup
  const space = Chat.Spaces.setup(request);
  return space.name;
}

/**
 * Adds this Chat app to the space.
 *
 * @return {string} the resource name of the new membership.
 */
function addAppToSpace_(spaceName) {
  const request = {
    member: {
      name: "users/app",
      type: "BOT"
    }
  };
  // Call Chat API method spaces.members.create
  const membership = Chat.Spaces.Members.create(request, spaceName);
  return membership.name;
}

/**
 * Creates a chat message.
 *
 * @param {string} spaceName - The resource name of the space.
 * @param {string} message - The text to be posted.
 * @return {string} the resource name of the new message.
 */
function createMessage_(spaceName, message) {
  const request = {
    text: message
  };
  // Call Chat API method spaces.messages.create
  const result = Chat.Spaces.Messages.create(request, spaceName);
  return result.name;
}
// [END chat_incident_response_space_creator]
