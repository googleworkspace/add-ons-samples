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
 * Callback for rendering the card for a specific Calendar event.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onCalendarEventOpen(e) {
  console.log(e);
  const calendar = CalendarApp.getCalendarById(e.calendar.calendarId);
  // The event metadata doesn't include the event's title, so using the
  // calendar.readonly scope and fetching the event by it's ID.
  const event = calendar.getEventById(e.calendar.id);
  if (!event) {
    // This is a new event still being created.
    return createCatCard('A new event! Am I invited?');
  }
  let title = event.getTitle();
  // If neccessary, truncate the title to fit in the image.
  title = truncate(title);
  return createCatCard(title);
}

