# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License")
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# [START add_ons_3p_resources]

from typing import Any, Mapping
from urllib.parse import urlparse

import flask
import functions_framework


@functions_framework.http
def create_3p_resources(req: flask.Request):
    """Responds to any HTTP request related to 3P resource creations.
    Args:
      req: HTTP request context.
    Returns:
      The response object.
    """
    event = req.get_json(silent=True)
    if event["docs"]["matchedUrl"]["url"]:
        return create_card(event["docs"]["matchedUrl"]["url"])




# [END add_ons_3p_resources]
