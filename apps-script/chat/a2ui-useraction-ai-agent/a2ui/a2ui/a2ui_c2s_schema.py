# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


# a2ui_c2s_schema.py

# A2UI v0.8 schema definition for messages exchanged between the UI and the agent.
A2UI_C2S_SCHEMA = r'''
{
  "title": "A2UI (Agent to UI) Client-to-Server Event Schema",
  "description": "Describes a JSON payload for a client-to-server event message.",
  "type": "object",
  "minProperties": 1,
  "maxProperties": 1,
  "properties": {
    "userAction": {
      "type": "object",
      "description": "Reports a user-initiated action from a component.",
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the action, taken from the component's action.name property."
        },
        "surfaceId": {
          "type": "string",
          "description": "The id of the surface where the event originated."
        },
        "sourceComponentId": {
          "type": "string",
          "description": "The id of the component that triggered the event."
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "An ISO 8601 timestamp of when the event occurred."
        },
        "context": {
          "type": "object",
          "description": "A JSON object containing the key-value pairs from the component's action.context, after resolving all data bindings.",
          "additionalProperties": true
        }
      },
      "required": [
        "name",
        "surfaceId",
        "sourceComponentId",
        "timestamp",
        "context"
      ]
    },
    "error": {
      "type": "object",
      "description": "Reports a client-side error. The content is flexible.",
      "additionalProperties": true
    }
  },
  "oneOf": [
    { "required": ["userAction"] },
    { "required": ["error"] }
  ]
}
'''