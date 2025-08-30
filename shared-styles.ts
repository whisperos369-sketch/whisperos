/**
 * @fileoverview Shared CSS styles for the Whisper Music OS application.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css} from 'lit';

export const sharedStyles = css`
  /* Global Styles */
  .panel {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 5rem; /* Ensure content doesn't hide behind fixed button */
  }
  .control-group {
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .page-title {
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0 0 1rem 0;
    color: #fff;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #444;
  }
  h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  label, .label {
    font-size: 0.8rem;
    font-weight: bold;
    color: #ccc;
  }
  .sub-label {
    font-size: 0.75rem;
    color: #aaa;
    font-weight: normal;
    margin-top: -0.75rem;
    line-height: 1.4;
  }
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: flex-start;
  }
  select, input[type="number"], input[type="text"], input[type="file"], textarea {
    font-family: 'Google Sans', sans-serif;
    font-size: 0.85rem;
    padding: 0.6rem;
    border-radius: 5px;
    border: 1px solid #555;
    background-color: #333;
    color: #eee;
    width: 100%;
    box-sizing: border-box;
  }
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  button {
    font-family: 'Google Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    padding: 0.6rem 1.2rem;
    border-radius: 50px;
    border: none;
    background-color: #5200ff;
    color: #eee;
    cursor: pointer;
    transition: background-color 0.2s ease;
    align-self: flex-start;
  }
  button.icon-button {
      background: none;
      border: 1px solid #555;
      color: #ccc;
      padding: 0.5rem;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
  }
  button.icon-button:hover:not(:disabled) {
      background-color: #333;
      border-color: #777;
  }
  button:hover:not(:disabled) {
      background-color: #6a1fff;
  }
  button:disabled {
    background-color: #444;
    cursor: not-allowed;
  }

  /* Checkbox Group Styles */
  .checkbox-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
    padding-top: 0.5rem;
  }
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: normal;
  }
  .checkbox-group input[type="checkbox"] {
    width: auto;
  }

  /* Progress Indicator */
  .progress-indicator {
    padding-top: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .status-message {
    font-size: 0.8rem;
    color: #ccc;
    margin-bottom: 0.3rem;
  }
  .progress-bar-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }
  .progress-bar {
    flex-grow: 1;
    height: 5px;
    background-color: #111;
    border-radius: 3px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background-color: #5200ff;
    transition: width 0.3s ease-out;
  }
  .progress-controls button {
      font-size: 0.7rem;
      padding: 0.2rem 0.6rem;
      border-radius: 3px;
      align-self: center;
  }
  
  /* Wizard Styles */
  .wizard-breadcrumbs {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .breadcrumb-step {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    background-color: #333;
    color: #aaa;
    font-size: 0.75rem;
    border: 1px solid #444;
    transition: all 0.2s ease-in-out;
  }
  .breadcrumb-step.active {
    background-color: #5200ff;
    color: #fff;
    border-color: #5200ff;
    font-weight: 500;
  }
  .wizard-step-title {
    font-size: 1.2rem;
    font-weight: 500;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  /* HITL Gate Styles */
  .gate-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }
  .gate-option {
    border: 2px solid #444;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }
  .gate-option:hover {
    border-color: #666;
  }
  .gate-option.selected {
    border-color: #5200ff;
    background-color: rgba(82, 0, 255, 0.1);
  }
  .gate-option h4 {
    margin: 0 0 0.5rem 0;
  }
  .gate-option pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 0.8rem;
    color: #ccc;
    background-color: #222;
    padding: 0.5rem;
    border-radius: 5px;
  }
  
  /* Releases Utility Styles */
  .release-card {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .release-card img {
    width: 80px;
    height: 80px;
    border-radius: 5px;
    object-fit: cover;
  }
  .release-info {
    flex-grow: 1;
  }
  .release-info .status {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
  }
  .status-scheduled { background-color: #f97316; color: #fff; }
  .status-released { background-color: #22c55e; color: #fff; }
  
  /* Track Action Bar */
  .track-action-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
  }
  .track-action-bar svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
  }
  
  /* LoRA Styles */
  .lora-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
  }
  .lora-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #333;
      padding: 0.5rem 0.8rem;
      border-radius: 5px;
  }
  .lora-item-actions {
      display: flex;
      gap: 0.5rem;
  }
  .lora-item-actions button {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
  }
  .training-log-view {
    background-color: #111;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 0.8rem;
    margin-top: 1rem;
    max-height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.75rem;
  }
  .log-entry {
    line-height: 1.5;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .log-entry::before {
    font-size: 1.2em;
    line-height: 1.2;
    flex-shrink: 0;
  }
  .log-level-SUCCESS { color: #22c55e; }
  .log-level-SUCCESS::before { content: '✔'; }
  .log-level-INFO { color: #aaa; }
  .log-level-INFO::before { content: 'i'; color: #60a5fa; }
  .log-level-WARNING { color: #f97316; }
  .log-level-WARNING::before { content: '⚠'; }
  .log-level-ERROR { color: #ef4444; }
  .log-level-ERROR::before { content: '✖'; }

  
  /* Slider */
  .slider-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  .slider-container input[type="range"] {
      width: 100%;
  }
  .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #aaa;
  }

  .drop-zone {
      border: 2px dashed #555;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      color: #888;
      transition: border-color 0.2s ease, background-color 0.2s ease;
  }
  .drop-zone.drag-over {
      border-color: #5200ff;
      background-color: rgba(82, 0, 255, 0.1);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal-content {
    background-color: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-header h3 {
    margin: 0;
  }
  .modal-header .close-button {
    background: none;
    border: none;
    color: #ccc;
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }
`;