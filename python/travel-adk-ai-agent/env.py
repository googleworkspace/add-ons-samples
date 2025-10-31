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

"""Service that handles runtime environment."""

import os

# Environment variables
PROJECT_NUMBER = os.environ.get('PROJECT_NUMBER', 'your-google-cloud-project-number')
LOCATION = os.environ.get('LOCATION', 'your-location')
ENGINE_ID = os.environ.get('ENGINE_ID', 'your-engine-id')
MAX_AI_AGENT_RETRIES = int(os.environ.get('MAX_AI_AGENT_RETRIES', '10'))

BASE_URL = os.environ.get('BASE_URL', 'your-google-cloud-function-url')

RESET_SESSION_COMMAND_ID = int(os.environ.get('RESET_SESSION_COMMAND_ID','1'))

NA_IMAGE_URL = os.environ.get('NA_IMAGE_URL', 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png?20210219185637')

DEBUG = int(os.environ.get('DEBUG', '0'))

def is_in_debug_mode() -> bool:
    """Returns whether the application is running in debug mode."""
    return DEBUG == 1
