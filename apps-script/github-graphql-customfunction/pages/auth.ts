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
import { customElement, state } from 'lit/decorators.js'
import { asyncAppsScriptFunction } from './script-utils';
import { AuthInfo } from '../shared/types';

import '@material/mwc-button';

const getAuthorizationState = asyncAppsScriptFunction<[], AuthInfo>('getAuthorizationState');
const disconnect = asyncAppsScriptFunction<[], AuthInfo>('disconnect');

/**
 * Custom element for managing the oauth connection.
 */
@customElement('app-auth-info')
export class AppAuthElement extends LitElement {
  @state()
  private _busy = false;

  @state()
  private _error: string | undefined;

  @state()
  private _state: AuthInfo | null = null;

  @state()
  private _popup: Window | null = null;

  constructor() {
    super();
    // Ensure storage event listener is bound to this
    this._handleAuthComplete = this._handleAuthComplete.bind(this);
  }

  /**
   * Initialize when component first mounted.
   */
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('storage', this._handleAuthComplete);
    this._fetchAuthState();
  }

  /**
   * Cleanup when dismounted
   */
  disconnectedCallback() {
    window.removeEventListener('storage', this._handleAuthComplete);
  }

  /**
   * Render component
   */
  render() {
    if (this._state === null && this._busy) {
      return html`<div class="auth">Loading...</div>`;
    }
    if (this._error) {
      return html`
        <div class="error">${this._error}</div>
      `;
    }
    if (this._state?.authorized) {
      return html`
        <div>Sheet authorized as: ${this._state.user}</div>
        <div class="buttons">
          <mwc-button unelevated label="Reauthorize" @click=${this._authorize} ?disabled=${this._busy}></mwc-button>
          <mwc-button unelevated label="Disconnect" @click=${this._disconnect} ?disabled=${this._busy}></mwc-button>
        </div>
      `;
    }
    return html`
      <div>Click authorize to connect this sheet with your GitHub account.</div>
      <div class="buttons">
        <mwc-button unelevated label="Authorize" @click=${this._authorize} ?disabled=${this._busy}></mwc-button>
      </div>
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

  private async _fetchAuthState() {
    this._asyncCall(async () => {
      this._state = await getAuthorizationState();
    });
  }

  private _authorize() {
    const windowFeatures = "left=100,top=100,width=320,height=320";
    this._popup = window.open(this._state?.authorizationUrl, "authWindow", windowFeatures);
    if (!this._popup) {
      this._error = 'Unable to open pop-up.';
    }
  }


  private async _disconnect() {
    this._asyncCall(async () => {
      this._state = await disconnect();
    });
  }

  private _handleAuthComplete() {
    if (!this._popup) {
      return;
    }

    this._popup.close();
    this._popup = null;
    this._fetchAuthState();
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
      gap: var(--size-3);
    }

    .error {
      padding: var(--size-3);
      background-color: var(--red-3);
      border: var(--border-size-1) solid var(--red-4);
    }
    
    .button-list {
      display: flex;
      gap: var(--size-3);
    }    
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'app-auth-info': AppAuthElement
  }
}
