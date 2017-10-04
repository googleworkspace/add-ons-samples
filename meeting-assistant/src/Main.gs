// Copyright 2017 Google Inc. All Rights Reserved.
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

var DEBUG = true;
var DEFAULT_SEARCH_RANGE_DAYS = 28;
var DEFAULT_DURATION_MINUTES = 30;
var DEFAULT_MAX_FREE_TIMES = 5;
var DEFAULT_START_HOUR = 8; // 8 AM
var DEFAULT_END_HOUR = 18; // 6 PM
var DEFAULT_ALLOW_WEEKENDS = false;
var DEFAULT_MEETING_INTERVAL_MINUTES = 30;
var DEFAULT_DEADLINE_SECONDS = 20;
var WEEKDAYS = [1, 2, 3, 4, 5]; // Weekeday values used by momentjs

/**
 * Typedef for error handler callbacks. Provided for reference.
 * 
 * @callback ErrorHandler
 * @param {Error} exception - Exception to handle
 * @Return {Card|ActionResponse|UnivseralActionResponse} optional card or action response to render
 */

/** 
 * Entry point for the add-on. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {UniversalActionResponse}
 */
function handleShowScheduler(event) {
  event.parameters.action = "ShowSearchForm";
  return dispatchActionInternal(event, universalActionErrorHandler);
}

/** 
 * Entry point for the add-on. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {UniversalActionResponse}
 */
function handleShowSettings(event) {
  event.parameters.action = "ShowSettings";
  return dispatchActionInternal(event, universalActionErrorHandler);
}
/** 
 * Entry point for secondary actions. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {ActionResponse} Card or form action
 */
function dispatchAction(event) {
  return dispatchActionInternal(event, actionErrorHandler);
}

/**
 * Validates and dispatches an action.
 *
 * @param {Event} event - user event to process
 * @param {ErrorHandler} opt_errorHandler - Handles errors, optionally 
 *        returning a card or action response.
 * @return {ActionResponse|UniversalActionResponse|Card}
 */
function dispatchActionInternal(event, opt_errorHandler) {
  if (DEBUG) {
    console.time("dispatchActionInternal");
    console.log(event);
  }

  try {
    var actionName = event.parameters.action;
    if (!actionName) {
      throw new Error("Missing action name.");
    }

    var actionFn = ActionHandlers[actionName];
    if (!actionFn) {
      throw new Error("Action not found: " + actionName);
    }

    return actionFn(event);
  } catch (err) {
    console.error(err);
    if (opt_errorHandler) {
      return opt_errorHandler(err);
    } else {
      throw err;
    }
  } finally {
    if (DEBUG) {
      console.timeEnd("dispatchActionInternal");
    }
  }
}

/**
 * Handle unexpected errors for the main universal action entry points.
 *
 * @type ErrorHandler
 */
function universalActionErrorHandler(err) {
  var card = buildErrorCard({
    exception: err,
    showStackTrace: DEBUG
  });
  return CardService.newUniversalActionResponseBuilder()
    .displayAddOnCards([card])
    .build();
}

/**
 * Handle unexpected errors for secondary actions.
 *
 * @type ErrorHandler
 */
function actionErrorHandler(err) {
  var card = buildErrorCard({
    exception: err,
    showStackTrace: DEBUG
  });
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}
