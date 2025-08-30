/**
 * @fileoverview A real-time chat component to interact with J Agent.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {aiService} from './ai-service.js';
import {FunctionCall} from '@google/genai';

// Type definitions for Web Speech API to fix compile-time error.
// These are minimal definitions for what's used in this file.
interface SpeechRecognitionAlternative {
    readonly transcript: string;
}
interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly length: number;
}
interface SpeechRecognitionResultList {
    readonly [index: number]: SpeechRecognitionResult;
    readonly length: number;
}
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    start(): void;
    stop(): void;
}
declare var SpeechRecognition: { new(): SpeechRecognition };
declare var webkitSpeechRecognition: { new(): SpeechRecognition };

type Message = {
    role: 'user' | 'model';
    text: string;
    toolCalls?: FunctionCall[];
};

@customElement('j-chat')
export class JChat extends LitElement {
    @state() private isOpen = false;
    @state() private messages: Message[] = [];
    @state() private isLoading = false;
    @state() private isRecording = false;

    @query('input') private input!: HTMLInputElement;
    @query('.messages') private messagesContainer!: HTMLDivElement;

    private recognition: SpeechRecognition | null = null;
    
    // Text-to-speech properties
    private utteranceQueue: string[] = [];
    private isSpeaking = false;
    private sentenceBuffer = '';
    
    static override styles = css`
        :host {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 1000;
        }
        .chat-bubble {
            width: 60px;
            height: 60px;
            background-color: #5200ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s ease-in-out;
        }
        .chat-bubble:hover {
            transform: scale(1.1);
        }
        .chat-bubble svg {
            width: 32px;
            height: 32px;
            fill: #fff;
        }
        .chat-window {
            display: none;
            flex-direction: column;
            width: 350px;
            height: 500px;
            background-color: #2a2a2a;
            border: 1px solid #555;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            overflow: hidden;
        }
        .chat-window.open {
            display: flex;
        }
        .chat-header {
            padding: 0.8rem;
            background-color: #1e1e1e;
            color: #fff;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #555;
        }
        .chat-header button {
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 1.2rem;
        }
        .messages {
            flex-grow: 1;
            padding: 0.8rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }
        .message {
            padding: 0.6rem 0.9rem;
            border-radius: 15px;
            max-width: 80%;
            line-height: 1.4;
            font-size: 0.85rem;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .user-message {
            background-color: #5200ff;
            color: #fff;
            align-self: flex-end;
            border-bottom-right-radius: 3px;
        }
        .model-message {
            background-color: #3e3e3e;
            color: #eee;
            align-self: flex-start;
            border-bottom-left-radius: 3px;
        }
        .typing-indicator {
            align-self: flex-start;
            color: #aaa;
            font-style: italic;
        }
        .chat-input {
            display: flex;
            align-items: center;
            padding: 0.5rem 0.8rem;
            border-top: 1px solid #555;
        }
        .chat-input input {
            flex-grow: 1;
            border: 1px solid #555;
            background-color: #333;
            color: #eee;
            border-radius: 20px;
            padding: 0.6rem 1rem;
            font-size: 0.85rem;
            margin-right: 0.5rem;
        }
        .chat-input button {
            background-color: #5200ff;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #fff;
            flex-shrink: 0;
            margin-left: 0.3rem;
        }
        .chat-input button:disabled {
            background-color: #444;
            cursor: not-allowed;
        }
        .chat-input svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }
        .mic-button.recording {
            background-color: #ef4444; /* Red for recording */
        }
        .tool-call {
            background-color: #2a2a2a;
            border: 1px solid #555;
            border-radius: 5px;
            margin-top: 0.5rem;
            font-size: 0.75rem;
        }
        .tool-call summary {
            padding: 0.3rem 0.5rem;
            cursor: pointer;
            font-weight: bold;
        }
        .tool-call pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            background-color: #1e1e1e;
            padding: 0.5rem;
            margin: 0;
            border-top: 1px solid #555;
        }
    `;

    override firstUpdated() {
        aiService.initializeChat();
        this.messages = [{
            role: 'model',
            text: "J Agent online. How can I assist your creative workflow?"
        }];
        const SpeechRecognitionImpl = SpeechRecognition || webkitSpeechRecognition;
        if (SpeechRecognitionImpl) {
            this.recognition = new SpeechRecognitionImpl();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                this.input.value = finalTranscript + interimTranscript;
            };
            this.recognition.onend = () => {
                this.isRecording = false;
            };
        }
        window.addEventListener('beforeunload', () => speechSynthesis.cancel());
    }

    private _toggleOpen() {
        this.isOpen = !this.isOpen;
    }
    
    override updated() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    private async _sendMessage() {
        const userInput = this.input.value.trim();
        if (!userInput || this.isLoading) return;
        
        // Stop any currently playing speech
        speechSynthesis.cancel();
        this.utteranceQueue = [];
        this.isSpeaking = false;
        this.sentenceBuffer = '';

        this.messages = [...this.messages, {role: 'user', text: userInput}];
        this.input.value = '';
        this.isLoading = true;
        this.messages = [...this.messages, {role: 'model', text: ''}];
        
        try {
            const stream = await aiService.sendMessageStream(userInput);
            for await (const chunk of stream) {
                const lastMessage = this.messages[this.messages.length - 1];
                
                if (chunk.text) {
                    lastMessage.text += chunk.text;
                    this.sentenceBuffer += chunk.text;
                    this._queueSentencesForSpeech();
                }
                if (chunk.functionCalls) {
                    lastMessage.toolCalls = chunk.functionCalls;
                    // Dispatch the event for the main app to handle
                    chunk.functionCalls.forEach(fc => {
                        this.dispatchEvent(new CustomEvent('agent-action', {
                            detail: { functionName: fc.name, args: fc.args },
                            bubbles: true,
                            composed: true
                        }));
                    });
                }
                this.messages = [...this.messages]; // Trigger update
            }
        } catch (e) {
            console.error(e);
            const lastMessage = this.messages[this.messages.length - 1];
            lastMessage.text = 'Sorry, I encountered an error. Please try again.';
            this.messages = [...this.messages];
        } finally {
            this.isLoading = false;
             // Speak any remaining text in the buffer
            if (this.sentenceBuffer.length > 0) {
                this.utteranceQueue.push(this.sentenceBuffer.trim());
                this.sentenceBuffer = '';
                this._processSpeechQueue();
            }
        }
    }

    private _handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this._sendMessage();
        }
    }

    private _toggleRecording() {
        if (!this.recognition) return;
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
        } else {
            this.recognition.start();
            this.isRecording = true;
        }
    }
    
    private _renderToolCall(toolCall: FunctionCall) {
        return html`
            <div class="tool-call">
                <details>
                    <summary>J Agent used tool: <strong>${toolCall.name}</strong></summary>
                    <pre>${JSON.stringify(toolCall.args, null, 2)}</pre>
                </details>
            </div>
        `;
    }

    private _queueSentencesForSpeech() {
        const sentenceEndRegex = /(?<=[.?!])\s+/;
        const sentences = this.sentenceBuffer.split(sentenceEndRegex);
        
        if (sentences.length > 1) {
            const completeSentences = sentences.slice(0, -1);
            this.sentenceBuffer = sentences[sentences.length - 1];
            
            this.utteranceQueue.push(...completeSentences.map(s => s.trim()).filter(s => s.length > 0));
            this._processSpeechQueue();
        }
    }

    private _processSpeechQueue() {
        if (this.isSpeaking || this.utteranceQueue.length === 0) {
            return;
        }
        
        this.isSpeaking = true;
        const textToSpeak = this.utteranceQueue.shift();

        if (textToSpeak) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.onend = () => {
                this.isSpeaking = false;
                this._processSpeechQueue(); // Speak next sentence
            };
            utterance.onerror = (e) => {
                console.error("Speech synthesis error", e);
                this.isSpeaking = false;
                this._processSpeechQueue();
            }
            speechSynthesis.speak(utterance);
        } else {
            this.isSpeaking = false;
        }
    }

    override render() {
        if (!this.isOpen) {
            return html`
                <div class="chat-bubble" @click=${this._toggleOpen} role="button" aria-label="Open J Agent Chat">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
            `;
        }

        return html`
            <div class=${classMap({ "chat-window": true, "open": this.isOpen })}>
                <div class="chat-header">
                    <span>J Agent Chat</span>
                    <button @click=${this._toggleOpen} aria-label="Close Chat">&times;</button>
                </div>
                <div class="messages">
                    ${this.messages.map(msg => html`
                        <div class="message ${msg.role}-message">
                            ${msg.text}
                            ${msg.toolCalls?.map(tc => this._renderToolCall(tc))}
                        </div>
                    `)}
                    ${this.isLoading && this.messages[this.messages.length - 1]?.text === '' ? html`<div class="typing-indicator model-message">J is thinking...</div>` : ''}
                </div>
                <div class="chat-input">
                    <input type="text" placeholder="Ask or command J..." @keydown=${this._handleKeydown} ?disabled=${this.isLoading}>
                     ${this.recognition ? html`
                        <button 
                            class="mic-button ${classMap({recording: this.isRecording})}" 
                            @click=${this._toggleRecording} 
                            aria-label=${this.isRecording ? 'Stop Recording' : 'Start Recording'}>
                            <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>
                        </button>
                    ` : ''}
                    <button @click=${this._sendMessage} ?disabled=${this.isLoading} aria-label="Send Message">
                         <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }
}