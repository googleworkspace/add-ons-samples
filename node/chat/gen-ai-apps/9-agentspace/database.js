/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Firestore } from '@google-cloud/firestore';

// The prefixes used by the Google Chat API in resource names.
export const USERS_PREFIX = 'users/';
export const SPACES_PREFIX = 'spaces/';
export const EMAILS_PREFIX = 'msg-f:';

// The name of the users collection in the database.
const USERS_COLLECTION = 'users';

// Initialize the Firestore database using Application Default Credentials.
const db = new Firestore();

// Service that saves and loads OAuth user credentials on Firestore.
export const DatabaseService = {

  /**
   * Generate a user ID.
   * 
   * @param {!string} userName The resource name of the user.
   * @return {Promise<string>} The generated user ID.
   */
  getUserId: async function (userName) {
    return userName.replace(USERS_PREFIX, '');
  },

  /**
   * Saves the user's OAuth2 credentials to storage.
   * 
   * @param {!string} userName The resource name of the user.
   * @param {!Credentials} credentials The OAuth2 credentials.
   * @return {Promise<void>}
   */
  saveUserCredentials: async function(userName, credentials) {
    const docRef = db
      .collection(USERS_COLLECTION)
      .doc(await DatabaseService.getUserId(userName));
    await docRef.set(credentials);
  },

  /**
   * Fetches the user's OAuth2 credentials from storage.
   * 
   * @param {!string} userName The resource name of the user.
   * @return {Promise<Credentials | null>} The credentials or null if the
   *     user is not found in the database.
   */
  getUserCredentials: async function(userName) {
    const doc = await db
      .collection(USERS_COLLECTION)
      .doc(await DatabaseService.getUserId(userName))
      .get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  }
};
