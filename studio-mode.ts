/**
 * @fileoverview The "Studio" mode wizard component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { html, svg, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';

import { sharedStyles } from './shared-styles.js';
import { aiService } from './ai-service.js';
import { StudioModule } from './studio-module.js';
import { appContext, type Track } from './context.js';
import { audioBufferToWav } from './utils.js';
import { GENRES } from './data.js';

type LyricConcept = { verse: string; chorus: string; };
type MixConcept = { name: string; description: string; };

@customElement('studio-mode')
export class StudioMode extends StudioModule {
    static override styles = [
        sharedStyles,
        css`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .spinner {
                animation: spin 1s linear infinite;
            }
        `
    ];

    private appContextConsumer = new ContextConsumer<typeof appContext, StudioMode>(this, {context: appContext, subscribe: true});

    @state() private currentStep = 0;
    
    // Step 0: Song Concept
    @state() private songBrief = '';
    
    // Step 1: Lyrics (HITL Gate A)
    @state() private lyricOptions: { optionA: LyricConcept, optionB: LyricConcept } | null = null;
    @state() private selectedLyrics: 'A' | 'B' | null = null;
    @state() private approvedLyrics = '';
    
    // Step 2: Arrangement
    @state() private trainedLoras = [{name: 'synth_dreams_v2'}, {name: 'lofi_grit_v1'}];
    @state() private selectedLoras: string[] = [];
    @state() private instrumentalGenre = 'Pop';
    @state() private instrumentalComplexity = 50;
    @state() private instrumentalDescription = '';
    @state() private isDescriptionLoading = false;
    private complexityDebounceTimer: number | undefined;
    
    // Step 3: Vocals
    @state() private leadVocal = 'Whisper Soul';
    @state() private vocalTone = 50; // 0-100 scale: 0=Melancholy, 100=Energetic
    @state() private vocalPitchCorrection = 50;
    @state() private vocalTimingAdjustment = 25;
    @state() private vocalGuide = '';

    // Step 4: Mix (HITL Gate B)
    @state() private mixOptions: { mixA: MixConcept, mixB: MixConcept } | null = null;
    @state() private selectedMix: 'A' | 'B' | null = null;

    // Step 5: Master
    @state() private panningProfile = 'Standard Stereo';
    @state() private spiceIntensity = 50;
    @state() private masteringNotes = '';
    
    // Step 6: Release
    @state() private finalTrack: {title: string, coverArtUrl: string} | null = null;

    private STEPS = ['Song', 'Lyrics', 'Arrange', 'Vocals', 'Mix', 'Master', 'Release'];

    override firstUpdated() {
        this.loadProject();
    }

    private saveProject() {
        const projectState = {
            currentStep: this.currentStep,
            songBrief: this.songBrief,
            lyricOptions: this.lyricOptions,
            selectedLyrics: this.selectedLyrics,
            approvedLyrics: this.approvedLyrics,
            instrumentalGenre: this.instrumentalGenre,
            selectedLoras: this.selectedLoras,
            instrumentalDescription: this.instrumentalDescription,
            instrumentalComplexity: this.instrumentalComplexity,
            leadVocal: this.leadVocal,
            vocalTone: this.vocalTone,
            vocalPitchCorrection: this.vocalPitchCorrection,
            vocalTimingAdjustment: this.vocalTimingAdjustment,
            vocalGuide: this.vocalGuide,
            mixOptions: this.mixOptions,
            selectedMix: this.selectedMix,
            panningProfile: this.panningProfile,
            spiceIntensity: this.spiceIntensity,
            masteringNotes: this.masteringNotes,
            finalTrack: this.finalTrack
        };
        localStorage.setItem('studioProject', JSON.stringify(projectState));
        alert('Project saved!');
    }

    private loadProject() {
        const savedProject = localStorage.getItem('studioProject');
        if (savedProject) {
            if (confirm('A saved project was found. Do you want to load it?')) {
                try {
                    const projectState = JSON.parse(savedProject);
                    Object.assign(this, projectState);
                } catch (e) {
                    console.error('Failed to load project from localStorage', e);
                    localStorage.removeItem('studioProject');
                }
            }
        }
    }

    private _updatePrimaryAction() {
        let label = 'Next Step';
        let action = this._handleNextStep.bind(this);
        let disabled = this.isLoading;

        switch (this.currentStep) {
            case 0:
                label = 'Generate Lyric Concepts';
                disabled = this.isLoading || !this.songBrief.trim();
                break;
            case 1:
                label = 'Approve & Arrange';
                disabled = this.isLoading || !this.selectedLyrics;
                break;
            case 2:
                label = 'Proceed to Vocals';
                break;
            case 3:
                label = 'Proceed to Mix';
                disabled = this.isLoading || !this.vocalGuide;
                break;
            case 4:
                label = 'Approve & Proceed to Master';
                disabled = this.isLoading || !this.selectedMix;
                break;
            case 5:
                label = 'Generate Final Track';
                break;
            case 6:
                label = 'Start New Song';
                action = () => this._handleNewProject();
                break;
        }

        this.dispatchEvent(new CustomEvent('primary-action-update', {
            detail: { label, action, disabled },
            bubbles: true,
            composed: true,
        }));
    }

    override updated(changedProperties: Map<string | number | symbol, unknown>) {
        if (changedProperties.has('currentStep') || changedProperties.has('isLoading') || changedProperties.has('songBrief') || changedProperties.has('selectedLyrics') || changedProperties.has('selectedMix') || changedProperties.has('vocalGuide')) {
            this._updatePrimaryAction();
        }
    }
    
    private _resetState() {
        this.songBrief = '';
        this.lyricOptions = null;
        this.selectedLyrics = null;
        this.approvedLyrics = '';
        this.mixOptions = null;
        this.selectedMix = null;
        this.finalTrack = null;
        this.instrumentalGenre = 'Pop';
        this.instrumentalDescription = '';
        this.selectedLoras = [];
        this.instrumentalComplexity = 50;
        this.vocalTone = 50;
        this.vocalPitchCorrection = 50;
        this.vocalTimingAdjustment = 25;
        this.vocalGuide = '';
        this.panningProfile = 'Standard Stereo';
        this.spiceIntensity = 50;
        this.masteringNotes = '';
        localStorage.removeItem('studioProject');
    }

    private _handleNewProject() {
        if (confirm("Are you sure you want to start a new project? Any unsaved changes will be lost.")) {
            this._resetState();
            this.currentStep = 0;
        }
    }

    private async _handleNextStep() {
        if (!aiService) {
            this.statusMessage = 'AI service unavailable. Please set GEMINI_API_KEY.';
            console.error(this.statusMessage);
            this._updatePrimaryAction();
            return;
        }

        this.isLoading = true;
        this._updatePrimaryAction();
        
        try {
            if (this.currentStep === 0) {
                this.lyricOptions = await aiService.getLyricConcept(this.songBrief);
                this.currentStep = 1;
            } else if (this.currentStep === 1) {
                if(this.selectedLyrics && this.lyricOptions) {
                    const choice = this.selectedLyrics === 'A' ? this.lyricOptions.optionA : this.lyricOptions.optionB;
                    this.approvedLyrics = `[Verse]\n${choice.verse}\n\n[Chorus]\n${choice.chorus}`;
                    this.currentStep = 2;
                }
            } else if (this.currentStep === 2) {
                this.currentStep = 3;
            } else if (this.currentStep === 3) {
                const stages = [
                    { message: '[Mixing Agent] Preparing mix snapshots...', duration: 2500 },
                ];
                await this._performTaskWithProgress(stages, async () => {
                    this.mixOptions = await aiService.getMixPreview(this.approvedLyrics);
                });
                if (!this.stopFlag) {
                    this.currentStep = 4;
                }
            } else if (this.currentStep === 4) {
                 if (this.selectedMix) {
                    this.currentStep = 5;
                 }
            } else if (this.currentStep === 5) {
                 const appContext = this.appContextConsumer.value;
                 if (!appContext) {
                    this.statusMessage = 'Error: AppContext not available. Cannot generate audio.';
                    console.error(this.statusMessage);
                    return; // Stop execution
                 }

                 const stages = [
                    { message: '[Mastering Agent] Analyzing mastering parameters...', duration: 1500 },
                    { message: '[Mastering Agent] Applying final polish...', duration: 2000 },
                    { message: '[Cover Agent] Generating final cover art...', duration: 3000 },
                    { message: '[Render Engine] Exporting track variants...', duration: 1500 },
                 ];
                 await this._performTaskWithProgress(stages, async () => {
                    const notes = await aiService.getMasteringNotes(this.panningProfile, this.spiceIntensity);
                    this.masteringNotes = notes || 'Failed to generate mastering notes.';
                    
                    const title = await aiService.generateTitle(this.approvedLyrics) || 'Untitled Track';
                    const coverArtPrompt = `An abstract, moody album cover for a song titled "${title}".`;
                    const coverArtResult = await aiService.generateCoverArt(coverArtPrompt);
                    
                    this.finalTrack = {
                        title: title,
                        coverArtUrl: coverArtResult === 'error' ? 'error' : (coverArtResult || '')
                    };

                    // Generate final audio
                    if (appContext.audioContext) {
                        const duration = 90; // longer final track
                        const sampleRate = appContext.audioContext.sampleRate;
                        const frameCount = sampleRate * duration;
                        const buffer = appContext.audioContext.createBuffer(1, frameCount, sampleRate);
                        const data = buffer.getChannelData(0);
                         for (let i = 0; i < frameCount; i++) {
                            const time = i / sampleRate;
                            const f1 = 220 * Math.pow(2, Math.floor(time*2)/12);
                            const f2 = 110 * Math.pow(2, Math.floor(time*4)/12);
                            data[i] = (Math.sin(f1 * 2 * Math.PI * time) * 0.2 + Math.sin(f2 * 2 * Math.PI * time) * 0.1) * Math.exp(-time * 1);
                        }
                        const track: Track = { title: title, artist: this.leadVocal, duration, audioBuffer: buffer };
                        appContext.updateTrack(track);
                    }
                 });
                 if (!this.stopFlag) {
                    this.currentStep = 6;
                 }
            }
        } catch (e) {
            console.error("Error in studio wizard step:", e);
        } finally {
            this.isLoading = false;
            this._updatePrimaryAction();
        }
    }

    private async _handleGenerateOrRegenerateVocalGuide() {
        if (!aiService) {
            this.statusMessage = 'AI service unavailable. Please set GEMINI_API_KEY.';
            console.error(this.statusMessage);
            this._updatePrimaryAction();
            return;
        }

        const stages = [
            { message: '[Vocal Studio] Analyzing lyrics...', duration: 1000 },
            { message: '[Vocal Studio] Generating performance guide...', duration: 2000 },
        ];
        await this._performTaskWithProgress(stages, async () => {
            const guide = await aiService.generateVocalGuide({
                lyrics: this.approvedLyrics,
                rvcModel: this.leadVocal,
                vocalTone: this.vocalTone,
                vocalPitchCorrection: this.vocalPitchCorrection,
                vocalTimingAdjustment: this.vocalTimingAdjustment,
            });
            this.vocalGuide = guide || 'Failed to generate vocal guide.';
        });
        this._updatePrimaryAction();
    }

    private _handleLoraChange(e: Event) {
        const checkbox = e.target as HTMLInputElement;
        if (checkbox.checked) {
            this.selectedLoras = [...this.selectedLoras, checkbox.value];
        } else {
            this.selectedLoras = this.selectedLoras.filter(lora => lora !== checkbox.value);
        }
    }

    // --- NEW AND MODIFIED ARRANGE STEP METHODS ---

    private _getInstrumentalPrompt() {
        return `A song about "${this.songBrief}", in the style of ${this.instrumentalGenre}. ${this.selectedLoras.length > 0 ? `Incorporate sounds from the following models: ${this.selectedLoras.join(', ')}.` : ''}`;
    }

    private _handleComplexityChange(e: Event) {
        this.instrumentalComplexity = parseInt((e.target as HTMLInputElement).value);
        
        clearTimeout(this.complexityDebounceTimer);
        this.complexityDebounceTimer = window.setTimeout(() => {
            this._updateInstrumentalDescription();
        }, 500); // 500ms debounce
    }

    private async _updateInstrumentalDescription() {
        if (!this.songBrief) return;

        if (!aiService) {
            this.instrumentalDescription = 'AI service unavailable. Please set GEMINI_API_KEY.';
            return;
        }

        this.isDescriptionLoading = true;
        const prompt = this._getInstrumentalPrompt();

        try {
            const description = await aiService.generateMusicDescription(prompt, this.instrumentalComplexity);
            this.instrumentalDescription = description;
        } catch (e) {
            console.error("Failed to update instrumental description", e);
            this.instrumentalDescription = "Error updating description.";
        } finally {
            this.isDescriptionLoading = false;
        }
    }

    private async _generateInstrumentalPreview() {
        if (!aiService) {
            this.statusMessage = 'AI service unavailable. Please set GEMINI_API_KEY.';
            console.error(this.statusMessage);
            this._updatePrimaryAction();
            return;
        }

        const appContext = this.appContextConsumer.value;
        if (!appContext) return;
        
        const stages = [
            { message: '[Composer Agent] Generating arrangement description...', duration: 2500 },
            { message: '[MusicGen Agent] Rendering audio preview...', duration: 1500 },
        ];

        await this._performTaskWithProgress(stages, async () => {
            clearTimeout(this.complexityDebounceTimer);
            await this._updateInstrumentalDescription();
            
            // Generate placeholder audio
            const { audioContext } = appContext;
            const duration = 60;
            const sampleRate = audioContext.sampleRate;
            const frameCount = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                const time = i / sampleRate;
                data[i] = (Math.random() * 2 - 1) * Math.exp(-time * 2) * 0.2;
            }
            const track: Track = { title: `${this.songBrief.substring(0,20)}... (Instrumental)`, artist: 'MusicGen Agent', duration, audioBuffer: buffer };
            appContext.updateTrack(track);
        });
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
    
    private _renderCurrentStep() {
        switch (this.currentStep) {
            case 0: return this._renderStep0_Song();
            case 1: return this._renderStep1_Lyrics();
            case 2: return this._renderStep2_Arrange();
            case 3: return this._renderStep3_Vocals();
            case 4: return this._renderStep4_Mix();
            case 5: return this._renderStep5_Master();
            case 6: return this._renderStep6_ReleaseReady();
            default: return html`<div>Invalid Step</div>`;
        }
    }

    private _renderStep0_Song() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 1: Song Concept</h3>
                <p class="sub-label">Start with a brief description of your song idea. The Orchestrator will use this to generate lyrical concepts for your approval.</p>
                <div>
                    <label for="song-brief">Song Brief</label>
                    <textarea id="song-brief" .value=${this.songBrief} @input=${(e: Event) => this.songBrief = (e.target as HTMLTextAreaElement).value} placeholder="e.g., A breakup song about realizing you're better off alone"></textarea>
                </div>
            </div>
        `;
    }

    private _renderStep1_Lyrics() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 2: Approve Lyrics (Gate A)</h3>
                <p class="sub-label">The Lyricist Agent has generated two distinct concepts. Choose the one that best fits your vision to proceed.</p>
                <div class="gate-options">
                    <div class="gate-option ${classMap({selected: this.selectedLyrics === 'A'})}" @click=${() => this.selectedLyrics = 'A'}>
                        <h4>Option A</h4>
                        <pre><strong>Verse:</strong>\n${this.lyricOptions?.optionA.verse}\n\n<strong>Chorus:</strong>\n${this.lyricOptions?.optionA.chorus}</pre>
                    </div>
                     <div class="gate-option ${classMap({selected: this.selectedLyrics === 'B'})}" @click=${() => this.selectedLyrics = 'B'}>
                        <h4>Option B</h4>
                        <pre><strong>Verse:</strong>\n${this.lyricOptions?.optionB.verse}\n\n<strong>Chorus:</strong>\n${this.lyricOptions?.optionB.chorus}</pre>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderStep2_Arrange() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 3: Arrange</h3>
                <p class="sub-label">Build the instrumental. Select a genre and optionally use your trained sound models to influence the composition.</p>
                
                <div class="row">
                    <div>
                        <label for="instrumental-genre-select">Genre</label>
                        <select id="instrumental-genre-select" .value=${this.instrumentalGenre} @change=${(e: Event) => this.instrumentalGenre = (e.target as HTMLSelectElement).value}>
                            ${GENRES.map(g => html`<option value=${g}>${g}</option>`)}
                        </select>
                    </div>
                </div>

                <div class="slider-container">
                    <label>Instrumental Complexity</label>
                    <input type="range" min="0" max="100" .value=${this.instrumentalComplexity} @input=${this._handleComplexityChange}>
                    <div class="slider-labels">
                        <span>Simple / Sparse</span>
                        <span>Complex / Dense</span>
                    </div>
                </div>

                <div>
                    <label>Sound Palette (LoRA)</label>
                    <div class="checkbox-group">
                        ${this.trainedLoras.map(lora => html`
                            <label><input type="checkbox" name="lora-palette-studio" value=${lora.name} .checked=${this.selectedLoras.includes(lora.name)} @change=${this._handleLoraChange}> ${lora.name}</label>
                        `)}
                    </div>
                </div>

                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button @click=${this._generateInstrumentalPreview} ?disabled=${this.isLoading}>Generate Instrumental Preview</button>
                    <button @click=${() => alert('VST Plugin support is coming soon!')} title="Feature coming soon">Manage VST Plugins</button>
                </div>
                
                ${this.instrumentalDescription ? html`
                    <div style="margin-top: 1rem;">
                        <h4>
                            Instrumental Description
                             ${this.isDescriptionLoading ? html`
                                <svg class="spinner" style="width: 1em; height: 1em; vertical-align: -0.15em;" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
                                </svg>
                            ` : ''}
                        </h4>
                        <pre>${this.instrumentalDescription}</pre>
                        <p class="sub-label" style="color: #22c55e; font-weight: bold;">Instrumental preview loaded into player!</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private _renderStep3_Vocals() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 4: Vocals</h3>
                <p class="sub-label">Set the initial parameters for the vocal performance. After generating the initial guide, you can fine-tune the results.</p>
                
                <h4>Initial Performance</h4>
                <div class="row">
                    <div>
                        <label for="lead-vocal-select">Lead Voice</label>
                        <select id="lead-vocal-select" .value=${this.leadVocal} @change=${(e: Event) => this.leadVocal = (e.target as HTMLSelectElement).value}>
                            <option>Whisper Soul</option>
                            <option>Titan</option>
                            <option>Aria</option>
                        </select>
                    </div>
                    <div class="slider-container">
                        <label>Vocal Tone</label>
                        <input type="range" min="0" max="100" .value=${this.vocalTone} @input=${(e: Event) => this.vocalTone = parseInt((e.target as HTMLInputElement).value)}>
                        <div class="slider-labels">
                            <span>Melancholy</span>
                            <span>Energetic</span>
                        </div>
                    </div>
                </div>

                ${this.vocalGuide ? html`
                    <div style="margin-top: 1.5rem;">
                        <h4>Fine-Tuning Controls</h4>
                        <p class="sub-label">Adjust the pitch and timing, then regenerate to refine the performance.</p>
                        <div class="row">
                            <div class="slider-container">
                                <label>Pitch Correction</label>
                                <input type="range" min="0" max="100" .value=${this.vocalPitchCorrection} @input=${(e: Event) => this.vocalPitchCorrection = parseInt((e.target as HTMLInputElement).value)}>
                                <div class="slider-labels">
                                    <span>Natural</span>
                                    <span>Tuned</span>
                                </div>
                            </div>
                            <div class="slider-container">
                                <label>Timing Adjustment</label>
                                <input type="range" min="0" max="100" .value=${this.vocalTimingAdjustment} @input=${(e: Event) => this.vocalTimingAdjustment = parseInt((e.target as HTMLInputElement).value)}>
                                <div class="slider-labels">
                                    <span>Loose</span>
                                    <span>Tight</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: 1rem;">
                    <button @click=${this._handleGenerateOrRegenerateVocalGuide} ?disabled=${this.isLoading}>
                        ${this.vocalGuide ? 'Regenerate Vocal Guide' : 'Generate Vocal Guide'}
                    </button>
                </div>

                ${this.vocalGuide ? html`
                    <div style="margin-top: 1rem;">
                        <h4>Vocal Performance Guide:</h4>
                        <pre>${this.vocalGuide}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private _renderStep4_Mix() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 5: Approve Mix (Gate B)</h3>
                <p class="sub-label">The Mixing Agent has prepared two snapshots of the mix. Listen to a short preview (simulated) and choose your preferred sonic character.</p>
                <div class="gate-options">
                    <div class="gate-option ${classMap({selected: this.selectedMix === 'A'})}" @click=${() => this.selectedMix = 'A'}>
                        <h4>${this.mixOptions?.mixA.name}</h4>
                        <p class="sub-label">${this.mixOptions?.mixA.description}</p>
                    </div>
                     <div class="gate-option ${classMap({selected: this.selectedMix === 'B'})}" @click=${() => this.selectedMix = 'B'}>
                        <h4>${this.mixOptions?.mixB.name}</h4>
                        <p class="sub-label">${this.mixOptions?.mixB.description}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    private _renderStep5_Master() {
        return html`
            <div class="control-group">
                <h3 class="wizard-step-title">Step 6: Master</h3>
                <p class="sub-label">Apply the final polish. Adjust the spice intensity and stereo field to perfect your sound.</p>
                 <div class="row">
                    <div class="slider-container">
                        <label>Spice Intensity</label>
                        <input type="range" min="0" max="100" .value=${this.spiceIntensity} @input=${(e: Event) => this.spiceIntensity = parseInt((e.target as HTMLInputElement).value)}>
                        <div class="slider-labels">
                            <span>Subtle</span>
                            <span>Aggressive</span>
                        </div>
                    </div>
                    <div>
                        <label for="panning-profile">Panning Profile</label>
                        <select id="panning-profile" .value=${this.panningProfile} @change=${(e: Event) => this.panningProfile = (e.target as HTMLSelectElement).value}>
                            <option>Standard Stereo</option>
                            <option>Wide Stereo</option>
                            <option>Mono-Compatible</option>
                            <option>Binaural (Headphones)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderStep6_ReleaseReady() {
        const appContext = this.appContextConsumer.value;
        const artUrl = this.finalTrack?.coverArtUrl === 'error' 
            ? 'https://placehold.co/150x150/ef4444/ffffff?text=Error' 
            : (this.finalTrack?.coverArtUrl || 'https://placehold.co/150x150/1c1c1c/ffffff?text=Art');

        return html`
             <div class="control-group">
                <h3 class="wizard-step-title">Release Ready</h3>
                <div class="results-grid">
                   <img src=${artUrl} alt="Generated cover art">
                   <div class="result-details">
                        <h4>${this.finalTrack?.title}</h4>
                        <p class="sub-label">By: ${this.leadVocal}</p>
                        <p class="sub-label" style="color: #22c55e; font-weight: bold; margin-top: 0.5rem;">Track loaded into player and ready for release!</p>
                        
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

                        ${this.masteringNotes ? html`
                            <details style="margin-top: 1rem;">
                                <summary style="font-size: 0.8rem; cursor: pointer;">View Mastering Notes</summary>
                                <pre>${this.masteringNotes}</pre>
                            </details>
                        ` : ''}
                   </div>
                </div>
            </div>
        `;
    }

    override render() {
        return html`
            <div class="panel">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 0.75rem; margin-bottom: 1rem;">
                    <h2 class="page-title" style="margin: 0; padding: 0; border: none;">Studio</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button @click=${this._handleNewProject}>New Project</button>
                        <button @click=${this.saveProject}>Save Project</button>
                        <button @click=${this.loadProject}>Load Project</button>
                    </div>
                </div>

                <div class="wizard-breadcrumbs">
                    ${this.STEPS.map((step, index) => html`
                        <div class="breadcrumb-step ${classMap({active: index === this.currentStep})}">${step}</div>
                    `)}
                </div>

                ${this.renderProgressIndicator()}
                
                ${!this.isLoading ? this._renderCurrentStep() : ''}
            </div>
        `;
    }
}