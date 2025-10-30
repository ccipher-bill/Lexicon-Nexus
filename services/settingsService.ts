/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { DEFAULT_MODEL_ID } from '../config/models';

/**
 * A simple service for interacting with localStorage for persistent user settings.
 * Handles JSON parsing and stringifying with error handling.
 */

const PREFIX = 'lexiconNexusSettings_';

/**
 * Retrieves and parses a JSON value from localStorage.
 * @param key The key to retrieve.
 * @param defaultValue The value to return if the key is not found.
 * @returns The parsed value, or the default value if not found or if parsing fails.
 */
export function getSetting<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(PREFIX + key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting setting "${key}" from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Stringifies and saves a value to localStorage.
 * @param key The key to save under.
 * @param value The value to save.
 */
export function setSetting<T>(key: string, value: T): void {
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(PREFIX + key, item);
  } catch (error) {
    console.error(`Error setting setting "${key}" in localStorage:`, error);
  }
}

/**
 * Retrieves the active API key.
 * It first checks for a user-provided key in localStorage,
 * then falls back to the environment variable.
 * @returns The API key string, or null if not found in either location.
 */
export function getApiKey(): string | null {
  const customKey = getSetting<string>('customApiKey', '').trim();
  if (customKey) {
    return customKey;
  }
  // The process.env.API_KEY can be an empty string if not set, so check for truthiness.
  if (process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return null;
}

/**
 * Determines the active model ID based on user settings.
 * If a custom model is selected, it returns the custom model name.
 * Falls back to the default model if the custom name is empty.
 * @returns The active model ID string.
 */
export function getActiveModelId(): string {
  const selectedModel = getSetting<string>('apiModel', DEFAULT_MODEL_ID);
  if (selectedModel === 'custom-model') {
    const customModelName = getSetting<string>('customApiModel', '').trim();
    // Fallback to default if custom is selected but the name is empty.
    return customModelName || DEFAULT_MODEL_ID;
  }
  return selectedModel;
}