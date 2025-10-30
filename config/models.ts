/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Defines the structure for an AI model option in the settings.
 */
export interface AiModel {
  id: string;      // The actual model name for the API call (e.g., 'gemini-flash-latest').
  name: string;    // A user-friendly name (e.g., 'Fast & Efficient').
  description: string; // A brief explanation for the user.
}

/**
 * A list of available AI models for the user to choose from.
 */
export const MODELS: AiModel[] = [
  { 
    id: 'gemini-flash-latest', 
    name: 'Fast & Efficient', 
    description: 'Uses Gemini Flash for the quickest responses.' 
  },
  { 
    id: 'gemini-2.5-pro', 
    name: 'Powerful & Advanced', 
    description: 'Uses Gemini 2.5 Pro for higher quality, but slower, results.'
  },
  {
    id: 'custom-model',
    name: 'Custom Model',
    description: 'Enter the name of a custom Gemini model.'
  }
];

/**
 * The default model to use if no setting is found.
 */
export const DEFAULT_MODEL_ID = MODELS[0].id;