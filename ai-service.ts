/**
 * @fileoverview A dedicated service to handle all interactions with the AI model.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Type, Chat, Tool} from '@google/genai';
import {tools} from './tools.js';

class AIService {
    private ai: GoogleGenAI;
    private chat: Chat | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is missing.');
        }
        this.ai = new GoogleGenAI({apiKey});
    }

    initializeChat() {
        if (!this.chat) {
            this.chat = this.ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are J Agent, the executive AI co-pilot for the Whisper Music OS. Your role is to assist the user with their music production workflow. When a user asks you to perform an action, use the available tools. Be helpful and concise.",
                    tools: tools as Tool[],
                },
            });
        }
    }

    async sendMessageStream(message: string) {
        if (!this.chat) {
            this.initializeChat();
        }
        return this.chat!.sendMessageStream({ message });
    }
    
    // --- Orchestrator Methods ---

    async runQuickDrop(prompt: string, vibe: string, leadVoice: string, loras: string[] = []) {
        const fullPrompt = `
            You are the J Orchestrator AI. Execute a "Quick Drop" workflow based on the user's request.
            Your goal is to generate a complete, ready-to-use song concept.
            
            User Prompt: "${prompt}"
            Desired Vibe: "${vibe}"
            Lead Voice Style: "${leadVoice}"
            Sound Palette (LoRAs): ${loras.length > 0 ? loras.join(', ') : 'None'}

            Perform the following steps and return a single JSON object with the results:
            1.  [Lyricist Agent]: Write a short, catchy song with a clear verse and chorus.
            2.  [Composer Agent]: Based on the prompt and lyrics, determine the genre and BPM.
            3.  [Cover Agent]: Write a visually descriptive prompt for an AI image generator to create compelling 1:1 cover art.
            4.  Package all of this into a single JSON object.
        `;
        
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            lyrics: { type: Type.STRING },
                            genre: { type: Type.STRING },
                            bpm: { type: Type.INTEGER },
                            coverArtPrompt: { type: Type.STRING }
                        },
                        required: ['title', 'lyrics', 'genre', 'bpm', 'coverArtPrompt']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in runQuickDrop:", e);
            return null;
        }
    }

    async getLyricConcept(brief: string) {
        const prompt = `
            You are the Lyricist Agent. The user wants a song about "${brief}".
            Generate two distinct lyrical concepts (A and B). Each concept should include a short verse and a hook/chorus.
            Keep them concise and different in tone or angle.
            Return a JSON object with two keys, "optionA" and "optionB", each containing "verse" and "chorus".
        `;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            optionA: { type: Type.OBJECT, properties: { verse: {type: Type.STRING}, chorus: {type: Type.STRING} }, required: ['verse', 'chorus'] },
                            optionB: { type: Type.OBJECT, properties: { verse: {type: Type.STRING}, chorus: {type: Type.STRING} }, required: ['verse', 'chorus'] }
                        },
                        required: ['optionA', 'optionB']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in getLyricConcept:", e);
            return null;
        }
    }

    async getMixPreview(lyrics: string) {
         const prompt = `
            You are the Mixing Agent and Mastering Agent working together.
            Based on these lyrics, create two distinct mix snapshots (A and B) for the user to compare.
            Lyrics: "${lyrics}"

            For each mix, provide a name (e.g., "Radio Ready Pop") and a brief description of the sonic character.
            Return a JSON object with keys "mixA" and "mixB".
        `;
         try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            mixA: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, description: {type: Type.STRING} }, required: ['name', 'description'] },
                            mixB: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, description: {type: Type.STRING} }, required: ['name', 'description'] }
                        },
                        required: ['mixA', 'mixB']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in getMixPreview:", e);
            return null;
        }
    }
    
    async generateTitle(lyrics: string) {
        const prompt = `You are the Titling Agent. Based on the following lyrics, generate a short, creative, and memorable song title. Return only the title as a plain string, without quotes.
        Lyrics:
        ---
        ${lyrics}
        ---
        Title:`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text.replace(/["']/g, "").trim(); // Clean up quotes
        } catch (e) {
            console.error("Error in generateTitle:", e);
            return null;
        }
    }

    async generateCoverArt(prompt: string) {
        try {
            const response = await this.ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: { numberOfImages: 1 },
            });
            
            if (!response.generatedImages || response.generatedImages.length === 0 || !response.generatedImages[0].image?.imageBytes) {
                console.error("Invalid response from generateImages API");
                return 'error';
            }

            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        } catch (e) {
            console.error("Error in generateCoverArt:", e);
            return 'error';
        }
    }

    async generateInitialSongIdeas(theme: string, lyricalStyle: string) {
        const prompt = `You are the Song Architect agent. Based on the theme "${theme}" and the lyrical style "${lyricalStyle}", write an initial song draft containing a verse, a chorus, and a bridge.`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            verse: { type: Type.STRING },
                            chorus: { type: Type.STRING },
                            bridge: { type: Type.STRING }
                        },
                        required: ['verse', 'chorus', 'bridge']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in generateInitialSongIdeas:", e);
            return null;
        }
    }

    async generateFinalDrafts(params: { verse: string; chorus: string; bridge: string; emotion: number; spice: number; language: string; lyricalStyle: string; }) {
        const prompt = `You are the Songwriter++ agent. Take the following initial lyrics and creative controls, and generate two distinct final drafts. Also, suggest new values for "emotion" and "spice" that you think fit the song better.
        Initial Lyrics:
        Verse: ${params.verse}
        Chorus: ${params.chorus}
        Bridge: ${params.bridge}
        
        Controls:
        Emotion: ${params.emotion}/100
        Spice: ${params.spice}/100
        Language: ${params.language}
        Style: ${params.lyricalStyle}

        Return a JSON object. Each draft should have a title, the full lyrics, and brief details about its creative direction.
        `;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            drafts: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        lyrics: { type: Type.STRING },
                                        details: { type: Type.STRING },
                                    },
                                    required: ['title', 'lyrics', 'details']
                                }
                            },
                            suggestedEmotion: { type: Type.INTEGER },
                            suggestedSpice: { type: Type.INTEGER }
                        },
                        required: ['drafts']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in generateFinalDrafts:", e);
            return null;
        }
    }
    
    async analyzeLyrics(lyrics: string) {
        const prompt = `You are the AI Critic agent. Analyze the following lyrics and provide a score from 0-100 and brief feedback for each of these categories: Rhyme Quality, Emotional Depth, Rhythmic Flow, and Originality.
        
        Lyrics: "${lyrics}"
        
        Return a JSON object with keys for each category.
        `;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                           rhymeQuality: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ['score', 'feedback'] },
                           emotionalDepth: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ['score', 'feedback'] },
                           rhythmicFlow: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ['score', 'feedback'] },
                           originality: { type: Type.OBJECT, properties: { score: {type: Type.INTEGER}, feedback: {type: Type.STRING} }, required: ['score', 'feedback'] },
                        },
                        required: ['rhymeQuality', 'emotionalDepth', 'rhythmicFlow', 'originality']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in analyzeLyrics:", e);
            return null;
        }
    }
    
    async getMuseSuggestions(mode: string, selectedText: string, fullContext: string) {
        const prompt = `You are the Lyrical Muse. The user has selected the text "${selectedText}" from their lyrics.
        Full Lyric Context:
        ---
        ${fullContext}
        ---
        
        Your task is to provide 3-4 suggestions to "${mode}" the selected text. For example, if the mode is "rhyme", suggest rhymes. If "flow", suggest phrasing with better rhythm. If "emotion", suggest more evocative language. If "metaphor", suggest metaphors.
        
        Return a JSON object with a "suggestions" key containing an array of strings.`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                           suggestions: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                           },
                        },
                        required: ['suggestions']
                    }
                }
            });
            const result = JSON.parse(response.text);
            return result.suggestions || [];
        } catch (e) {
            console.error("Error in getMuseSuggestions:", e);
            return [];
        }
    }
    
    async generateMusicDescription(prompt: string, complexity?: number) {
        let fullPrompt = `You are the MusicGen agent. Based on the following prompt, write a brief, evocative description of the instrumental music you would create.
        Prompt: "${prompt}"`;
        if (complexity !== undefined) {
            fullPrompt += `\nThe desired complexity/intensity of the arrangement is ${complexity} out of 100 (where 0 is very simple/sparse and 100 is very complex/dense).`;
        }
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
            });
            return response.text;
        } catch (e) {
            console.error("Error in generateMusicDescription:", e);
            return "Failed to generate music description.";
        }
    }
    
    async generateVocalGuide(params: { lyrics: string; rvcModel: string; vocalTone: number; vocalPitchCorrection: number; vocalTimingAdjustment: number; }) {
        const prompt = `You are the Vocal Studio agent. A user has provided lyrics and selected the virtual artist "${params.rvcModel}".
        The desired vocal tone is ${params.vocalTone} on a scale from 0 (Melancholy) to 100 (Energetic).
        The desired pitch correction is ${params.vocalPitchCorrection}/100 (where 100 is heavy correction).
        The desired timing adjustment is ${params.vocalTimingAdjustment}/100 (where 100 is perfectly on the grid).
        
        Write a concise performance guide for this artist, describing the vocal tone, delivery, and any suggested ad-libs or harmonies based on the lyrics and all the requested parameters.
        
        Lyrics: "${params.lyrics}"`;
         try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (e) {
            console.error("Error in generateVocalGuide:", e);
            return "Failed to generate vocal guide.";
        }
    }
    
    async generateRemixPlan(params: { genre: string; source: string; targets: string[]; loras: string; }) {
        const prompt = `You are the Remix Agent, a world-class music producer. Create a detailed and creative production plan for a remix.

        **Remix Parameters:**
        - **Source Material:** ${params.source}
        - **Target Genre:** ${params.genre}
        - **Stems to Focus On:** ${params.targets.join(', ')}
        - **Custom Sound Models (LoRAs) to Incorporate:** ${params.loras || 'None specified. Use your creativity.'}

        **Your Task:**
        Generate a comprehensive set of production notes organized into the following sections. Be specific and imaginative.

        1.  **Overall Concept & Vibe:**
            -   Describe the new feeling and direction of the remix. What's the story?

        2.  **Tempo and Rhythm:**
            -   Suggest a new BPM.
            -   Describe the new drum pattern and groove. What kind of drum sounds will you use? (e.g., "808s with a syncopated hi-hat pattern", "acoustic drums with a driving four-on-the-floor beat").

        3.  **Instrumentation & Melody:**
            -   How will you use the specified LoRAs? Describe the new melodic or harmonic elements you will add (e.g., "a gritty bassline using the 'lofi_grit_v1' model", "arpeggiated pads from 'synth_dreams_v2'").
            -   What new instruments will complement the genre?

        4.  **Structure:**
            -   Outline a new arrangement for the song (e.g., "Intro with filtered vocals, build into first drop, breakdown with just pads and vocals, final chorus with double-time drums").

        5.  **Vocal Processing:**
            -   How will you treat the vocals? (e.g., "chopped and screwed", "heavy reverb and delay", "vocoder effects").

        6.  **FX & Ear Candy:**
            -   Suggest specific effects, transitions, and small details to make the track interesting (e.g., "risers before the drop", "vinyl crackle for texture", "sidechain compression on the pads from the kick drum").`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (e) {
            console.error("Error in generateRemixPlan:", e);
            return "Failed to generate remix plan.";
        }
    }

    async getMasteringNotes(panningProfile: string, intensity: number) {
        const prompt = `You are the Mastering Agent. A user wants to apply a final master to their track.
        -   **Panning Profile:** ${panningProfile}
        -   **Spice Intensity:** ${intensity}/100
        
        Generate a brief report detailing the mastering chain applied (e.g., EQ adjustments, compression settings, loudness target).`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (e) {
            console.error("Error in getMasteringNotes:", e);
            return "Failed to generate mastering notes.";
        }
    }
    
    async runEvaluation() {
        const prompt = `You are the AI Critic. Evaluate a hypothetical track that was just produced. Provide a score from 0-100 for each of the following categories: Viral Potential, Beat Complexity, Lyric Originality, and Mood Match. Return a JSON object with these keys.`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                           viral: { type: Type.INTEGER },
                           beat: { type: Type.INTEGER },
                           lyric: { type: Type.INTEGER },
                           mood: { type: Type.INTEGER },
                        },
                        required: ['viral', 'beat', 'lyric', 'mood']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in runEvaluation:", e);
            return null;
        }
    }

    async generateCaption(trackTitle: string, themes: string[], platforms: string[]) {
        const prompt = `You are the Social Media Agent, an expert in music marketing. Generate engaging social media posts for the track "${trackTitle}".

        **Creative Themes:** ${themes.join(', ')}
        **Target Platforms:** ${platforms.join(', ')}

        For each platform, create a unique post that is tailored to its audience and format. Include relevant hashtags and a call-to-action.

        Return a JSON object containing a "captions" array. Each item in the array should be an object with "platform" and "caption" keys.
        `;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            captions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        platform: { type: Type.STRING },
                                        caption: { type: Type.STRING }
                                    },
                                    required: ['platform', 'caption']
                                }
                            }
                        },
                        required: ['captions']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in generateCaption:", e);
            return null;
        }
    }
    
    async generateFullTrackFromPrompt(prompt: string, vocalist: string) {
        const fullPrompt = `You are a "Text-to-Song Engine". A user has provided a prompt to generate a complete song.
        - **User Prompt:** "${prompt}"
        - **Lead Vocalist:** "${vocalist}"
        
        Your task is to generate a comprehensive song concept. Return a single JSON object containing:
        1.  **title:** A creative song title.
        2.  **genre:** The primary genre of the song.
        3.  **bpm:** The beats per minute (as an integer).
        4.  **mood:** A one-word mood descriptor (e.g., 'Melancholy', 'Energetic').
        5.  **lyrics:** The full song lyrics (verse, chorus, etc.).
        6.  **musicDescription:** A paragraph describing the instrumental arrangement.
        7.  **vocalPerformanceGuide:** A paragraph describing how the vocalist should perform the song.
        8.  **coverArtPrompt:** A visually descriptive prompt for an AI image generator to create cover art.`;
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            genre: { type: Type.STRING },
                            bpm: { type: Type.INTEGER },
                            mood: { type: Type.STRING },
                            lyrics: { type: Type.STRING },
                            musicDescription: { type: Type.STRING },
                            vocalPerformanceGuide: { type: Type.STRING },
                            coverArtPrompt: { type: Type.STRING }
                        },
                        required: ['title', 'genre', 'bpm', 'mood', 'lyrics', 'musicDescription', 'vocalPerformanceGuide', 'coverArtPrompt']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error in generateFullTrackFromPrompt:", e);
            return null;
        }
    }
}

let aiService: AIService | null = null;
try {
    aiService = new AIService();
} catch (e) {
    console.warn('AI service failed to initialize:', e);
}

export { aiService };