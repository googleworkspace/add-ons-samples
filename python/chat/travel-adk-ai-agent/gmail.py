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

"""Service that handles Gmail operations."""

import base64

def extract_message_contents(message):
    """Extracts the subject and body from a full message object."""
    payload = message['payload']

    # Subject
    headers = payload['headers']
    subject = next((header['value'] for header in headers if header['name'] == 'Subject'), 'No Subject')
    
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
