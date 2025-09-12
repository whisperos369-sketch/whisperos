/**
 * @fileoverview App-wide context definitions.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {createContext} from '@lit/context';

// Track definition
export interface Track {
    title: string;
    artist: string;
    duration: number;
    audioBuffer: AudioBuffer | null;
}

// State Context
export type AppContext = {
    audioContext: AudioContext | null;
    currentTrack: Track;
    updateTrack: (track: Track) => void;
    isPlaying: boolean;
    togglePlay: () => void;
};
export const appContext = createContext<AppContext>('app-context');
