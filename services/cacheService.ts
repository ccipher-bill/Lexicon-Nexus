/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * A simple service for interacting with sessionStorage.
 * Handles JSON parsing and stringifying with error handling.
 */

const PREFIX = 'lexiconNexus_';

/**
 * Retrieves and parses a JSON value from sessionStorage.
 * @param key The key to retrieve.
 * @returns The parsed value, or null if not found or if parsing fails.
 */
export function get<T>(key: string): T | null {
  try {
    const item = sessionStorage.getItem(PREFIX + key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting item "${key}" from cache:`, error);
    return null;
  }
}

/**
 * Stringifies and saves a value to sessionStorage.
 * @param key The key to save under.
 * @param value The value to save.
 */
export function set<T>(key: string, value: T): void {
  try {
    const item = JSON.stringify(value);
    sessionStorage.setItem(PREFIX + key, item);
  } catch (error) {
    console.error(`Error setting item "${key}" in cache:`, error);
  }
}

/**
 * Clears all sessionStorage entries created by this app.
 */
export function clearAll(): void {
  try {
    // Create a list of keys to remove to avoid issues with modifying the collection while iterating
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(PREFIX)) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing session cache:', error);
  }
}
