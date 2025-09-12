/**
 * @fileoverview The "Remix & LoRA" mode component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { classMap } from 'lit/directives/class-map.js';

import { sharedStyles } from './shared-styles.js';
import { StudioModule } from './studio-module.js';
import { appContext } from './context.js';
import { aiService } from './ai-service.js';
import { GENRES } from './data.js';

type TrainedLora = {
    name: string;
    epochs: number;
    baseModel: string;
};

type LogEntry = {
    level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    msg: string;
};

@customElement('remix-lora-mode')
export class RemixLoraMode extends StudioModule {
    private appContextConsumer = new ContextConsumer(this, {context: appContext, subscribe: true});

    @state() private activeSection: 'remix' | 'lora' = 'remix';
    @state() private generatedRemixPlan = '';

    @state() private trainedLoras: TrainedLora[] = [
        { name: 'synth_dreams_v2', epochs: 10, baseModel: 'base_model_v1' },
        { name: 'lofi_grit_v1', epochs: 15, baseModel: 'base_model_v1' },
    ];
    @state() private isDragOver = false;
    @state() private datasetFilename = '';
    @state() private trainingLogs: LogEntry[] = [];

    private _updatePrimaryAction() {
        const actionMap = {
            remix: { label: 'Generate Remix Plan', action: this._generateRemixPlan.bind(this) },
            lora: { label: 'Start Training', action: this._handleTrain.bind(this) }
        };
        const currentAction = actionMap[this.activeSection];
        this.dispatchEvent(new CustomEvent('primary-action-update', {
            detail: {
                label: currentAction.label,
                action: currentAction.action,
                disabled: this.isLoading,
            },
            bubbles: true,
            composed: true,
        }));
    }

    override updated(changedProperties: Map<string | number | symbol, unknown>) {
        if (changedProperties.has('activeSection') || changedProperties.has('isLoading')) {
            this._updatePrimaryAction();
        }
    }

    public triggerRemixPlan(source: string, genre: string, targets: string[]) {
        // We can't programmatically set the source easily if it's not one of the existing options.
        // For now, we'll set what we can. The user might have already selected the source.
        const genreSelect = this.shadowRoot!.querySelector('#remix-genre-select') as HTMLSelectElement;
        if (genreSelect) {
            genreSelect.value = genre;
        }

        const targetCheckboxes = this.shadowRoot!.querySelectorAll<HTMLInputElement>('input[name=remix-target]');
        targetCheckboxes.forEach(checkbox => {
            checkbox.checked = targets.includes(checkbox.value);
        });
        
        this._generateRemixPlan();
    }

    private async _generateRemixPlan() {
        if (!aiService) {
            this.statusMessage = 'AI service unavailable. Please set GEMINI_API_KEY.';
            console.error(this.statusMessage);
            this._updatePrimaryAction();
            return;
        }

        const stages = [
            { message: '[Remix Agent] Analyzing source...', duration: 1500 },
            { message: '[Remix Agent] Separating stems...', duration: 2000 },
            { message: '[Remix Agent] Generating new arrangement...', duration: 1500 },
        ];

        const task = async () => {
            const sourceSelect = this.shadowRoot!.querySelector('#remix-source-select') as HTMLSelectElement;
            const genreSelect = this.shadowRoot!.querySelector('#remix-genre-select') as HTMLSelectElement;
            const targets = Array.from(this.shadowRoot!.querySelectorAll<HTMLInputElement>('input[name=remix-target]:checked')).map(cb => cb.value);
            const loras = Array.from(this.shadowRoot!.querySelectorAll<HTMLInputElement>('input[name=remix-lora]:checked')).map(cb => cb.value);
            
            let source = sourceSelect.value;
            if (source === 'current_track' && this.appContextConsumer.value?.currentTrack.title) {
                source = `the track "${this.appContextConsumer.value.currentTrack.title}"`;
            }

            this.generatedRemixPlan = await aiService.generateRemixPlan({
                genre: genreSelect.value,
                source: source,
                targets: targets,
                loras: loras.join(', ')
            }) || 'Failed to generate plan.';
        };
        
        await this._performTaskWithProgress(stages, task);
        this._updatePrimaryAction();
    }
    
    private _log(level: LogEntry['level'], msg: string) {
        this.trainingLogs = [...this.trainingLogs, { level, msg }];
    }

    private async _handleTrain() {
        this.trainingLogs = [];
        const stages = [
            { message: 'Initializing training environment...', duration: 1000 },
            { message: 'Loading dataset (ETA: 30s)...', duration: 3000 },
            { message: 'Preprocessing audio...', duration: 2000 },
            { message: 'Starting fine-tuning process...', duration: 500 },
        ];

        const trainingTask = async () => {
             this._log('INFO', 'Analyzing provided dataset...');
             await new Promise(r => setTimeout(r, 1500));
             
             if (Math.random() < 0.1) {
                 this._log('ERROR', 'Dataset validation failed: ZIP file is corrupted or contains unsupported file types.');
                 this.stopFlag = true;
                 return;
             }
             this._log('SUCCESS', `Dataset validation successful. ${Math.floor(Math.random() * 50) + 100} audio clips found.`);
             await new Promise(r => setTimeout(r, 500));

            for (let i = 1; i <= 10; i++) {
                if (this.stopFlag) break;
                while(this.isPaused && !this.stopFlag) await new Promise(r => setTimeout(r, 200));
                
                const loss = 0.8 / (i + Math.random()) + Math.random() * 0.1;
                this.statusMessage = `Epoch ${i}/10: Loss: ${loss.toFixed(4)}, ETA: ${10-i}m`;
                this._log('INFO', this.statusMessage);

                if (i === 4 && loss > 0.45) {
                    this._log('WARNING', 'Loss is higher than expected. Consider checking dataset quality or adjusting learning rate for better results.');
                }

                this.progress = i * 10;
                await new Promise(r => setTimeout(r, 1000));
            }
            if (!this.stopFlag) {
                this._log('SUCCESS', 'Training complete. Model saved successfully.');
            }
        };
        
        await this._performTaskWithProgress(stages, trainingTask, true);
        
        const nameInput = this.shadowRoot!.querySelector('#lora-name-input') as HTMLInputElement;
        const epochsInput = this.shadowRoot!.querySelector('#lora-epochs-input') as HTMLInputElement;
        if(nameInput.value && !this.stopFlag) {
            this.trainedLoras = [...this.trainedLoras, {name: nameInput.value, epochs: parseInt(epochsInput.value), baseModel: 'base_model_v1'}];
        }
        this._updatePrimaryAction();
    }
    
    private _handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.datasetFilename = input.files[0].name;
        } else {
            this.datasetFilename = '';
        }
    }
    
    private _setupDragAndDrop(dropZone: HTMLElement) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.isDragOver = true;
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.isDragOver = false;
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.isDragOver = false;
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                this.datasetFilename = e.dataTransfer.files[0].name;
            }
        });
    }
    
    private _handleDeleteLora(name: string) {
        if (confirm(`Are you sure you want to delete the LoRA model "${name}"? This action cannot be undone.`)) {
            this.trainedLoras = this.trainedLoras.filter(lora => lora.name !== name);
        }
    }

    override firstUpdated() {
        this._updatePrimaryAction();
        const dropZone = this.shadowRoot!.querySelector('.drop-zone');
        if (dropZone) this._setupDragAndDrop(dropZone as HTMLElement);
    }
    
    override render() {
        const appContext = this.appContextConsumer.value;
        const canUseCurrentTrack = appContext?.currentTrack.audioBuffer;
        
        return html`
            <div class="panel">
                <h2 class="page-title">Remix & LoRA</h2>

                <div class="control-group" @focusin=${() => this.activeSection = 'remix'}>
                    <h3>Remixing</h3>
                    <p class="sub-label">Load a track to generate a creative remix plan from the AI Remix Agent.</p>
                    <div class="row">
                        <div>
                            <label>Source</label>
                            <select id="remix-source-select">
                                ${canUseCurrentTrack ? html`<option value="current_track">Use Current Track: ${appContext.currentTrack.title}</option>` : ''}
                                <option value="upload">Upload File</option>
                                <option value="link">Provide Link</option>
                            </select>
                        </div>
                        <div>
                            <label>Target Genre</label>
                            <select id="remix-genre-select">
                                ${GENRES.map(g => html`<option value=${g}>${g}</option>`)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label>Stems to Remix</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" name="remix-target" value="Vocals" checked> Vocals</label>
                            <label><input type="checkbox" name="remix-target" value="Drums"> Drums</label>
                            <label><input type="checkbox" name="remix-target" value="Bass"> Bass</label>
                            <label><input type="checkbox" name="remix-target" value="Synth"> Synth</label>
                            <label><input type="checkbox" name="remix-target" value="Guitar"> Guitar</label>
                            <label><input type="checkbox" name="remix-target" value="Other"> Other</label>
                        </div>
                    </div>
                    <div>
                        <label>Apply Sound Models (LoRA)</label>
                        <div class="checkbox-group">
                            ${this.trainedLoras.map(lora => html`
                                <label><input type="checkbox" name="remix-lora" value=${lora.name}> ${lora.name}</label>
                            `)}
                        </div>
                    </div>
                     ${this.isLoading && this.activeSection === 'remix' ? this.renderProgressIndicator() : ''}
                    ${this.generatedRemixPlan ? html`<div class="results-panel"><pre>${this.generatedRemixPlan}</pre></div>` : ''}
                </div>
                
                 <div class="control-group" @focusin=${() => this.activeSection = 'lora'}>
                    <h3>My Trained Sound Models</h3>
                    ${this.trainedLoras.length === 0 ? html`<p class="sub-label">No models trained yet. Train a new model below.</p>` : ''}
                    <div class="lora-list">
                        ${this.trainedLoras.map(lora => html`
                            <div class="lora-item">
                                <span><strong>${lora.name}</strong> (${lora.epochs} epochs)</span>
                                <div class="lora-item-actions">
                                    <button @click=${() => this._handleDeleteLora(lora.name)}>Delete</button>
                                    <button @click=${() => alert('Retraining functionality is coming soon!')}>Retrain</button>
                                    <button @click=${() => alert('Using models as a base for new training is coming soon!')}>Use as Base</button>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>

                <div class="control-group" @focusin=${() => this.activeSection = 'lora'}>
                    <h3>LoRA Training</h3>
                    <p class="sub-label">Train a custom sound model by providing a ZIP file of audio clips.</p>
                     
                    <div class="drop-zone ${classMap({ 'drag-over': this.isDragOver })}" @click=${() => this.shadowRoot?.querySelector<HTMLInputElement>('#zip-upload')?.click()}>
                        <label for="zip-upload">${this.datasetFilename ? `Loaded: ${this.datasetFilename}` : 'Drag & Drop Audio ZIP, or Click to Upload'}</label>
                        <input type="file" id="zip-upload" accept=".zip" style="display: none;" @change=${this._handleFileSelect}>
                    </div>

                     <div class="row">
                        <div>
                            <label>Or provide dataset URL</label>
                            <input type="text" placeholder="https://.../dataset.zip">
                        </div>
                        <div>
                            <label>LoRA Name</label>
                            <input id="lora-name-input" type="text" placeholder="my_custom_sound">
                        </div>
                    </div>
                     <details>
                        <summary style="font-size: 0.8rem; cursor: pointer;">Expert Settings</summary>
                        <div class="row" style="margin-top: 1rem;">
                            <div>
                                <label>Epochs</label>
                                <input id="lora-epochs-input" type="number" value="10">
                            </div>
                            <div>
                                <label>Learning Rate</label>
                                <input type="text" value="1e-4">
                            </div>
                        </div>
                    </details>
                    ${this.isLoading && this.activeSection === 'lora' ? html`
                        ${this.renderProgressIndicator()}
                        ${this.trainingLogs.length > 0 ? html`
                            <div class="training-log-view">
                                ${this.trainingLogs.map(log => html`
                                    <div class="log-entry log-level-${log.level}">${log.msg}</div>
                                `)}
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            </div>
        `;
    }
}