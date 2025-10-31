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

"""Service that handles Google Workspace operations."""

import io
import base64
from google.oauth2.service_account import Credentials
from google.apps import chat_v1 as google_chat
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from env import is_in_debug_mode

# ------- Google Chat API

# The prefix used for the User resource name.
USERS_PREFIX = "users/"

# The prefix used for the Space resource name.
SPACES_PREFIX = "spaces/"

# Credentials
SERVICE_ACCOUNT_FILE = 'credentials.json'

# All Chat operations are taken by the Chat app itself
CHAT_APP_AUTH_OAUTH_SCOPE = ["https://www.googleapis.com/auth/chat.bot"]

# The Chat DM space associated with the user
SPACE_NAME = None

def set_chat_config(spaceName: str):
    """Sets the Chat space name for subsequent operations."""
    global SPACE_NAME
    SPACE_NAME = spaceName
    print(f"Space is set to {SPACE_NAME}")

def create_google_chat_cloud_client():
    """Creates a Google Chat Cloud client using the service account."""
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
    return google_chat.ChatServiceClient(
        credentials=creds,
        client_options={ "scopes": CHAT_APP_AUTH_OAUTH_SCOPE }
    )

def create_google_chat_api_client():
    """Creates a Google Chat API client using the service account."""
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE).with_scopes(CHAT_APP_AUTH_OAUTH_SCOPE)
    return build('chat', 'v1', credentials=creds)

# Client instance singletons
google_chat_cloud_client = create_google_chat_cloud_client()
google_chat_api_client = create_google_chat_api_client()

def find_chat_app_dm(user_name: str) -> str:
    """Finds the direct message space name between the Chat app and the given user."""
    return google_chat_cloud_client.find_direct_message(google_chat.FindDirectMessageRequest(
        name=user_name
    )).name

def download_chat_attachment(attachment_name) -> str:
    """Downloads a Chat message attachment and returns its content as a base64 encoded string."""
    request = google_chat_api_client.media().download_media(resourceName=attachment_name)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
        if is_in_debug_mode():
            if status.total_size:
                print(f'Total size: {status.total_size}')
            print(f'Download {int(status.progress() * 100)}')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def create_message(message) -> str:
    """Creates a Chat message in the configured space."""
    print(f"Creating message in space {SPACE_NAME}...")
    return google_chat_cloud_client.create_message(google_chat.CreateMessageRequest(
        parent=SPACE_NAME,
        message=message
    )).name

def update_message(name: str, message):
    """Updates a Chat message in the configured space."""
    print(f"Updating message in space {SPACE_NAME}...")
    return google_chat_cloud_client.update_message(google_chat.UpdateMessageRequest(
        message=message | { "name": name },
        update_mask="*"
    ))
    
# ------- Gmail API

def get_email(credentials: Credentials, message_id: str, addon_event_access_token: str):
    """Fetches a full email message by its ID using the given credentials and add-on event access token."""
    # Create Gmail API client, no singleton as we need to pass user credentials
    google_gmail_api_client = build('gmail', 'v1', credentials=credentials)
    request = google_gmail_api_client.users().messages().get(
        id=message_id,
        userId='me',
        format='full'
    )
    request.headers["X-Goog-Gmail-Access-Token"] = addon_event_access_token
    return request.execute()

def extract_email_contents(message):
    """Extracts the subject and body text from a Gmail message object."""
    payload = message['payload']
    # Subject
    headers = payload['headers']
    subject = next((header['value'] for header in headers if header['name'] == 'Subject'), '')    
    # Body
    def get_body_data(part):
        """Recursively looks for the plain text part in the message payload."""
        if part['mimeType'] == 'text/plain':
            data = part['body'].get('data')
            if data:
                return base64.urlsafe_b64decode(data).decode('utf-8')
        if 'parts' in part:
            for subpart in part['parts']:
                body_text = get_body_data(subpart)
                if body_text:
                    return body_text
        return None
    body_text = get_body_data(payload)
    return subject, body_text if body_text else ''

# ------- People API

# The prefix used by the for the People resource name.
PEOPLE_PREFIX = "people/"

def get_person_profile(credentials: Credentials, people_name: str, person_fields: str):
    """Fetches a person's profile using the given credentials."""
    # Create People API client, no singleton as we need to pass user credentials
    google_people_api_client = build('people', 'v1', credentials=credentials)
    request = google_people_api_client.people().get(
        resourceName=people_name,
        personFields=person_fields
    )
    return request.execute()
