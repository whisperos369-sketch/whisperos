/**
 * @fileoverview App-wide context definitions.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {createContext} from '@lit/context';

// State Context
export type AppContext = {
    audioContext: AudioContext | null;
    currentTrack: { 
        title: string,
        artist: string,
        duration: number,
        audioBuffer: AudioBuffer | null,
    },
    updateTrack: (track: { title: string, artist: string, duration: number, audioBuffer: AudioBuffer | null }) => void;
    isPlaying: boolean;
    togglePlay: () => void;
};
export const appContext = createContext<AppContext>('app-context');