/**
 * @fileoverview Base class for all studio module components.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {html, LitElement, svg} from 'lit';
import {state} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';
import {sharedStyles} from './shared-styles.js';

export class StudioModule extends LitElement {
    static override styles = [sharedStyles];

    @state() protected isLoading = false;
    @state() protected progress = 0;
    @state() protected statusMessage = '';
    @state() protected isPaused = false;
    protected stopFlag = false;


    protected async _performTaskWithProgress<T>(
        stages: {message: string, duration: number}[],
        task: () => Promise<T>,
        isLongTask = false
    ): Promise<T | undefined> {
        this.isLoading = true;
        this.isPaused = false;
        this.stopFlag = false;
        this.progress = 0;
        this.statusMessage = '';
        let taskResult: T | undefined;
        let taskError: any;

        const totalDuration = stages.reduce((acc, s) => acc + s.duration, 0);
        let elapsed = 0;

        const progressPromise = (async () => {
            for (const stage of stages) {
                if (this.stopFlag) break;
                while(this.isPaused && !this.stopFlag) await new Promise(r => setTimeout(r, 200));
                
                this.statusMessage = stage.message;
                const start = Date.now();
                while (Date.now() - start < stage.duration) {
                    if (this.stopFlag) break;
                    while(this.isPaused && !this.stopFlag) await new Promise(r => setTimeout(r, 200));

                    await new Promise(r => setTimeout(r, 50));
                    elapsed += 50;
                    if (!isLongTask) {
                        this.progress = Math.min(100, (elapsed / totalDuration) * 100);
                    }
                }
            }
        })();
        
        try {
            // Run the main async task in parallel with the progress simulation
            if (isLongTask) {
                // For long tasks, we run it in parallel and let it update progress itself
                taskResult = await Promise.race([task(), progressPromise.then(() => undefined as T)]);
            } else {
                taskResult = await task();
            }
        } catch(e) {
            taskError = e;
            console.error("Task failed within _performTaskWithProgress", e);
        } finally {
             // Ensure progress simulation ends before we finalize state
            if (!this.stopFlag) await progressPromise;
            
            if (this.stopFlag) {
                this.statusMessage = 'Task stopped by user.';
            } else if (taskError) {
                this.statusMessage = 'An error occurred.';
            } else {
                this.statusMessage = 'Complete!';
                this.progress = 100;
            }
            
            this.isLoading = false; 
            this.isPaused = false;
        }

        await new Promise(r => setTimeout(r, 1500));
        
        // Only reset if another process hasn't started
        if (!this.isLoading) {
            this.statusMessage = '';
            this.progress = 0;
            this.stopFlag = false;
        }
        
        if (taskError && !this.stopFlag) {
            throw taskError;
        }
        
        return this.stopFlag ? undefined : taskResult;
    }

    protected renderProgressIndicator() {
        if (!this.isLoading) return null;
        return html`
            <div class="progress-indicator">
                <p class="status-message">${this.isPaused ? `Paused: ${this.statusMessage}` : this.statusMessage}</p>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style=${styleMap({width: `${this.progress}%`})}></div>
                    </div>
                    <div class="progress-controls">
                        <button @click=${() => this.isPaused = !this.isPaused}>${this.isPaused ? 'Resume' : 'Pause'}</button>
                        <button @click=${() => this.stopFlag = true}>Stop</button>
                    </div>
                </div>
            </div>
        `;
    }
}