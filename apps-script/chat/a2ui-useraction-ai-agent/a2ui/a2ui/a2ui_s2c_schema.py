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


# a2ui_s2c_schema.py

# A2UI v0.8 schema definition for messages exchanged between the agent and the UI.
# Note: only a subset of the default catalog schema is included inline here.
A2UI_S2C_SCHEMA = r'''
{
  "title": "A2UI Message Schema",
  "description": "Describes a JSON payload for an A2UI (Agent to UI) message, which is used to dynamically construct and update user interfaces. A message MUST contain exactly ONE of the action properties: 'beginRendering', 'surfaceUpdate', 'dataModelUpdate', or 'deleteSurface'.",
  "type": "object",
  "properties": {
    "beginRendering": {
      "type": "object",
      "description": "Signals the client to begin rendering a surface with a root component and specific styles.",
      "properties": {
        "surfaceId": {
          "type": "string",
          "description": "The unique identifier for the UI surface to be rendered."
        },
        "root": {
          "type": "string",
          "description": "The ID of the root component to render."
        },
        "styles": {
          "type": "object",
          "description": "Styling information for the UI.",
          "properties": {
            "font": {
              "type": "string",
              "description": "The primary font for the UI."
            },
            "primaryColor": {
              "type": "string",
              "description": "The primary UI color as a hexadecimal code (e.g., '#00BFFF').",
              "pattern": "^#[0-9a-fA-F]{6}$"
            }
          }
        }
      },
      "required": ["root", "surfaceId"]
    },
    "surfaceUpdate": {
      "type": "object",
      "description": "Updates a surface with a new set of components.",
      "properties": {
        "surfaceId": {
          "type": "string",
          "description": "The unique identifier for the UI surface to be updated. If you are adding a new surface this *must* be a new, unique identified that has never been used for any existing surfaces shown."
        },
        "components": {
          "type": "array",
          "description": "A list containing all UI components for the surface.",
          "minItems": 1,
          "items": {
            "type": "object",
            "description": "Represents a *single* component in a UI widget tree. This component could be one of many supported types.",
            "properties": {
              "id": {
                "type": "string",
                "description": "The unique identifier for this component."
              },
              "weight": {
                "type": "number",
                "description": "The relative weight of this component within a Row or Column. This corresponds to the CSS 'flex-grow' property. Note: this may ONLY be set when the component is a direct descendant of a Row or Column."
              },
              "component": {
                "type": "object",
                "description": "A wrapper object that MUST contain exactly one key, which is the name of the component type (e.g., 'Heading'). The value is an object containing the properties for that specific component.",
                "properties": {
                  "Text": {
                    "type": "object",
                    "properties": {
                      "text": {
                        "type": "object",
                        "description": "The text content to display. This can be a literal string or a reference to a value in the data model ('path', e.g., '/doc/title'). While simple Markdown formatting is supported (i.e. without HTML, images, or links), utilizing dedicated UI components is generally preferred for a richer and more structured presentation.",
                        "properties": {
                          "literalString": {
                            "type": "string"
                          },
                          "path": {
                            "type": "string"
                          }
                        }
                      },
                      "usageHint": {
                        "type": "string",
                        "description": "A hint for the base text style. One of:\n- `h1`: Largest heading.\n- `h2`: Second largest heading.\n- `h3`: Third largest heading.\n- `h4`: Fourth largest heading.\n- `h5`: Fifth largest heading.\n- `caption`: Small text for captions.\n- `body`: Standard body text.",
                        "enum": [
                          "h1",
                          "h2",
                          "h3",
                          "h4",
                          "h5",
                          "caption",
                          "body"
                        ]
                      }
                    },
                    "required": ["text"]
                  },
                  "Image": {
                    "type": "object",
                    "properties": {
                      "url": {
                        "type": "object",
                        "description": "The URL of the image to display. This can be a literal string ('literal') or a reference to a value in the data model ('path', e.g. '/thumbnail/url').",
                        "properties": {
                          "literalString": {
                            "type": "string"
                          },
                          "path": {
                            "type": "string"
                          }
                        }
                      }
                    "required": ["url"]
                  },
                  "Divider": {
                    "type": "object",
                    "properties": {}
                  },
                  "Button": {
                    "type": "object",
                    "properties": {
                      "child": {
                        "type": "string",
                        "description": "The ID of the component to display in the button, typically a Text component."
                      },
                      "action": {
                        "type": "object",
                        "description": "The client-side action to be dispatched when the button is clicked. It includes the action's name and an optional context payload.",
                        "properties": {
                          "name": {
                            "type": "string"
                          },
                          "context": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "key": {
                                  "type": "string"
                                },
                                "value": {
                                  "type": "object",
                                  "description": "Defines the value to be included in the context as either a literal value or a path to a data model value (e.g. '/user/name').",
                                  "properties": {
                                    "path": {
                                      "type": "string"
                                    },
                                    "literalString": {
                                      "type": "string"
                                    },
                                    "literalNumber": {
                                      "type": "number"
                                    },
                                    "literalBoolean": {
                                      "type": "boolean"
                                    }
                                  }
                                }
                              },
                              "required": ["key", "value"]
                            }
                          }
                        },
                        "required": ["name"]
                      }
                    },
                    "required": ["child", "action"]
                  },
                  "CheckBox": {
                    "type": "object",
                    "properties": {
                      "label": {
                        "type": "object",
                        "description": "The text to display next to the checkbox. Defines the value as either a literal value or a path to data model ('path', e.g. '/option/label').",
                        "properties": {
                          "literalString": {
                            "type": "string"
                          },
                          "path": {
                            "type": "string"
                          }
                        }
                      },
                      "value": {
                        "type": "object",
                        "description": "The current state of the checkbox (true for checked, false for unchecked). This can be a literal boolean ('literalBoolean') or a reference to a value in the data model ('path', e.g. '/filter/open').",
                        "properties": {
                          "literalBoolean": {
                            "type": "boolean"
                          },
                          "path": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "required": ["label", "value"]
                  }
                }
              }
            },
            "required": ["id", "component"]
          }
        }
      },
      "required": ["surfaceId", "components"]
    },
    "dataModelUpdate": {
      "type": "object",
      "description": "Updates the data model for a surface.",
      "properties": {
        "surfaceId": {
          "type": "string",
          "description": "The unique identifier for the UI surface this data model update applies to."
        },
        "path": {
          "type": "string",
          "description": "An optional path to a location within the data model (e.g., '/user/name'). If omitted, or set to '/', the entire data model will be replaced."
        },
        "contents": {
          "type": "array",
          "description": "An array of data entries. Each entry must contain a 'key' and exactly one corresponding typed 'value*' property.",
          "items": {
            "type": "object",
            "description": "A single data entry. Exactly one 'value*' property should be provided alongside the key.",
            "properties": {
              "key": {
                "type": "string",
                "description": "The key for this data entry."
              },
              "valueString": {
                "type": "string"
              },
              "valueNumber": {
                "type": "number"
              },
              "valueBoolean": {
                "type": "boolean"
              },
              "valueMap": {
                "description": "Represents a map as an adjacency list.",
                "type": "array",
                "items": {
                  "type": "object",
                  "description": "One entry in the map. Exactly one 'value*' property should be provided alongside the key.",
                  "properties": {
                    "key": {
                      "type": "string"
                    },
                    "valueString": {
                      "type": "string"
                    },
                    "valueNumber": {
                      "type": "number"
                    },
                    "valueBoolean": {
                      "type": "boolean"
                    }
                  },
                  "required": ["key"]
                }
              }
            },
            "required": ["key"]
          }
        }
      },
      "required": ["contents", "surfaceId"]
    },
    "deleteSurface": {
      "type": "object",
      "description": "Signals the client to delete the surface identified by 'surfaceId'.",
      "properties": {
        "surfaceId": {
          "type": "string",
          "description": "The unique identifier for the UI surface to be deleted."
        }
      },
      "required": ["surfaceId"]
    }
  }
}
'''