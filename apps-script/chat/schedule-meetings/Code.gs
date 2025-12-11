// To learn how to use this script, refer to the documentation:
// https://developers.google.com/workspace/add-ons/samples/tutorial-schedule-meetings

/*
Copyright 2022 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Command IDs
const COMMANDS = {
  HELP: 1, // /help
  DIALOG: 2, // /schedule_Meeting
};

/**
 * Responds to a added to space event in Google Chat.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Response from the Chat app.
 */
function onAddedToSpace(event) {
  // Lets users know what they can do and how they can get help.
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: `Hi there! I can quickly schedule a meeting for you with just a few clicks. Try me out by typing */schedule_Meeting*. To learn what else I can do, type */help*.`
  }}}}};
}

/**
 * Responds to a message event in Google Chat.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Response from the Chat app.
 */
function onMessage(event) {
  // Displays help message to users.
  return getHelpTextResponse_();
}

/**
 * Responds to an app command event in Google Chat.
 *
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Response from the Chat app.
 */
function onAppCommand(event) {
  // Executes the app command logic based on ID.
  switch (event.chat.appCommandPayload.appCommandMetadata.appCommandId) {
    case COMMANDS.DIALOG:
      // Displays meeting dialog for /schedule_Meeting.
      return getInputFormAsDialog_({
        invitee: "",
        startTime: getTopOfHourDateString_(),
        duration: 30,
        subject: "Status Stand-up",
        body: "Scheduling a quick status stand-up meeting.",
      });
    case COMMANDS.HELP:
      // Displays help message for /help.
      return getHelpTextResponse_();
  }
}

/**
 * Handles the form submission from the meeting scheduling dialog.
 * 
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Response from the Chat app.
 */
function handleFormSubmit(event) {
  const recipients = getFieldValue_(event.commonEventObject.formInputs, "email");
  const subject = getFieldValue_(event.commonEventObject.formInputs, "subject");
  const body = getFieldValue_(event.commonEventObject.formInputs, "body");

  // Assumes dialog card inputs for date and times are in the correct format. mm/dd/yyy HH:MM
  const dateTimeInput = getFieldValue_(event.commonEventObject.formInputs, "date");
  const startTime = getStartTimeAsDateObject_(dateTimeInput);
  const duration = Number(
    getFieldValue_(event.commonEventObject.formInputs, "duration"),
  );

  // Handles instances of missing or invalid input parameters.
  const errors = [];
  if (!recipients) {
    errors.push("Missing or invalid recipient email address.");
  }
  if (!subject) {
    errors.push("Missing subject line.");
  }
  if (!body) {
    errors.push("Missing event description.");
  }
  if (!startTime) {
    errors.push("Missing or invalid start time.");
  }
  if (!duration || Number.isNaN(duration)) {
    errors.push("Missing or invalid duration");
  }
  if (errors.length) {
    // Redisplays the form if missing or invalid inputs exist.
    return getInputFormAsDialog_({
      errors,
      invitee: recipients,
      startTime: dateTimeInput,
      duration,
      subject,
      body,
    });
  }

  // Calculates the end time via duration.
  const endTime = new Date(startTime.valueOf());
  endTime.setMinutes(endTime.getMinutes() + duration);

  // Creates calendar event with notification.
  const calendar = CalendarApp.getDefaultCalendar();
  const scheduledEvent = calendar.createEvent(subject, startTime, endTime, {
    guests: recipients,
    sendInvites: true,
    description: `${body}\nThis meeting scheduled by a Google Chat App!`,
  });

  // Gets a link to the Calendar event.
  const url = getCalendarEventURL_(scheduledEvent, calendar);

  return getConfirmationDialog_(url);
}

/**
 * Handles the form submission from the meeting scheduling dialog confirmation.
 * 
 * @param {Object} event The event object from the Google Workspace add-on.
 * @return {Object} Response from the Chat app.
 */
function closeDialog(event) {
  return { action: {
    navigations: [{ endNavigation: { action: "CLOSE_DIALOG"}}],
    notification: { text: "Success!" }
  }};
}

/**
 * Gets the help text message creation response.
 * 
 * @return {Object} Response from the Chat app.
 */
function getHelpTextResponse_() {
  const help = `*Meeting Scheduler* lets you quickly create meetings from Google Chat. Here\'s a list of all its commands:

  - \`/schedule_Meeting\`  Opens a dialog with editable, preset parameters to create a meeting event
  - \`/help\`  Displays this help message
  
Learn more about creating Chat apps built as Google Workspace add-on at https://developers.google.com/workspace/add-ons/chat.`;

  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: {
    text: help
  }}}}};
}
