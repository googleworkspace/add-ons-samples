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

////////////////////////////////////////////////////
// --- A2UI to UI Kit logic                      ---
////////////////////////////////////////////////////

// Creates UI Kit widgets based on A2UI response.
function createWidgetsFromA2UI(a2ui, messageId) {
  let widgetWithIds = [];
  if (a2ui) {
    // Update data model
    let dataModel = {};
    const dataModelUpdate = extractValueFromKey(a2ui, "dataModelUpdate");
    if (dataModelUpdate) {
      dataModel = extractDataModelAsFlattenPaths(dataModelUpdate);
    }
    console.log(`Extracted paths: ${JSON.stringify(dataModel)}`);

    // Update surface
    const surfaceUpdate = extractValueFromKey(a2ui, "surfaceUpdate");
    if (surfaceUpdate && surfaceUpdate.components) {
      const surfaceUpdateId = surfaceUpdate.surfaceId;
      let alreadyProcessedChildren = [];
      surfaceUpdate.components.forEach(c => {
        if (alreadyProcessedChildren.includes(c.id)) {
          return;
        }
        const component = c.component;
        switch (Object.keys(component)[0]) {
          case 'Divider':
            const divider = CardService.newDivider();
            widgetWithIds.push({ id: c.id, widget: divider });
            break;
          case 'Text':
            const textParagraph = CardService.newTextParagraph();
            let text = extractTextValue(component["Text"].text, dataModel);
            if (component["Text"].usageHint) {
              const usageHint = extractTextValue(component["Text"].usageHint, dataModel);
              if (usageHint.startsWith("h")) {
                text = `<${usageHint}>${text}</${usageHint}>`;
              }
            }
            textParagraph.setText(text);
            widgetWithIds.push({ id: c.id, widget: textParagraph });
            break;
          case 'Image':
            const image = CardService.newImage();
            image.setImageUrl(extractTextValue(component["Image"].url, dataModel));
            widgetWithIds.push({ id: c.id, widget: image});
            break;
          case 'Button':
            // Processing the button text which is returned as a child text component
            let buttonText = "Open";
            const buttonTextChildComponentId = extractTextValue(component["Button"].child, dataModel);
            if (buttonTextChildComponentId) {
              const buttonTextChildComponent = getA2UIComponent(surfaceUpdate.components, buttonTextChildComponentId);
              buttonText = extractTextValue(buttonTextChildComponent.component["Text"].text, dataModel);
              alreadyProcessedChildren.push(buttonTextChildComponentId);
              widgetWithIds = widgetWithIds.filter(w => w.id !== buttonTextChildComponentId);
            } else if (Object.keys(component["Button"].child)[0] === 'Text') {
              buttonText = extractTextValue(component["Button"].child['Text'].text, dataModel);
            }
            const textButton = CardService.newTextButton();
            textButton.setText(buttonText);
            const buttonTextActionName = extractTextValue(component["Button"].action.name, dataModel);
            if (buttonTextActionName === "open_url") {
              textButton.setOpenLink(CardService.newOpenLink().setUrl(extractTextValue(component["Button"].action.context[0].value, dataModel)));
            } else {
              textButton.setOnClickAction(CardService.newAction()
                .setFunctionName('sendUserAction')
                .setLoadIndicator(CardService.LoadIndicator.SPINNER)
                .setParameters({
                  messageId: messageId,
                  name: extractTextValue(component["Button"].action.name, dataModel),
                  surfaceId: surfaceUpdateId,
                  sourceComponentId: c.id,
                  timestamp: new Date().toISOString(),
                  context: JSON.stringify(component["Button"].action.context)
                }))
            }
            const buttonSet = CardService.newButtonSet();
            buttonSet.addButton(textButton);
            widgetWithIds.push({ id: c.id, widget: buttonSet});
            break;
          default:
            console.warn(`Could not render component: ${JSON.stringify(c)}`);
        }
      });
    }
  }
  console.log(`Widget with IDs: ${JSON.stringify(widgetWithIds)}`);
  return widgetWithIds.map(w => w.widget);
}

function sendUserAction(event) {
  if (isInDebugMode()) {
    console.log(`Send user action event received (Chat): ${JSON.stringify(event)}`);
  }
  // Extract data from the event.
  const chatEvent = event.chat;

  // Pop the message ID
  const messageId = event.commonEventObject.parameters.messageId;
  delete event.commonEventObject.parameters.messageId;
  // Decode context object value encoded as JSON string
  event.commonEventObject.parameters.context = JSON.parse(event.commonEventObject.parameters.context);
  // Request AI agent to update the message
  updateMessage(messageId, requestAgent("You made your selection", chatEvent.user.name.replace(USERS_PREFIX, ''), JSON.stringify({ userAction: event.commonEventObject.parameters })))
  // Respond with an empty response to the Google Chat platform to acknowledge execution
  return null; 
}

function extractValueFromKey(object, key) {
  const keyedObject = object.find(c => Object.keys(c)[0] === key)
  return keyedObject ? keyedObject[key] : null;
}

function getA2UIComponent(components, id) {
  return components.find(component => component.id === id);
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
