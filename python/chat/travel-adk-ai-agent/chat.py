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

"""Service that handles Google Chat operations."""

import io
import base64
from google.oauth2.service_account import Credentials
from google.apps import chat_v1 as google_chat
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SERVICE_ACCOUNT_FILE = 'credentials_chat.json'
APP_AUTH_OAUTH_SCOPE = ["https://www.googleapis.com/auth/chat.bot"]

SPACE_NAME = None

def setup_config(spaceName: str):
    global SPACE_NAME
    SPACE_NAME = spaceName
    print(f"Space is set to {SPACE_NAME}")

def create_google_chat_cloud_client():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
    return google_chat.ChatServiceClient(
        credentials = creds,
        client_options={
            "scopes": APP_AUTH_OAUTH_SCOPE
        }
    )

def create_google_chat_api_client():
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE).with_scopes(APP_AUTH_OAUTH_SCOPE)
    return build('chat', 'v1', credentials=creds)
        
google_chat_cloud_client = create_google_chat_cloud_client()
google_chat_api_client = create_google_chat_api_client()

def find_dm(user_name: str) -> str:
    return google_chat_cloud_client.find_direct_message(google_chat.FindDirectMessageRequest(
        name = user_name
    )).name


def downloadChatAttachment(attachment_name) -> str:
    request = google_chat_api_client.media().download_media(resourceName=attachment_name)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)

    done = False
    while done is False:
        status, done = downloader.next_chunk()
        if status.total_size:
            print(f'Total size: {status.total_size}')
        print(f'Download {int(status.progress() * 100)}')

    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def file_to_base64(file_path: str) -> str:
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def create_message(message) -> str:
    print(f"Creating message in space {SPACE_NAME}...")
    return google_chat_cloud_client.create_message(google_chat.CreateMessageRequest(
        parent = SPACE_NAME,
        message = message
    )).name

def update_message(name: str, message):
    print(f"Updating message in space {SPACE_NAME}...")
    return google_chat_cloud_client.update_message(google_chat.UpdateMessageRequest(
        message = message | {"name": name},
        update_mask = "*"
    ))
