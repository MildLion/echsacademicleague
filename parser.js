/**
 * Question bank parser and validator
 * Handles flat-file parsing with error handling and validation
 */

/**
 * Splits a line on unescaped semicolons
 * Handles \; as literal semicolons and \\ as literal backslashes
 * @param {string} line - Raw line from file
 * @returns {string[]} Array of fields
 */
export function splitOnUnescapedSemicolons(line) {
    const fields = [];
    let currentField = '';
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '\\' && nextChar === ';') {
            // Escaped semicolon
            currentField += ';';
            i += 2;
        } else if (char === '\\' && nextChar === '\\') {
            // Escaped backslash
            currentField += '\\';
            i += 2;
        } else if (char === ';') {
            // Field separator
            fields.push(currentField);
            currentField = '';
            i++;
        } else {
            // Regular character
            currentField += char;
            i++;
        }
    }
    
    // Add the last field
    fields.push(currentField);
    
    return fields;
}

/**
 * Validates that a level string is one of the allowed values
 * @param {string} level - Level to validate
 * @returns {boolean} True if valid
 */
function isValidLevel(level) {
    const validLevels = ['Freshman', 'Junior Varsity', 'Varsity'];
    return validLevels.includes(level);
}

/**
 * Parses a single line from the question bank
 * @param {string} line - Raw line from file
 * @param {string} filename - Source filename for error reporting
 * @param {number} lineNumber - Line number for error reporting
 * @returns {Object|null} Parsed question object or null if invalid
 */
export function parseQuestionLine(line, filename, lineNumber) {
    try {
        // Skip empty lines
        if (!line.trim()) {
            return null;
        }
        
        const fields = splitOnUnescapedSemicolons(line);
        
        // Must have exactly 5 fields
        if (fields.length !== 5) {
            throw new Error(`Expected 5 fields, got ${fields.length}`);
        }
        
        const [category, question, answersJson, level, author] = fields;
        
        // Validate category
        if (!category.trim()) {
            throw new Error('Category cannot be empty');
        }
        
        // Validate question
        if (!question.trim()) {
            throw new Error('Question cannot be empty');
        }
        
        // Parse and validate answers JSON
        let answers;
        try {
            answers = JSON.parse(answersJson);
        } catch (jsonError) {
            throw new Error(`Invalid JSON in answers field: ${jsonError.message}`);
        }
        
        if (!Array.isArray(answers) || answers.length === 0) {
            throw new Error('Answers must be a non-empty array');
        }
        
        if (!answers.every(a => typeof a === 'string' && a.trim())) {
            throw new Error('All answers must be non-empty strings');
        }
        
        // Validate level
        if (!isValidLevel(level)) {
            throw new Error(`Unknown level: ${level}`);
        }
        
        // Validate author
        if (!author.trim()) {
            throw new Error('Author cannot be empty');
        }
        
        // Extract broad and specific subjects
        const subjectParts = category.split('>');
        const subjectBroad = subjectParts[0];
        const subjectSpecific = subjectParts.length > 1 ? subjectParts[1] : category;
        
        // Generate stable ID (simple hash of content)
        const id = generateId(category + question + level + author);
        
        return {
            id,
            category: category.trim(),
            subjectBroad: subjectBroad.trim(),
            subjectSpecific: subjectSpecific.trim(),
            question: question.trim(),
            answers: answers.map(a => a.trim()),
            level: level.trim(),
            author: author.trim()
        };
        
    } catch (error) {
        // Return structured error for display
        return {
            error: true,
            filename,
            line: lineNumber,
            reason: error.message,
            rawLine: line
        };
    }
}

/**
 * Generates a simple hash-based ID for questions
 * @param {string} content - Content to hash
 * @returns {string} Stable ID
 */
function generateId(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Parses the entire question bank file
 * @param {string} content - File content as string
 * @param {string} filename - Source filename
 * @returns {Object} Object with questions array and errors array
 */
export function parseQuestionBank(content, filename) {
    const lines = content.split('\n');
    const questions = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const result = parseQuestionLine(line, filename, lineNumber);
        
        if (result) {
            if (result.error) {
                errors.push(result);
            } else {
                questions.push(result);
            }
        }
    });
    
    return {
        questions,
        errors,
        totalLines: lines.length,
        validQuestions: questions.length,
        errorCount: errors.length
    };
}

