/**
 * @fileoverview The "Releases" utility component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { sharedStyles } from './shared-styles.js';
import { aiService } from './ai-service.js';

type Release = {
    title: string;
    art: string;
    status: 'Scheduled' | 'Released';
    date: string;
    platforms: string[];
};

type GeneratedCaption = {
    platform: string;
    caption: string;
};

@customElement('releases-utility')
export class ReleasesUtility extends LitElement {
    
    @state() private releases: Release[] = [
        { 
            title: "Cybernetic Dreams", 
            art: "https://placehold.co/80x80/5200ff/ffffff?text=CD",
            status: "Scheduled",
            date: "11/11/2024",
            platforms: ["Spotify", "Apple Music"]
        },
        { 
            title: "Summer Haze Remix", 
            art: "https://placehold.co/80x80/f97316/ffffff?text=SH",
            status: "Released",
            date: "10/28/2024",
            platforms: ["Spotify", "Apple Music", "YouTube"]
        }
    ];

    @state() private selectedRelease: Release | null = null;
    @state() private generatedCaptions: GeneratedCaption[] = [];
    @state() private isGeneratingCaptions = false;
    @state() private captionThemes = '';

    static override styles = [sharedStyles];

    public scheduleNewRelease(trackData: { title: string; art: string; }) {
        const newRelease: Release = {
            title: trackData.title,
            art: trackData.art || `https://placehold.co/80x80/5200ff/ffffff?text=${trackData.title.substring(0,2).toUpperCase()}`,
            status: 'Scheduled',
            date: new Date().toLocaleDateString('en-US'),
            platforms: ['Spotify', 'Apple Music'],
        };
        this.releases = [newRelease, ...this.releases];
    }
    
    private _openManageModal(release: Release) {
        this.selectedRelease = release;
        this.generatedCaptions = [];
        this.captionThemes = '';
    }

    private _closeManageModal() {
        this.selectedRelease = null;
    }

    private async _handleGenerateCaptions() {
        if (!this.selectedRelease) return;

        this.isGeneratingCaptions = true;
        this.generatedCaptions = [];
        
        const platforms = Array.from(this.shadowRoot!.querySelectorAll<HTMLInputElement>('input[name=platform]:checked')).map(el => el.value);
        const themes = this.captionThemes.split(',').map(t => t.trim()).filter(Boolean);

        if (platforms.length === 0) {
            alert("Please select at least one platform.");
            this.isGeneratingCaptions = false;
            return;
        }

        if (!aiService) {
            alert('AI service unavailable. Please set GEMINI_API_KEY.');
            this.isGeneratingCaptions = false;
            return;
        }

        const result = await aiService.generateCaption(this.selectedRelease.title, themes, platforms);

        if (result && result.captions) {
            this.generatedCaptions = result.captions;
        } else {
            alert('Failed to generate captions. Please try again.');
        }
        
        this.isGeneratingCaptions = false;
    }
    
    private _renderManageModal() {
        if (!this.selectedRelease) return null;

        return html`
            <div class="modal-overlay" @click=${this._closeManageModal}>
                <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
                    <div class="modal-header">
                        <h3>Manage Release: ${this.selectedRelease.title}</h3>
                        <button class="close-button" @click=${this._closeManageModal}>&times;</button>
                    </div>

                    <h4>Generate Social Media Captions</h4>
                    <p class="sub-label">Select platforms and provide creative themes to generate promotional posts.</p>
                    
                    <div>
                        <label>Target Platforms</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" name="platform" value="Twitter" checked> Twitter</label>
                            <label><input type="checkbox" name="platform" value="Instagram" checked> Instagram</label>
                            <label><input type="checkbox" name="platform" value="TikTok"> TikTok</label>
                            <label><input type="checkbox" name="platform" value="Facebook"> Facebook</label>
                        </div>
                    </div>
                    
                    <div>
                        <label for="caption-themes">Creative Themes (comma-separated)</label>
                        <input id="caption-themes" type="text" .value=${this.captionThemes} @input=${(e: Event) => this.captionThemes = (e.target as HTMLInputElement).value} placeholder="e.g., late night drive, futuristic, energetic">
                    </div>
                    
                    <button @click=${this._handleGenerateCaptions} ?disabled=${this.isGeneratingCaptions}>
                        ${this.isGeneratingCaptions ? 'Generating...' : 'Generate Captions'}
                    </button>

                    ${this.generatedCaptions.length > 0 ? html`
                        <div class="results-panel">
                            <h4>Generated Captions:</h4>
                            ${this.generatedCaptions.map(item => html`
                                <div style="margin-top: 1rem;">
                                    <label>${item.platform}</label>
                                    <textarea readonly>${item.caption}</textarea>
                                </div>
                            `)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    override render() {
        return html`
            <div class="panel">
                <h2 class="page-title">Releases</h2>
                <div class="control-group">
                    <h3>Scheduler & Distribution</h3>
                     <p class="sub-label">Manage your upcoming and past releases. The Social & Distribution Agents handle captioning and delivery.</p>
                     <button>Schedule New Release</button>
                </div>
                
                ${this.releases.map(release => html`
                    <div class="control-group">
                        <div class="release-card">
                            <img src=${release.art} alt="Cover art for ${release.title}">
                            <div class="release-info">
                                <h4>${release.title}</h4>
                                <p class="sub-label">Release Date: ${release.date}</p>
                                <span class="status status-${release.status.toLowerCase()}">${release.status}</span>
                            </div>
                            <button @click=${() => this._openManageModal(release)}>Manage</button>
                        </div>
                    </div>
                `)}
            </div>
            
            ${this._renderManageModal()}
        `;
    }
}