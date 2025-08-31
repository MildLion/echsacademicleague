/**
 * CSV export functionality for session results
 * Exports question results with specified headers
 */

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 * @param {string} field - Field value to escape
 * @returns {string} Escaped field value
 */
function escapeCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    
    const stringField = String(field);
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
    }
    
    return stringField;
}

/**
 * Converts array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header strings
 * @returns {string} CSV content as string
 */
function arrayToCsv(data, headers) {
    // Add header row
    const csvRows = [headers.map(escapeCsvField).join(',')];
    
    // Add data rows
    data.forEach(row => {
        const csvRow = headers.map(header => escapeCsvField(row[header]));
        csvRows.push(csvRow.join(','));
    });
    
    return csvRows.join('\n');
}

/**
 * Exports session results to CSV file
 * @param {Array} sessionResults - Array of question result objects
 * @param {string} filename - Output filename (without extension)
 */
export function exportSessionCsv(sessionResults, filename = 'ncal-session-results') {
    // Define headers exactly as specified in requirements
    const headers = [
        'questionId',
        'category',
        'subjectSpecific',
        'level',
        'question',
        'userAnswer',
        'correctness',
        'timeAllocatedSec',
        'timeElapsedSec',
        'author',
        'timestamp'
    ];
    
    // Convert session results to CSV format
    const csvContent = arrayToCsv(sessionResults, headers);
    
    // Create Blob with CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to DOM, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Formats timestamp for CSV export
 * @returns {string} Current timestamp in ISO format
 */
export function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Prepares session results for CSV export
 * @param {Array} questions - Array of question objects
 * @param {Array} userAnswers - Array of user answer objects
 * @param {number} timeAllocated - Time allocated per question in seconds
 * @returns {Array} Array of result objects ready for CSV export
 */
export function prepareSessionResultsForCsv(questions, userAnswers, timeAllocated) {
    const timestamp = getCurrentTimestamp();
    
    return questions.map((question, index) => {
        const userAnswer = userAnswers[index] || {};
        
        return {
            questionId: question.id,
            category: question.category,
            subjectSpecific: question.subjectSpecific,
            level: question.level,
            question: question.question,
            userAnswer: userAnswer.answer || '',
            correctness: userAnswer.correctness || 'Incorrect',
            timeAllocatedSec: timeAllocated,
            timeElapsedSec: userAnswer.timeElapsed || 0,
            author: question.author,
            timestamp: timestamp
        };
    });
}

