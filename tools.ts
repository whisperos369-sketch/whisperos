/**
 * @fileoverview Tool definitions for J Agent function calling.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {Type} from '@google/genai';

export const tools = [
  {
    functionDeclarations: [
      {
        name: "navigateToView",
        description: "Navigate the user's view to a specific mode or utility.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            viewId: {
              type: Type.STRING,
              description: "The ID of the view to navigate to. One of: 'quick-drop', 'studio', 'remix-lora', 'releases', 'settings'."
            },
          },
          required: ["viewId"]
        }
      },
      {
        name: "runQuickDrop",
        description: "Initiates the Quick Drop workflow to generate a complete song from a single prompt.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "A natural language description of the song to create, e.g., 'a cinematic trap beat about exploring a new city'."
            },
            vibe: {
                type: Type.STRING,
                description: "The overall vibe. One of: 'Chill', 'Energetic', 'Hypnotic', 'Cinematic'."
            },
            leadVoice: {
                type: Type.STRING,
                description: "The style of the lead voice. One of: 'Whisper Soul', 'Titan', 'Aria'."
            }
          },
          required: ["prompt", "vibe", "leadVoice"]
        }
      }
    ]
  }
];