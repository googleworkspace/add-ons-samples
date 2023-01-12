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

import { LitElement, css, html } from 'lit'
import { customElement, state, query } from 'lit/decorators.js'
import { asyncAppsScriptFunction } from './script-utils';
import { CellData } from '../shared/types';
import { parse, print } from 'graphql';

import '@material/mwc-button';
import '@material/mwc-textarea';
import '@material/mwc-checkbox';
import '@material/mwc-formfield';

const getActiveCell = asyncAppsScriptFunction<[],CellData> ('getActiveValue');
const setActiveCell = asyncAppsScriptFunction<[CellData], void>('setActiveValue');

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('app-query-editor')
export class QueryEditorElement extends LitElement {
  @state()
  private _busy = false;

  @state()
  private _cellLocation = '';

  @state()
  private _query = '';

  @state()
  private _includeHeaders = false;

  @state()
  private _error: string | undefined;

  @query('#query', true) _queryInput!: HTMLInputElement;
  @query('#includeHeaders', true) _includeHeadersInput!: HTMLInputElement;

  connectedCallback() {
    super.connectedCallback();
    this._fetchCurrentCellData();
  }

  render() {
    if (this._cellLocation === '' && this._busy) {
      return html`<div class="builder">Loading...</div>`;
    }
    const errorDiv = this._error !== undefined ?
     html`<div class="error">${this._error}</div>` :
     undefined;
    return html`
      ${errorDiv}
      <div>Learn more with the <a target="_blank" href="https://docs.github.com/en/graphql/overview/explorer">GitHub GraphQL Explorer.</a></div>
      <div>Editing cell: ${this._cellLocation}</div>
      <mwc-formfield label="Include header row?">
        <mwc-checkbox id="includeHeaders" ?checked=${this._includeHeaders}></mwc-checkbox>
      </mwc-formfield>
      <mwc-textarea id="query" fullwidth rows=5 label="Query" required value=${this._query}></mwc-textarea>
      <mwc-button unelevated label="Save" @click=${this._save} ?disabled=${this._busy}></mwc-button>
    `;
  }

  private async _asyncCall(fn: () => Promise<void>) {
    this._busy = true;
    this._error = undefined;
    try {
        await fn();
    } catch (err) {
      this._handleError(err);
    } finally {
      this._busy = false;
    }
  }

  private async _fetchCurrentCellData() {
    this._asyncCall(async () => {
      const data = await getActiveCell();
      this._cellLocation = data.location ?? '';
      if (!data.expression) {
        this._query = '';
        return;
      }
      [this._query, this._includeHeaders] = this._parseCellValue(data.expression);
    });
  }

  private _buildCellValue(query: string, includeHeaders: boolean) {
    query = query
      .replaceAll('"', '""')
      .replaceAll("\n", ' ')
      .replaceAll(/\s+/g, ' ');
    return `=GITHUB_QUERY("${query}", ${includeHeaders})`;
  }

  private _parseCellValue(expression: string): [string, boolean] {
    const re = /^=GITHUB_QUERY\("([\s\S\n]*)"(?:\s*,\s*(\w+))\s*\)/gm;
    const match = re.exec(expression);
    if (!match) {
      return ['', false];
    }

    expression = match[1];
    expression = expression.replaceAll('""', '"');
    const includeHeaders = match[2]?.toLowerCase() === 'true';
    const ast = parse(expression);
    if (!ast) {
      return [expression, includeHeaders];
    }    
    return [print(ast), includeHeaders];
  }

  private async _save() {
    return this._asyncCall(async () => {
      const query = this._queryInput.value;
      if (!query) {
        throw new Error('Query is empty.');
      }
      const includeHeaders = this._includeHeadersInput.checked;
      const value = this._buildCellValue(query, includeHeaders);
      const data ={
        location: this._cellLocation,
        expression: value,
      };
      await setActiveCell(data);
      google.script.host.close();  
    });
  }

  private _handleError(err: unknown) {
    if (err === null || err === undefined) {
      this._error = undefined;
    } else if (err instanceof Error) {
      this._error = err.message;
    } else {
      this._error = 'Oops, something went wrong!';
    }
  }

  static styles = css`
    :host {
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--size-3);
      display: flex;
      flex-direction: column;
      padding: var(--size-3);
      gap: var(--size-3);
    }

    .error {
      padding: var(--size-3);
      background-color: var(--red-3);
      border: var(--border-size-1) solid var(--red-4);
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'app-query-editor': QueryEditorElement
  }
}
