// Copyright 2020 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Callback for rendering the card for specific Drive items.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onDriveItemsSelected(e) {
  var items = e.drive.selectedItems;
  // Include at most 5 items in the text.
  items = items.slice(0, 5);
  // If neccessary, truncate the titles to fit in the image.
  var text = items.map(function(item) {
    return truncate(item.title);
  }).join('\n');
  return createCatCard(text);
}

