/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import {GoogleGenAI, Type} from '@google/genai';
import * as cache from './cacheService';
import * as settingsService from './settingsService';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

/**
 * Creates and returns a new GoogleGenAI instance using the currently active API key.
 * This function is called before each API request to ensure the correct key is used.
 * @returns A configured GoogleGenAI instance.
 * @throws An error if no API key is configured.
 */
function getAiInstance(): GoogleGenAI {
  const apiKey = settingsService.getApiKey();
  if (!apiKey) {
    throw new Error('API Key is not configured. Please add it in the settings panel.');
  }
  return new GoogleGenAI({ apiKey });
}

interface Hotspot {
  char: string;
  x: number; // column
  y: number; // row
  concept: string;
}

export interface AsciiArtData {
  art: string;
  hotspots?: Hotspot[];
}

interface Resource {
  title: string;
  url?: string;
  description: string;
}

export interface DeepDiveData {
  summary: string;
  resources: Resource[];
}

export interface AncillaryData {
  artData: AsciiArtData;
  concepts: string[];
}

/**
 * A centralized error handler for Gemini API calls.
 * It checks for specific rate-limiting errors and returns a user-friendly message.
 * @param error The error object caught.
 * @param context A string describing the operation that failed (e.g., "generate ASCII art").
 * @returns A new Error object with a cleaned-up message.
 */
function handleGeminiError(error: unknown, context: string): Error {
  console.error(`Error during ${context}:`, error);
  let message = 'An unknown error occurred.';
  if (error instanceof Error) {
    message = error.message;
  }

  // Check for Gemini-specific rate limit error structure in the message string
  if (typeof message === 'string' && (message.includes('RESOURCE_EXHAUSTED') || message.includes('"code":429') || message.includes('rate limit'))) {
    // Return a more user-friendly error for rate limiting.
    return new Error('API rate limit exceeded. Please wait a moment and try again.');
  }

  // For other errors, return a generic message that includes the context.
  return new Error(`Could not ${context}. ${message}`);
}

/**
 * A wrapper for non-streaming Gemini API calls that implements exponential backoff on rate limit errors.
 * @param requestFn The async function that makes the API call.
 * @param onRetry An optional callback to inform the UI about a retry attempt.
 * @returns The result of the request function.
 */
