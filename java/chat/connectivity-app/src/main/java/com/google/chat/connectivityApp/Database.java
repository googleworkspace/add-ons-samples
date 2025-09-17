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
package com.google.chat.connectivityApp;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.UserCredentials;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.common.collect.ImmutableMap;

import java.util.Date;
import java.util.Optional;

import org.springframework.stereotype.Repository;

/** Service that handles database operations. */
@Repository
public class Database {
  // The prefix used by the Google Chat API in the User resource name.
  private static final String USERS_PREFIX = "users/";

  // The name of the users collection in the database.
  private static final String USERS_COLLECTION = "users";

  // The Firestore database.
  private final Firestore db;

  /**
   * Initializes the Firestore database using Application Default Credentials.
   */
  public Database() {
    FirestoreOptions firestoreOptions =
        FirestoreOptions.newBuilder().setDatabaseId("auth-data").build();
    db = firestoreOptions.getService();
  }

  /**
   * Saves the user's OAuth2 credentials to storage.
   * 
   * @param userName the resource name of the user. 
   * @param credentials the user's credentials to be stored
   */
  public void saveUserCredentials(String userName, UserCredentials credentials) throws Exception {
    ImmutableMap<String, Object> data = ImmutableMap.of(
        "clientId", credentials.getClientId(),
        "clientSecret", credentials.getClientSecret(),
        "accessToken", credentials.getAccessToken().getTokenValue(),
        "refreshToken", credentials.getRefreshToken(),
        "expiryDate", credentials.getAccessToken().getExpirationTime());
    db
        .collection(USERS_COLLECTION)
        .document(userName.replace(USERS_PREFIX, ""))
        .set(data)
        .get();
  }

  /**
   * Fetches the user's OAuth2 credentials from storage.
   * 
   * @param userName the resource name of the user.
   * @return the credentials if the user is found in the database.
   */
  public Optional<UserCredentials> getUserCredentials(String userName) throws Exception {
    DocumentSnapshot doc = db
        .collection(USERS_COLLECTION)
        .document(userName.replace(USERS_PREFIX, ""))
        .get()
        .get();
    if (doc.exists()) {
      return Optional.of(UserCredentials
        .newBuilder()
        .setClientId(doc.getString("clientId"))
        .setClientSecret(doc.getString("clientSecret"))
        .setAccessToken(new AccessToken(
            doc.getString("accessToken"), doc.getDate("expiryDate")))
        .setRefreshToken(doc.getString("refreshToken"))
        .build());
    } else {
      return Optional.empty();
    }
  }

  /**
   * Deletes the user's OAuth2 credentials from storage.
   *
   * @param userName the resource name of the user.
   */
  public void deleteUserCredentials(String userName) throws Exception {
    db
        .collection(USERS_COLLECTION)
        .document(userName.replace(USERS_PREFIX, ""))
        .delete()
        .get();
  }
}
