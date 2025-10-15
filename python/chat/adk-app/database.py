# Copyright 2025 Google LLC. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Service that handles database operations."""

import json
from google.cloud import firestore
from google.oauth2.credentials import Credentials

# The prefix used by the Google Chat API in the User resource name.
USERS_PREFIX = "users/"

# The name of the users collection in the database.
CREDS_COLLECTION = "creds"
SESSIONS_COLLECTION = "sessions"

# The name of the session ID field in values.
SESSION_ID_FIELD = "id"

# Initialize the Firestore default database using Application Default Credentials.
db = firestore.Client()

def store_session(user_name: str, session_id: str):
    """Saves the user's ADK session ID to storage."""
    doc_ref = db.collection(SESSIONS_COLLECTION).document(user_name.replace(USERS_PREFIX, ""))
    doc_ref.set(json.loads({SESSION_ID_FIELD: session_id}))

def get_session(user_name: str) -> str | None:
    """Fetches the user's ADK session ID from storage."""
    doc = db.collection(SESSIONS_COLLECTION).document(user_name.replace(USERS_PREFIX, "")).get()
    if doc.exists:
        return doc.to_dict().get(SESSION_ID_FIELD)
    return None

def delete_session(user_name: str):
    """Deletes the user's ADK session ID from storage."""
    doc_ref = db.collection(SESSIONS_COLLECTION).document(user_name.replace(USERS_PREFIX, ""))
    doc_ref.delete()

def store_credentials(user_name: str, creds: Credentials):
    """Saves the user's OAuth2 credentials to storage."""
    doc_ref = db.collection(CREDS_COLLECTION).document(user_name.replace(USERS_PREFIX, ""))
    doc_ref.set(json.loads(creds.to_json()))

def get_credentials(user_name: str) -> Credentials | None:
    """Fetches the user's OAuth2 credentials from storage."""
    doc = db.collection(CREDS_COLLECTION).document(user_name.replace(USERS_PREFIX, "")).get()
    if doc.exists:
        return Credentials.from_authorized_user_info(doc.to_dict())
    return None

def delete_credentials(user_name: str):
    """Deletes the user's OAuth2 credentials from storage."""
    doc_ref = db.collection(CREDS_COLLECTION).document(user_name.replace(USERS_PREFIX, ""))
    doc_ref.delete()
