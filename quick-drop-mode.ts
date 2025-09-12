/**
 * @fileoverview The "Quick Drop" mode component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { css, html, svg, LitElement } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import { sharedStyles } from './shared-styles.js';
import { aiService } from './ai-service.js';
import { appContext, type Track } from './context.js';
import { audioBufferToWav } from './utils.js';
import { StudioModule } from './studio-module.js';

type QuickDropResult = {
    title: string;
    lyrics: string;
    genre: string;
    bpm: number;
    coverArtPrompt: string;
} | null;

@customElement('quick-drop-mode')
export class QuickDropMode extends StudioModule {
    private appContextConsumer = new ContextConsumer<typeof appContext, QuickDropMode>(this, {context: appContext, subscribe: true});
    
    @state() private result: QuickDropResult = null;
    @state() private coverArtUrl = '';
    @state() private prompt = '';
    @state() private trainedLoras = ['synth_dreams_v2', 'lofi_grit_v1'];
    
    @query('#prompt-input') private promptInput!: HTMLTextAreaElement;
    @query('#vibe-select') private vibeSelect!: HTMLSelectElement;
    @query('#voice-select') private voiceSelect!: HTMLSelectElement;

    static override styles = [
        sharedStyles,
        css`
        .results-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 1.5rem;
            margin-top: 1.5rem;
            align-items: flex-start;
        }
        @media (max-width: 600px) {
            .results-grid {
                grid-template-columns: 1fr;
            }
        }
        .results-grid img {
            width: 150px;
            height: 150px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid #444;
        }
        .result-details pre {
             white-space: pre-wrap;
             word-wrap: break-word;
             font-family: monospace;
             font-size: 0.8rem;
             color: #ccc;
             background-color: #2a2a2a;
             padding: 0.6rem;
             border-radius: 5px;
             max-height: 20vh;
             overflow-y: auto;
        }
        `
    ];

    private _updatePrimaryAction() {
        const disabled = !this.prompt.trim();
        this.dispatchEvent(new CustomEvent('primary-action-update', {
            detail: {
                label: 'Generate',
                action: this._handleGenerate.bind(this),
                disabled: disabled || this.isLoading,
            },
            bubbles: true,
            composed: true,
        }));
    }

    override firstUpdated() {
        this._updatePrimaryAction();
    }

    public triggerQuickDrop(prompt: string, vibe: string, leadVoice: string) {
        this.prompt = prompt;
        if (this.vibeSelect) this.vibeSelect.value = vibe;
        if (this.voiceSelect) this.voiceSelect.value = leadVoice;
        this._handleGenerate();
    }

    private async _handleGenerate() {
        const appContext = this.appContextConsumer.value;
        if (!appContext) {
            this.statusMessage = 'Error: AppContext not available. Cannot generate audio.';
            console.error(this.statusMessage);
            this.isLoading = false;
            this._updatePrimaryAction();
            return;
        }

        this.result = null;
        this.coverArtUrl = '';
        
        const vibe = this.vibeSelect.value;
        const leadVoice = this.voiceSelect.value;
        const selectedLoras = Array.from(this.shadowRoot?.querySelectorAll<HTMLInputElement>('input[name=lora-palette]:checked') ?? []).map(el => el.value);

        const stages = [
            { message: '[J Orchestrator] Parsing intent...', duration: 1000 },
            { message: '[Lyricist Agent] Writing lyrics...', duration: 2000 },
            { message: '[Composer Agent] Composing instrumental...', duration: 2000 },
            { message: '[Cover Agent] Designing cover art...', duration: 2500 },
            { message: '[Mastering Agent] Finalizing track...', duration: 1500 },
        ];
        
        const task = async () => {
            const concept = await aiService.runQuickDrop(this.prompt, vibe, leadVoice, selectedLoras);
            if (!concept) throw new Error("Failed to get concept from AI service.");
            
            this.result = concept;
            const artPromise = aiService.generateCoverArt(concept.coverArtPrompt);

            // Generate placeholder audio
            if (appContext.audioContext) {
                const { audioContext } = appContext;
                const duration = 30;
                const sampleRate = audioContext.sampleRate;
                const frameCount = sampleRate * duration;
                const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < frameCount; i++) {
                    const time = i / sampleRate;
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-time * 3) * 0.3;
                }
                const track: Track = { title: concept.title, artist: leadVoice, duration, audioBuffer: buffer };
                appContext.updateTrack(track);
            }
            
            const artResult = await artPromise;
            this.coverArtUrl = artResult === 'error' ? 'error' : (artResult || '');
        };

        await this._performTaskWithProgress(stages, task);
        this._updatePrimaryAction();
    }
    
    private _handleDownload() {
        const appContext = this.appContextConsumer.value;
        if (appContext?.currentTrack.audioBuffer) {
            const wavBlob = audioBufferToWav(appContext.currentTrack.audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${appContext.currentTrack.title.replace(/\s/g, '_')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    private _handleShare() {
        const appContext = this.appContextConsumer.value;
        if(appContext?.currentTrack) {
            const text = `Check out my new track "${appContext.currentTrack.title}" made with Whisper Music OS! #AI #Music`;
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(shareUrl, '_blank');
        }
    }

    override render() {
        const appContext = this.appContextConsumer.value;

        return html`
            <div class="panel">
                <h2 class="page-title">Quick Drop</h2>
                <div class="control-group">
                    <h3>One-Click Song Creation</h3>
                    <p class="sub-label">
                        Provide a prompt, link, or idea. The J Orchestrator will handle the entire production pipeline automatically, from lyrics and composition to mastering and cover art.
                    </p>
                    <div>
                        <label for="prompt-input">Prompt or Social Media Link</label>
                        <textarea id="prompt-input" 
                            placeholder="e.g., a cinematic trap beat about exploring a new city at night"
                            .value=${this.prompt}
                            @input=${(e: Event) => {
                                this.prompt = (e.target as HTMLTextAreaElement).value;
                                this._updatePrimaryAction();
                            }}
                        ></textarea>
                    </div>
                    <div class="row">
                        <div>
                            <label for="vibe-select">Vibe</label>
                            <select id="vibe-select">
                                <option>Chill</option>
                                <option>Energetic</option>
                                <option>Hypnotic</option>
                                <option>Cinematic</option>
                            </select>
                        </div>
                        <div>
                            <label for="voice-select">Lead Voice</label>
                            <select id="voice-select">
                                <option>Whisper Soul</option>
                                <option>Titan</option>
                                <option>Aria</option>
                            </select>
                        </div>
                    </div>
                     <details>
                        <summary style="font-size: 0.8rem; cursor: pointer;">Advanced Settings</summary>
                        <div style="margin-top: 1rem;">
                            <label>Sound Palette (LoRA)</label>
                            <div class="checkbox-group">
                                ${this.trainedLoras.map(lora => html`
                                    <label><input type="checkbox" name="lora-palette" value=${lora}> ${lora}</label>
                                `)}
                            </div>
                        </div>
                    </details>
                </div>

                ${this.renderProgressIndicator()}

                ${this.result ? html`
                    <div class="control-group">
                        <h3>Production Complete</h3>
                        <div class="results-grid">
                           <img src=${this.coverArtUrl === 'error' ? 'https://placehold.co/150x150/ef4444/ffffff?text=Error' : (this.coverArtUrl || 'https://placehold.co/150x150/1c1c1c/ffffff?text=Art')} alt="Generated cover art">
                           <div class="result-details">
                                <h4>${this.result.title}</h4>
                                <p class="sub-label">Genre: ${this.result.genre} | BPM: ${this.result.bpm}</p>
                                <p class="sub-label" style="color: #22c55e; font-weight: bold; margin-top: 0.5rem;">Track loaded into player!</p>
                                
                                <div class="track-action-bar">
                                    <button class="icon-button" @click=${() => appContext?.togglePlay()} ?disabled=${!appContext?.currentTrack.audioBuffer}>
                                        ${appContext?.isPlaying ? svg`<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>` : svg`<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`}
                                    </button>
                                     <button class="icon-button" @click=${this._handleDownload} ?disabled=${!appContext?.currentTrack.audioBuffer}>
                                        ${svg`<svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`}
                                    </button>
                                     <button class="icon-button" @click=${this._handleShare}>
                                        ${svg`<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3z"/></svg>`}
                                    </button>
                                </div>

                                <details style="margin-top: 1rem;">
                                    <summary style="font-size: 0.8rem; cursor: pointer;">View Lyrics</summary>
                                    <pre>${this.result.lyrics}</pre>
                                </details>
                           </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}