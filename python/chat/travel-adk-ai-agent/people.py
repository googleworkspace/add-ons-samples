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

"""Service that handles People operations."""

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

def get_person_profile(credentials: Credentials, people_name: str, person_fields: str):
    google_people_api_client = build('people', 'v1', credentials=credentials)
    request = google_people_api_client.people().get(
        resourceName=people_name,
        personFields=person_fields
    )
    return request.execute()
