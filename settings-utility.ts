/**
 * @fileoverview The "Settings" utility component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { sharedStyles } from './shared-styles.js';

@customElement('settings-utility')
export class SettingsUtility extends LitElement {
    
    static override styles = [sharedStyles];

    override render() {
        return html`
            <div class="panel">
                <h2 class="page-title">Settings</h2>
                <div class="control-group">
                    <h3>API Keys</h3>
                    <div class="row">
                        <div>
                            <label>Gemini API Key</label>
                            <input type="password" value="**************">
                        </div>
                    </div>
                </div>
                <div class="control-group">
                    <h3>God Mode Defaults</h3>
                     <p class="sub-label">Configure the default behavior for the automated "Quick Drop" and "God Mode" workflows.</p>
                     <div class="row">
                         <div>
                            <label>Default Mastering Profile</label>
                            <select>
                                <option>Streaming (-14 LUFS)</option>
                                <option>Club (-9 LUFS)</option>
                            </select>
                        </div>
                     </div>
                </div>
                 <div class="control-group">
                    <h3>Render Queue</h3>
                    <div class="row">
                        <div>
                            <label>GPU Device</label>
                            <select>
                                <option>Auto-Select</option>
                                <option>NVIDIA GeForce RTX 4090</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}