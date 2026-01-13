// Copyright 2026 Google LLC. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Basic A2UI to UI Kit renderer
// It's limited in scope and only supports a subset of A2UI features.
// See https://a2ui.org

// Extracts A2UI response parts (final text and JSON) from the agent response message.
function extractA2UIParts(input) {
  const separator = "---a2ui_JSON---";
  if (!input.includes(separator)) {
    return {
      text: input,
      json: null
    };
  }
  const parts = input.split(separator);
  return {
    text: parts[0].trim(),
    json: JSON.parse(parts[1].trim())
  };
}

// Creates UI Kit widgets based on A2UI JSON schema response from the agent.
function createWidgetsFromA2UI(a2ui) {
  let widgetWithIds = [];
  if (a2ui) {
    // Update data model
    // Extract flattened data model paths for easy access later when rendering components
    let dataModel = {};
    const dataModelUpdate = extractValueFromKey(a2ui, "dataModelUpdate");
    if (dataModelUpdate) {
      dataModel = extractDataModelAsFlattenPaths(dataModelUpdate);
    }
    console.log(`Extracted (flattened) data model paths: ${JSON.stringify(dataModel)}`);

    // Update surface
    // Render components in sequence
    const surfaceUpdate = extractValueFromKey(a2ui, "surfaceUpdate");
    if (surfaceUpdate && surfaceUpdate.components) {
      let alreadyProcessedChildren = [];
      // All buttons are grouped in a single button set at the end
      const buttonSet = CardService.newButtonSet();
      let hasButtons = false;
      surfaceUpdate.components.forEach(c => {
        if (alreadyProcessedChildren.includes(c.id)) {
          // This child component has already been processed as part of a parent component
          // It's not rendered separately
          return;
        }
        const component = c.component;
        switch (Object.keys(component)[0]) {
          case 'Text':
            const textParagraph = CardService.newTextParagraph();
            textParagraph.setText(extractTextValue(component["Text"].text, dataModel));
            widgetWithIds.push({ id: c.id, widget: textParagraph });
            break;
          case 'Image':
            const image = CardService.newImage();
            image.setImageUrl(extractTextValue(component["Image"].url, dataModel));
            widgetWithIds.push({ id: c.id, widget: image});
            break;
          case 'Button':
            hasButtons = true;
            // Processing the button
            let buttonText = "Open";
            // Check if the button has a child Text component for its label
            const buttonTextChildComponentId = extractTextValue(component["Button"].child, dataModel);
            if (buttonTextChildComponentId) {
              // Find the child component by its ID
              const buttonTextChildComponent = surfaceUpdate.components.find(component => component.id === buttonTextChildComponentId);
              buttonText = extractTextValue(buttonTextChildComponent.component["Text"].text, dataModel);
              // Mark the child component as already processed
              alreadyProcessedChildren.push(buttonTextChildComponentId);
              // Remove the child component from the main widget list if it was already added (order of components is not guaranteed)
              widgetWithIds = widgetWithIds.filter(w => w.id !== buttonTextChildComponentId);
            } else if (Object.keys(component["Button"].child)[0] === 'Text') {
              // Label text is provided inline, not as a reference to a child Text component
              buttonText = extractTextValue(component["Button"].child['Text'].text, dataModel);
            }
            buttonSet.addButton(CardService.newTextButton()
              .setText(buttonText)
              .setOpenLink(CardService.newOpenLink().setUrl(extractTextValue(component["Button"].action.context[0].value, dataModel))));
            break;
          default:
            console.warn(`Could not render component: ${JSON.stringify(c)}`);
        }
      });
      // Add the button set widget if there are any buttons
      if (hasButtons) {
        widgetWithIds.push({ id: 'button_set', widget: buttonSet});
      }
    }
  }
  console.log(`Widget with IDs: ${JSON.stringify(widgetWithIds)}`);
  // Return only the widgets to be used in a card
  return widgetWithIds.map(w => w.widget);
}

function extractValueFromKey(object, key) {
  const keyedObject = object.find(c => Object.keys(c)[0] === key)
  return keyedObject ? keyedObject[key] : null;
}

function extractTextValue(textValue, dataModel) {
  return typeof textValue === 'string' || textValue instanceof String
      ? textValue
      : (textValue.literalString
          ? textValue.literalString :
          (textValue.path && dataModel[textValue.path]
              ? dataModel[textValue.path]
              : ""));
}

function extractDataModelAsFlattenPaths(dataModelUpdate) {
  var result = {};
  if (dataModelUpdate.contents) {
    var rootPath = dataModelUpdate.path || "";
    var contents = dataModelUpdate.contents;
    flattenContents_(contents, rootPath, result);
  }
  return result;
}

function flattenContents_(contents, parentPath, result) {
  contents.forEach(item => {
    if (!item.key) return;
    var currentPath = joinPath_(parentPath, item.key);
    var value = getPrimitiveValue_(item);
    if (value !== undefined) {
      result[currentPath] = value;
    } else if (item.valueMap !== undefined && Array.isArray(item.valueMap)) {
      flattenContents_(item.valueMap, currentPath, result);
    }
  });
}

function getPrimitiveValue_(item) {
  if (item.valueString !== undefined) return item.valueString;
  if (item.valueNumber !== undefined) return item.valueNumber;
  if (item.valueBoolean !== undefined) return item.valueBoolean;
  return undefined;
}

function joinPath_(parent, key) {
  if (!parent) return key;
  if (parent === "/") return "/" + key; // Avoid "//key"
  if (parent.endsWith("/")) return parent + key;
  return parent + "/" + key;
}
