/**
 * @fileoverview Centralized data and constants for the Whisper Music OS.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const AGENT_DEFINITIONS = [
    { name: 'J Agent', status: 'Optimal', description: 'The executive co-pilot. Manages workflows, provides strategic suggestions, and makes decisions.' },
    { name: 'Songwriter++', status: 'Optimal', description: 'Primary agent for lyrics. Orchestrates the Architect and Lyricist agents.' },
    { name: 'Architect Agent', status: 'Standby', description: 'Specialist agent that designs compelling song structures and narrative arcs.' },
    { name: 'Lyricist Agent', status: 'Standby', description: 'Specialist agent that writes and refines lyrical content, including rhymes and metaphors.' },
    { name: 'MusicGen', status: 'Optimal', description: 'Primary agent for instrumentals. Orchestrates the Rhythm & Groove agent.' },
    { name: 'Rhythm & Groove', status: 'Standby', description: 'Specialist agent that controls beat, swing, and syncopation for a human-like feel.' },
    { name: 'Vocal Studio', status: 'Optimal', description: 'Primary agent for vocals. Manages the Harmony and Expression agents.' },
    { name: 'Harmony 2.0', status: 'Standby', description: 'Specialist agent that creates complex vocal stacks and harmonies.' },
    { name: 'Expression Agent', status: 'Standby', description: 'Specialist agent that adds realism to vocals through breath, vibrato, and imperfections.' },
    { name: 'Remix Agent', status: 'Optimal', description: 'Separates audio stems and reimagines tracks in new genres.' },
    { name: 'Imagen-3 Agent', status: 'Standby', description: 'Specialist agent for generating high-quality cover art from text prompts.' },
    { name: '3D Sound & Atmos', status: 'Standby', description: 'Manages spatial audio, binaural sound, and Dolby Atmos preparation.' },
    { name: 'Hypnotic Layer Agent', status: 'Standby', description: 'Generates and layers hypnotic sound frequencies to enhance mood.' },
    { name: 'Mastering Agent', status: 'Standby', description: 'Oversees the final mastering chain, including EQ, compression, and loudness targeting.' },
    { name: 'Trend-Sync Agent', status: 'Optimal', description: 'Monitors social media trends to inform creative direction and marketing.' },
    { name: 'Social Media Agent', status: 'Standby', description: 'Manages caption generation, auto-posting, and distribution schedules.' },
    { name: 'AI Critic', status: 'Standby', description: 'Evaluates tracks for viral potential, lyrical quality, and overall impact.' }
];

export const GENRES = ["Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Classical", "EDM", "Country", "Reggae", "Afrobeat", "Amapiano", "Trap", "Drill", "Lo-Fi", "Synthwave", "Metal", "Punk", "Blues", "Folk", "Funk", "Gospel", "House", "Techno", "Trance", "Dubstep", "Drum & Bass", "Soul", "Latin", "K-Pop", "J-Pop", "Bollywood", "Ambient", "World Music"];

export const MOODS = ["Chill", "Energetic", "Hypnotic", "Cinematic", "Romantic", "Aggressive", "Meditative"];

export const LYRICAL_STYLES = [
    { value: 'modern_pop_anthem', label: 'Modern Pop Anthem' },
    { value: 'poetic_ballad', label: 'Poetic Ballad' },
    { value: 'conscious_hip_hop', label: 'Conscious Hip-Hop' },
    { value: 'storytelling_folk', label: 'Storytelling Folk' },
    { value: 'abstract_experimental', label: 'Abstract & Experimental' },
];

export const GOD_MODE_WORKFLOW = [
  { title: 'System', details: 'Initiating God Mode protocol...' },
  { title: '[Songwriter++] Agent', details: 'Generating lyrical concepts for "Hype Trap"...' },
  { title: '[Rhythm & Groove] Agent', details: 'Laying down 160 BPM drum pattern...' },
  { title: '[Harmony 2.0] Agent', details: 'Crafting minor key synth progression...' },
  { title: '[MusicGen] Agent', details: 'Rendering instrumental layers...' },
  { title: '[Vocal Studio] Agent', details: 'Generating lead vocal take...' },
  { title: '[Remix] Agent', details: 'Creating ad-lib track from vocal stems...' },
  { title: '[Spice & Mastering] Agent', details: 'Applying "Club Mix" mastering chain...' },
  { title: '[Visuals Lab] Agent', details: 'Generating audio-reactive visuals...' },
  { title: '[AI Critic] Agent', details: 'Evaluating final track for viral potential...' },
  { title: 'System', details: 'God Mode workflow complete. Generating report...' }
];

export const INITIAL_LOGS = [
    { level: 'SUCCESS', ts: '14:32:01', msg: 'Cover Art generation complete for "Cyber Dreams". Image saved.' },
    { level: 'INFO', ts: '14:31:15', msg: 'Imagen-3 Agent: Rendering cover art (ETA: 45s)...' },
    { level: 'SUCCESS', ts: '14:28:55', msg: 'Evaluation complete for "Cyber Dreams". Viral Score: 88/100.' },
    { level: 'INFO', ts: '14:28:10', msg: 'Evaluation Agent: Scoring mood match...' },
];
