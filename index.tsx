/**
 * @fileoverview The main application shell for the Whisper Music OS.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement, svg} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {provide} from '@lit/context';
import {classMap} from 'lit/directives/class-map.js';

import {appContext, AppContext} from './context.js';
import {formatDuration} from './utils.js';
import {sharedStyles} from './shared-styles.js';

// Import new mode and utility components
import './j-chat.js';
import type { QuickDropMode } from './quick-drop-mode.js';
import type { ReleasesUtility } from './releases-utility.js';
import type { RemixLoraMode } from './remix-lora-mode.js';


type ActiveView = 'quick-drop' | 'studio' | 'remix-lora' | 'releases' | 'settings';

@customElement('whisper-music-studio')
class WhisperMusicStudio extends LitElement {
    private audioContext: AudioContext | null = null;
    private currentSourceNode: AudioBufferSourceNode | null = null;
    private trackStartTime = 0;
    private pausedTime = 0;
    
    private analyser: AnalyserNode | null = null;
    @state() private frequencyData: Uint8Array | null = null;

    constructor() {
        super();
        try {
            this.audioContext = new AudioContext();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
        }
        this._appContext = {
            audioContext: this.audioContext,
            currentTrack: this.currentTrack,
            updateTrack: this._updateTrack,
            isPlaying: this.isPlaying,
            togglePlay: this._togglePlay,
        };
    }
    
    @state() 
    private currentTrack: AppContext['currentTrack'] = { title: 'Untitled', artist: 'J Agent', duration: 0, audioBuffer: null };

    @provide({context: appContext})
    @state()
    private _appContext: AppContext;

    @state() private isPlaying = false;
    @state() private currentTime = 0;
    @state() private barHeights: number[] = Array(50).fill(2);
    @state() private activeView: ActiveView = 'quick-drop';
    @state() private primaryAction = { label: 'Generate', action: () => {}, disabled: true };
    @state() private loadedViews: Record<ActiveView, boolean> = {
        'quick-drop': false,
        'studio': false,
        'remix-lora': false,
        'releases': false,
        'settings': false,
    };

    @query('quick-drop-mode') private quickDropMode!: QuickDropMode;
    @query('releases-utility') private releasesUtility!: ReleasesUtility;
    @query('remix-lora-mode') private remixLoraMode!: RemixLoraMode;

    private animationFrameId = 0;
    
    private readonly MODES = [
        {id: 'quick-drop', label: 'Quick Drop'},
        {id: 'studio', label: 'Studio'},
        {id: 'remix-lora', label: 'Remix & LoRA'},
    ];

    private readonly UTILITIES = [
        {id: 'releases', label: 'Releases'},
        {id: 'settings', label: 'Settings'},
    ];

    static override styles = [
        sharedStyles,
        css`
        :host {
            display: block;
            height: 100vh;
            width: 100vw;
            background-color: #1c1c1c;
            color: #eee;
            font-family: 'Google Sans', sans-serif;
            overflow: hidden;
        }
        .app-layout {
            display: flex;
            height: calc(100% - 37px); /* Full height minus player bar */
        }
        .sidebar {
            width: 220px;
            background-color: #111;
            padding: 1.25rem;
            box-sizing: border-box;
            border-right: 1px solid #444;
            display: flex;
            flex-direction: column;
            z-index: 2; /* Sidebar above content */
        }
        .sidebar h1 {
            font-size: 1.1rem;
            font-weight: 500;
            margin: 0 0 1.5rem 0;
            color: #fff;
        }
        .sidebar nav {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .sidebar nav h2 {
            font-size: 0.7rem;
            text-transform: uppercase;
            color: #888;
            margin: 1rem 0 0.25rem;
            letter-spacing: 0.5px;
        }
        .sidebar a {
            display: block;
            color: #ccc;
            text-decoration: none;
            padding: 0.5rem 0.8rem;
            border-radius: 5px;
            font-size: 0.85rem;
            transition: background-color 0.2s ease, color 0.2s ease;
            cursor: pointer;
        }
        .sidebar a:hover {
            background-color: #2a2a2a;
        }
        .sidebar a.active {
            background-color: #5200ff;
            color: #fff;
            font-weight: 500;
        }
        .main-content {
            flex: 1;
            overflow-y: auto;
            position: relative;
        }
        .loading {
            position: absolute;
            inset: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #1c1c1c;
            color: #ccc;
        }
        .player-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 36px;
            background-color: #111;
            border-top: 1px solid #444;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            gap: 0.8rem;
            z-index: 10;
        }
        .player-controls button {
            background: none;
            border: none;
            color: #eee;
            cursor: pointer;
            padding: 0.3rem;
        }
        .player-controls button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .track-info {
            flex-grow: 1;
            display: flex;
            align-items: center;
            gap: 0.6rem;
            overflow: hidden;
        }
        .track-title {
            font-size: 0.8rem;
            font-weight: 500;
            white-space: nowrap;
        }
        .track-artist {
            font-size: 0.75rem;
            color: #aaa;
            white-space: nowrap;
        }
        .visualizer {
            height: 22px;
            display: flex;
            align-items: center;
            gap: 2px;
            width: 120px;
        }
        .visualizer-bar {
            width: 2px;
            background-color: #5200ff;
        }
        .time-display {
            font-size: 0.8rem;
            color: #ccc;
        }
        .metrics-panel {
            position: fixed;
            top: 1rem;
            right: 1.5rem;
            display: flex;
            gap: 0.8rem;
            background-color: rgba(30, 30, 30, 0.8);
            backdrop-filter: blur(5px);
            padding: 0.4rem 0.8rem;
            border-radius: 8px;
            border: 1px solid #444;
            z-index: 5;
            font-size: 0.75rem;
        }
        .metric-item strong {
            color: #fff;
        }
        .metric-status-green { color: #22c55e; }
        .primary-action-button {
            position: fixed;
            bottom: calc(36px + 1.5rem); /* Player height + padding */
            right: 1.5rem;
            z-index: 5;
            padding: 0.8rem 1.5rem;
            font-size: 1rem;
            font-weight: 500;
        }
    `];

    override connectedCallback() {
        super.connectedCallback();
        this.addEventListener('primary-action-update', this._handlePrimaryActionUpdate as EventListener);
        this.addEventListener('agent-action', this._handleAgentAction as EventListener);
        this.addEventListener('schedule-release', this._handleScheduleRelease as EventListener);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        cancelAnimationFrame(this.animationFrameId);
        this.analyser?.disconnect();
        this.audioContext?.close();
        this.removeEventListener('primary-action-update', this._handlePrimaryActionUpdate as EventListener);
        this.removeEventListener('agent-action', this._handleAgentAction as EventListener);
        this.removeEventListener('schedule-release', this._handleScheduleRelease as EventListener);
    }

    override firstUpdated() {
        this._loadView(this.activeView);
    }

    protected override willUpdate(changedProperties: Map<string | number | symbol, unknown>): void {
        if (changedProperties.has('currentTrack') || changedProperties.has('isPlaying')) {
            this._appContext = {
                ...this._appContext,
                currentTrack: this.currentTrack,
                isPlaying: this.isPlaying,
            };
        }
    }

    private _updateTrack = (track: AppContext['currentTrack']) => {
        this._pauseCurrentTrack();
        this.currentTrack = track;
        this.isPlaying = false;
        this.currentTime = 0;
        this.pausedTime = 0;
    }
    
    private _handlePrimaryActionUpdate(e: CustomEvent) {
        this.primaryAction = e.detail;
    }

    private _handleAgentAction(e: CustomEvent) {
        const { functionName, args } = e.detail;
        if (functionName === 'navigateToView' && args.viewId) {
            this._handleViewChange(args.viewId);
        } else if (functionName === 'runQuickDrop' && this.quickDropMode) {
            this.quickDropMode.triggerQuickDrop(args.prompt, args.vibe, args.leadVoice);
        } else if (functionName === 'generateRemixPlan' && this.remixLoraMode) {
             this.remixLoraMode.triggerRemixPlan(args.source, args.genre, args.targets);
        }
    }

    private async _handleScheduleRelease(e: CustomEvent) {
        const trackData = e.detail;
        this.activeView = 'releases';
        await this._loadView('releases');
        if (this.releasesUtility) {
            this.releasesUtility.scheduleNewRelease(trackData);
        }
    }

    private _handlePrimaryActionClick() {
        if (this.primaryAction.action) {
            this.primaryAction.action();
        }
    }
    
    private _playCurrentTrack() {
        if (!this.audioContext || !this.currentTrack.audioBuffer) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.currentTrack.audioBuffer;
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        source.start(0, this.pausedTime);
        source.onended = () => {
             if (this.isPlaying) { // If it ended naturally
                this._pauseCurrentTrack();
                this.currentTime = 0;
                this.pausedTime = 0;
            }
        };
        
        this.currentSourceNode = source;
        this.trackStartTime = this.audioContext.currentTime - this.pausedTime;
        this.isPlaying = true;
        this._animateVisualizer();
    }

    private _pauseCurrentTrack() {
        if (this.currentSourceNode && this.audioContext) {
            this.pausedTime = this.audioContext.currentTime - this.trackStartTime;
            this.currentSourceNode.stop();
            this.currentSourceNode.onended = null;
            this.currentSourceNode = null;
            this.isPlaying = false;
            cancelAnimationFrame(this.animationFrameId);
            this.barHeights = Array(50).fill(2);
        }
    }

    private _togglePlay = () => {
        if (!this.currentTrack.audioBuffer) return;
        if (this.isPlaying) this._pauseCurrentTrack(); else this._playCurrentTrack();
    }

    private _animateVisualizer() {
        if (!this.isPlaying || !this.currentSourceNode) return;

        if (this.analyser && this.frequencyData) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            this.barHeights = Array.from(this.frequencyData).slice(0, 50).map(v => 2 + (v / 255) * 20);
        }

        if (this.audioContext) {
            this.currentTime = this.audioContext.currentTime - this.trackStartTime;
        }
        this.animationFrameId = requestAnimationFrame(() => this._animateVisualizer());
    }

    private async _loadView(view: ActiveView) {
        if (this.loadedViews[view]) return;
        switch (view) {
            case 'quick-drop':
                await import('./quick-drop-mode.js');
                break;
            case 'studio':
                await import('./studio-mode.js');
                break;
            case 'remix-lora':
                await import('./remix-lora-mode.js');
                break;
            case 'releases':
                await import('./releases-utility.js');
                break;
            case 'settings':
                await import('./settings-utility.js');
                break;
        }
        this.loadedViews = { ...this.loadedViews, [view]: true };
    }

    private _handleViewChange(view: ActiveView) {
        this.activeView = view;
        this._loadView(view);
    }

    private _renderActiveView() {
        return html`
            ${!this.loadedViews[this.activeView] ? html`<div class="loading">Loading...</div>` : null}
            <quick-drop-mode .hidden=${this.activeView !== 'quick-drop'}></quick-drop-mode>
            <studio-mode .hidden=${this.activeView !== 'studio'}></studio-mode>
            <remix-lora-mode .hidden=${this.activeView !== 'remix-lora'}></remix-lora-mode>
            <releases-utility .hidden=${this.activeView !== 'releases'}></releases-utility>
            <settings-utility .hidden=${this.activeView !== 'settings'}></settings-utility>
        `;
    }

    override render() {
        return html`
            <div class="app-layout">
                <nav class="sidebar">
                    <h1>Whisper Music OS</h1>
                    <nav>
                        <h2>Modes</h2>
                        ${this.MODES.map(mode => html`
                            <a class=${classMap({ active: this.activeView === mode.id })}
                               @click=${() => this._handleViewChange(mode.id as ActiveView)}>
                                ${mode.label}
                            </a>`)}
                    </nav>
                     <nav>
                        <h2>Utilities</h2>
                        ${this.UTILITIES.map(util => html`
                            <a class=${classMap({ active: this.activeView === util.id })}
                               @click=${() => this._handleViewChange(util.id as ActiveView)}>
                                ${util.label}
                            </a>`)}
                    </nav>
                </nav>
                <div class="main-content">
                    ${this._renderActiveView()}
                </div>
            </div>

            <div class="metrics-panel">
                <span class="metric-item">GPU VRAM: <strong>31%</strong></span>
                <span class="metric-item">Render Queue: <strong>0</strong></span>
                <span class="metric-item">Agent Health: <strong class="metric-status-green">Optimal</strong></span>
            </div>

            <button class="primary-action-button" ?disabled=${this.primaryAction.disabled} @click=${this._handlePrimaryActionClick}>
                ${this.primaryAction.label}
            </button>
            
            <div class="player-bar">
                <div class="player-controls">
                    <button @click=${this._togglePlay} ?disabled=${!this.currentTrack.audioBuffer} aria-label=${this.isPlaying ? 'Pause' : 'Play'}>
                        ${this.isPlaying ? 
                            svg`<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>` :
                            svg`<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
                        }
                    </button>
                </div>
                <div class="track-info">
                    <span class="track-title">${this.currentTrack.title}</span>
                    <span class="track-artist">${this.currentTrack.artist}</span>
                    <div class="visualizer">
                        ${this.barHeights.map(height => html`<div class="visualizer-bar" style="height: ${height}px;"></div>`)}
                    </div>
                </div>
                <span class="time-display">${formatDuration(this.currentTime)} / ${formatDuration(this.currentTrack.duration)}</span>
            </div>
            <j-chat></j-chat>
        `;
    }
}