async function geminiRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await requestFn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.message.includes('API rate limit exceeded')) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          if (onRetry) {
            onRetry(attempt + 1, delay);
          }
          console.log(`Rate limit exceeded. Retrying in ${delay}ms... (Attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      throw lastError;
    }
  }
  throw lastError!;
}


/**
 * Streams a definition for a given topic from the Gemini API, with built-in retry logic.
 * @param topic The word or term to define.
 * @returns An async generator that yields text chunks of the definition or retry status messages.
 */
export async function* streamDefinition(
  topicOrQuery: string,
  file?: { data: string; mimeType: string; }
): AsyncGenerator<string, void, undefined> {
  const ai = getAiInstance();
  const modelId = settingsService.getActiveModelId();
  let contents: any;

  if (file) {
    // This is a file query.
    contents = {
      parts: [
        { inlineData: { mimeType: file.mimeType, data: file.data } },
        { text: `Based on the provided document, answer the following question: "${topicOrQuery}"` }
      ]
    };
  } else {
    // This is a standard topic definition request.
    const prompt = `Provide a concise, single-paragraph encyclopedia-style definition for the term: "${topicOrQuery}". Be informative and neutral. Do not use markdown, titles, or any special formatting. Respond with only the text of the definition itself.`;
    contents = prompt;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContentStream({
        model: modelId,
        contents: contents,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
      return; // Success, exit generator.
    } catch (error) {
      const context = `generate content for "${topicOrQuery}"`;
      lastError = handleGeminiError(error, context);

      if (lastError.message.includes('API rate limit exceeded')) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          yield `[SYSTEM:RETRY]Rate limit exceeded. Retrying in ${Math.round(delay/1000)}s...`;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw lastError;
    }
  }
}

/**
 * Generates ASCII art and related concepts for a topic, with retry logic.
 * @param topic The topic to generate data for.
 * @param onRetry An optional callback to inform the UI about a retry attempt.
 * @returns A promise resolving to an object with art and concepts.
 */
export async function generateAncillaryData(
  topic: string,
  onRetry?: (attempt: number, delay: number) => void
): Promise<AncillaryData> {
  const modelId = settingsService.getActiveModelId();
  const cacheKey = `ancillary_${modelId}_${topic.toLowerCase()}`;
  const cachedData = cache.get<AncillaryData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const apiCall = async () => {
    const ai = getAiInstance();
    const prompt = `
      For the topic "${topic}", generate two pieces of data:
      1. A list of 5-7 closely related concepts.
      2. A meta ASCII art visualization for the topic.

      The response must be a single JSON object with two keys: "concepts" and "artData".

      - "concepts": An array of 5-7 strings. For "Hypertext", this could be ["HTML", "Vannevar Bush", "Non-linear", "World Wide Web", "Hyperlink"].
      - "artData": An object with two keys:
        - "art": A string containing the ASCII art. Use this palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|. The visual form must embody the word's essence.
        - "hotspots": An array of 3-5 objects, where each object identifies a key character in the art and has keys: "char", "x" (column), "y" (row), and "concept" (a short related idea).
    `;

    try {
      const enableThinking = settingsService.getSetting<boolean>('highQualityArt', true);

      const config: any = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'An array of 5-7 strings of related concepts.',
            },
            artData: {
              type: Type.OBJECT,
              properties: {
                art: {
                  type: Type.STRING,
                  description: `A string containing ASCII art representing "${topic}".`,
                },
                hotspots: {
                  type: Type.ARRAY,
                  description: "An array of interactive hotspot objects within the art.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      char: { type: Type.STRING },
                      x: { type: Type.INTEGER },
                      y: { type: Type.INTEGER },
                      concept: { type: Type.STRING }
                    },
                    required: ['char', 'x', 'y', 'concept']
                  }
                }
              },
              required: ['art']
            }
          },
          required: ['concepts', 'artData'],
        },
      };

      if (enableThinking) {
          config.thinkingConfig = { thought: true };
      } else {
          config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: config,
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }

      const parsed = JSON.parse(jsonStr) as AncillaryData;
      
      if (typeof parsed.artData?.art !== 'string' || parsed.artData.art.trim().length === 0) {
        throw new Error('Invalid or empty ASCII art in response');
      }
      
      cache.set(cacheKey, parsed);
      return parsed;

    } catch (error) {
      throw handleGeminiError(error, `generate ancillary data for "${topic}"`);
    }
  };

  return geminiRequestWithRetry(apiCall, onRetry);
}


/**
 * Generates a detailed summary and curated resources for a given topic, with retry logic.
 * @param topic The topic to generate a deep dive for.
 * @param onRetry An optional callback to inform the UI about a retry attempt.
 * @returns A promise resolving to an object with a summary and resources.
 */
export async function generateDeepDive(
  topic: string,
  onRetry?: (attempt: number, delay: number) => void
): Promise<DeepDiveData> {
  const modelId = settingsService.getActiveModelId();
  const cacheKey = `deepdive_${modelId}_${topic.toLowerCase()}`;
  const cachedData = cache.get<DeepDiveData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const apiCall = async () => {
    const ai = getAiInstance();
    const prompt = `
      For the topic "${topic}", provide a detailed analysis. Your response must be in JSON format.

      The JSON object should contain two keys:
      1. "summary": A string containing a comprehensive, multi-paragraph summary exploring the nuances, history, and significance of the topic. Wrap key concepts and terms within the summary text in double square brackets, like "[[Vannevar Bush]]" or "[[hyperlink]]", to make them interactive.
      2. "resources": An array of 3-5 objects, where each object represents a curated resource for further learning. Each resource object must have:
        - "title": The title of the resource (e.g., an article, a book, a video).
        - "url": The full URL to the resource. If it's a book, link to a relevant page like Goodreads or Wikipedia.
        - "description": A brief, one-sentence description of what the resource offers.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A detailed, multi-paragraph summary. Important, related keywords within the summary must be wrapped in double square brackets, e.g., [[keyword]].',
              },
              resources: {
                type: Type.ARRAY,
                description: 'An array of curated resources for further learning.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'The title of the resource.' },
                    url: { type: Type.STRING, description: 'The URL for the resource.' },
                    description: { type: Type.STRING, description: 'A brief description of the resource.' },
                  },
                  required: ['title', 'url', 'description'],
                },
              },
            },
            required: ['summary', 'resources'],
          },
        },
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[1]) {
        jsonStr = match[1].trim();
      }
      
      const parsed = JSON.parse(jsonStr) as DeepDiveData;
      cache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      throw handleGeminiError(error, `generate deep dive for "${topic}"`);
    }
  };

  return geminiRequestWithRetry(apiCall, onRetry);
}