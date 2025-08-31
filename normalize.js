/**
 * Text normalization and answer matching utilities
 * Handles case-insensitive synonym matching with text cleaning
 */

/**
 * Normalizes text for comparison by:
 * - Trimming whitespace
 * - Converting to uppercase
 * - Replacing hyphens with spaces
 * - Removing punctuation and special characters
 * - Normalizing whitespace
 * - Removing common articles (the, a, an)
 * @param {string} s - Input string to normalize
 * @returns {string} Normalized string
 */
export function normalize(s) {
    return s
        .trim()
        .toUpperCase()
        .replaceAll('-', ' ')
        .replace(/[.,!?:"'()\\[\\]{}]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^(THE |A |AN )/, '');
}

/**
 * Checks if user input matches any of the correct answers
 * after normalization
 * @param {string} userInput - User's typed answer
 * @param {string[]} answersArray - Array of correct answers
 * @returns {boolean} True if input matches any answer
 */
export function isCorrect(userInput, answersArray) {
    const u = normalize(userInput);
    return answersArray.some(a => normalize(a) === u);
}

