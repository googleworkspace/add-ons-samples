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

/**
 * Typedef for events passed from Gmail to the add-on. Supplied for
 * reference.
 *
 * @typedef {Object} Event
 * @property {Object} parameters - Request parameters. Must include a
 *    key "action" with the name of the action to dispatch
 * @property {Object} formInput - Values of input fields
 */

/**
 * Error handler
 * @callback ErrorHandler
 * @param {Error} exception - Exception to handle
 * @return {Card|ActionResponse|UnivseralActionResponse} optional card or action response to render
 */

/**
 * Home page (contextless) entry point for the add-on.
 *
 * @param {Event} event - user event to process
 * @return {Card[]}
 */
function handleHomePage(event) {
  event.parameters = {action: 'showHomePage'};
  return dispatchActionInternal_(event, addOnErrorHandler);
}
/**
 * Main Gmail entry point for the add-on.
 *
 * @param {Event} event - user event to process
 * @return {Card[]}
 */
function handleGmailContext(event) {
  event.parameters = {action: 'showGmailContext'};
  return dispatchActionInternal_(event, addOnErrorHandler);
}

/**
 * Entry point for custom authorization screen.
 *
 * TODO - Remove once authorization error allows passing card directly
 *
 * @return {UniversalActionResponse} Card for authorization screen
 */
function handleShowSettings() {
  return dispatchActionInternal_(
      {
        parameters: {
          action: 'showSettings',
        },
      },
      universalActionErrorHandler
  );
}

/**
 * Entry point for custom authorization screen.
 *
 * TODO - Remove once authorization error allows passing card directly
 *
 * @return {Card} Card for authorization screen
 */
function handleAuthorizationRequired() {
  return dispatchActionInternal_({
    parameters: {
      action: 'showAuthorizationCard',
    },
  });
}

/**
 * Handles the OAuth response from GitHub.
 *
 * The redirect URL to enter is:
 * https://script.google.com/macros/d/<Apps Script ID>/usercallback
 *
 * See the Apps Script OAuth2 Library documentation for more
 * information:
 *
 * https://github.com/googleworkspace/apps-script-oauth2#1-create-the-oauth2-service
 *
 * @param {Object} oauthResponse - The request data received from the
 *     callback function. Pass it to the service"s handleCallback() method
 *     to complete the authorization process.
 * @return {HtmlOutput} a success or denied HTML message to display to
 *     the user. Also sets a timer to close the window automatically.
 */
function handleGitHubOAuthResponse(oauthResponse) {
  if (DEBUG) {
    console.time('handleGitHubOAuthResponse');
  }

  try {
    githubClient().handleOAuthResponse(oauthResponse);
    return HtmlService.createHtmlOutputFromFile('html/auth-success');
  } catch (e) {
    var template = HtmlService.createTemplateFromFile('html/auth-failure');
    template.errorMessage = e.toString();
    return template.evaluate();
  } finally {
    if (DEBUG) {
      console.timeEnd('handleGitHubOAuthResponse');
    }
  }
}

/**
 * Entry point for secondary actions. Handles an user event and
 * invokes the corresponding action
 *
 * @param {Event} event - user event to process
 * @return {ActionResponse} Card or form action
 */
function dispatchAction(event) {
  return dispatchActionInternal_(event, actionErrorHandler);
}

/**
 * Validates and dispatches an action.
 *
 * @param {Event} event - user event to process
 * @param {ErrorHandler} errorHandler - Handles errors, optionally
 *        returning a card or action response.
 * @return {ActionResponse|UniversalActionResponse|Card} Card or form action
 */
function dispatchActionInternal_(event, errorHandler) {
  if (DEBUG) {
    console.time('dispatchActionInternal');
    console.log(event);
  }

  try {
    var actionName = event.parameters.action;
    if (!actionName) {
      throw new Error('Missing action name.');
    }

    var actionFn = ActionHandlers[actionName];
    if (!actionFn) {
      throw new Error('Action not found: ' + actionName);
    }

    return actionFn(event);
  } catch (err) {
    console.error(err);
    if (errorHandler) {
      return errorHandler(err);
    } else {
      throw err;
    }
  } finally {
    if (DEBUG) {
      console.timeEnd('dispatchActionInternal');
    }
  }
}

/**
 * Handle unexpected errors for the main universal action entry points.
 *
 * @param {Error} err - Exception to handle
 * @return {Card|ActionResponse|UnivseralActionResponse} optional card or action response to render
 */
function addOnErrorHandler(err) {
  if (err instanceof AuthorizationRequiredException) {
    CardService.newAuthorizationException()
        .setAuthorizationUrl(githubClient().authorizationUrl())
        .setResourceDisplayName('GitHub')
        .setCustomUiCallback('handleAuthorizationRequired')
        .throwException();
  } else {
    return buildErrorCard({
      exception: err,
      showStackTrace: DEBUG,
    });
  }
}

/**
 * Handle unexpected errors for universal actions.
 *
 * @param {Error} err - Exception to handle
 * @return {UnivseralActionResponse} Universal action response to render
 */
function universalActionErrorHandler(err) {
  var card = addOnErrorHandler(err);
  return CardService.newUniversalActionResponseBuilder()
      .displayAddOnCards([card])
      .build();
}
/**
 * Handle unexpected errors for secondary actions.
 *
 * @param {Error} err - Exception to handle
 * @return {ActionResponse} Action response to render
 */
function actionErrorHandler(err) {
  var card = addOnErrorHandler(err);
  return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
}
