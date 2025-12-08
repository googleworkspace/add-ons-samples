# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Google Chat app that verifies and responds to add-on event requests
"""

from typing import Any, Mapping
from flask import Flask, request, json
from google.oauth2 import id_token
from google.auth.transport import requests

# Service account email to verify requests from
SERVICE_ACCOUNT_EMAIL = 'your-add-on-service-account-email'

# Endpoint URL of the add-on
HTTP_ENDPOINT = 'your-add-on-endpoint-url'

app = Flask(__name__)

@app.route('/', methods=['POST'])
def post() -> Mapping[str, Any]:
  """Handle requests from Google Chat built as Google Workspace add on

  Returns:
    A simple text message app response based on whether the request is
      verified or not.
  """
  return json.jsonify({ 'hostAppDataAction': { 'chatDataAction': { 'createMessageAction': { 'message': {
    'text': 'Successful verification!' if verifyAddOnRequest() else 'Failed verification!'
  }}}}})


# [START verify_add_on_request]
def verifyAddOnRequest() -> bool:
  """Determine whether a Google Workspace add-on request is legitimate.

  Args:
    request: Request sent from Google Workspace add-on

  Returns:
    Whether the request is legitimate
  """
  try:
    bearer = request.headers.get('Authorization')[len("Bearer "):]
    token = id_token.verify_oauth2_token(bearer, requests.Request(), HTTP_ENDPOINT)
    return token['email'] == SERVICE_ACCOUNT_EMAIL

  except:
    return False
    # [END verify_add_on_request]


if __name__ == '__main__':
  # This is used when running locally. Gunicorn is used to run the
  # application on Google App Engine. See entrypoint in app.yaml.
  app.run(host='127.0.0.1', port=8080, debug=True)
