/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AuthInfo, CellData } from '../shared/types';
import { getAuthorizedUser, runQuery } from './github';
import { objectToCellData } from './utils';
import { getOAuthService } from './oauth';

/**
 * Adds a custom menu with items to show the sidebar and dialog.
 */
export function onOpen() {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Edit GraphQL query', 'showFunctionBuilder')
    .addItem('Authorize', 'showAuthorization')
    .addToUi();
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initialization work is done immediately.
 */
export function onInstall() {
  onOpen();
}

/**
 * Displays the GraphQL query editor for a cell
 */
export function showFunctionBuilder() {
  const ui = HtmlService.createHtmlOutputFromFile('query-editor')
    .setWidth(600)
    .setHeight(400)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, 'Query Editor');
}

/**
 * Displays authorization info for the sheet
 */
 export function showAuthorization() {
  const ui = HtmlService.createHtmlOutputFromFile('authorize')
    .setWidth(600)
    .setHeight(400)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, 'Authorize Add-on');
}

/**
 * Fetch the currently selected for editing.
 *
 * @return The location & value of the active cell.
 */
export function getActiveValue(): CellData {
  // Retrieve and return the information requested by the sidebar.
  const cell = SpreadsheetApp.getActiveSheet().getActiveCell();
  return {
    location: cell.getA1Notation(),
    expression: cell.getFormula()
  };
}

/**
 * Replaces the active cell value with the given value.
 *
 * @param data - Update cell location/value to set.
 */
export function setActiveValue(data: CellData) {
  const cell = data.location ? 
    SpreadsheetApp.getActiveSheet().getRange(data.location).getCell(1, 1) :
    SpreadsheetApp.getActiveSheet().getActiveCell();
  cell.setFormula(data.expression ?? '');
}

/**
 * Custom function for executing a GraphQL query against the
 * GitHub API.
 * @returns 
 */
export function GITHUB_QUERY(query?: string, includeHeaders = false) {
  if (!query) {
    return [];
  }
  const res = runQuery(query);
  return objectToCellData(res, includeHeaders);
}

/**
 * Fetch the current oauth state for the user/document.
 * 
 * @returns Current oauth state.
 */
 export function getAuthorizationState(): AuthInfo {
  const service = getOAuthService();
  let user = undefined;
  try {
    user = getAuthorizedUser();
  } catch (err) {
    // Ignore failures
    console.error(err);
  }
  return {
    user,
    authorized: service.hasAccess(),
    authorizationUrl: service.getAuthorizationUrl()
  }
}

/**
 * Removes saved oauth credentials.
 * 
 * @returns Updated auth info.
 */
export function disconnect(): AuthInfo {
  const service = getOAuthService();
  service.reset();
  return getAuthorizationState();
}

/**
 * Handles the oauth callback.
 * 
 * @param request 
 * @returns HTML page to display to user
 */
export function authCallback(request: object): GoogleAppsScript.HTML.HtmlOutput {
  const service = getOAuthService();
  service.handleCallback(request);

  return HtmlService.createHtmlOutputFromFile('auth-complete')
}