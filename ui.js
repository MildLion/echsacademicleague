/**
 * UI management and screen transitions
 * Handles all visual updates and user interactions
 */

// DOM element cache to avoid repeated queries
const domCache = new Map();

/**
 * Cached DOM element getter with fallback
 * @param {string} selector - CSS selector or element ID
 * @param {boolean} isId - Whether selector is an ID (default: false)
 * @returns {HTMLElement|null} Cached element or null
 */
function getCachedElement(selector, isId = false) {
    if (!domCache.has(selector)) {
        const element = isId ? document.getElementById(selector) : document.querySelector(selector);
        domCache.set(selector, element);
    }
    return domCache.get(selector);
}

/**
 * Clear DOM cache (useful for dynamic content)
 */
export function clearDomCache() {
    domCache.clear();
}

/**
 * Shows a specific screen and hides others
 * @param {string} screenId - ID of screen to show
 */
export function showScreen(screenId) {
    // Hide all screens - use cached query
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = getCachedElement(screenId, true);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// Constants for timer display
const TIMER_CONSTANTS = {
    RADIUS: 45,
    COLORS: {
        RED: '#dc3545',
        YELLOW: '#ffc107', 
        BLUE: '#007bff'
    },
    WARNING_THRESHOLD: 3,
    LOW_TIME_THRESHOLD: 0.3
};

/**
 * Updates the timer display with countdown and visual progress
 * @param {number} timeLeft - Seconds remaining
 * @param {number} totalTime - Total time allocated
 */
export function updateTimerDisplay(timeLeft, totalTime) {
    const countdownElement = getCachedElement('timer-countdown', true);
    const progressElement = getCachedElement('timer-progress', true);
    const timerSecondsElement = getCachedElement('.timer-seconds');
    
    if (countdownElement && progressElement) {
        // Update countdown text
        countdownElement.textContent = timeLeft;
        
        // Update progress ring
        const circumference = 2 * Math.PI * TIMER_CONSTANTS.RADIUS;
        const progress = (timeLeft / totalTime) * circumference;
        progressElement.style.strokeDashoffset = circumference - progress;
        
        // Change color based on time remaining
        let strokeColor = TIMER_CONSTANTS.COLORS.BLUE;
        if (timeLeft <= TIMER_CONSTANTS.WARNING_THRESHOLD) {
            strokeColor = TIMER_CONSTANTS.COLORS.RED;
        } else if (timeLeft <= totalTime * TIMER_CONSTANTS.LOW_TIME_THRESHOLD) {
            strokeColor = TIMER_CONSTANTS.COLORS.YELLOW;
        }
        progressElement.style.stroke = strokeColor;
    }
    
    if (timerSecondsElement) {
        timerSecondsElement.textContent = `${timeLeft}s`;
    }
}

/**
 * Sets timer pause state
 * @param {boolean} isPaused - Whether timer is paused
 */
export function setTimerPauseState(isPaused) {
    const timerDisplay = document.querySelector('.timer-display');
    const pauseButton = document.getElementById('pause-timer');
    
    if (timerDisplay && pauseButton) {
        if (isPaused) {
            timerDisplay.classList.add('paused');
            pauseButton.innerHTML = '<span class="pause-icon">▶️</span>Resume';
        } else {
            timerDisplay.classList.remove('paused');
            pauseButton.innerHTML = '<span class="pause-icon">⏸️</span>Pause';
        }
    }
}

/**
 * Updates practice session statistics
 * @param {number} correct - Number of correct answers
 * @param {number} incorrect - Number of incorrect answers
 * @param {number} current - Current question number
 * @param {number} total - Total questions in session
 */
export function updateStats(correct, incorrect, current, total) {
    const elements = {
        correct: getCachedElement('correct-count', true),
        incorrect: getCachedElement('incorrect-count', true),
        progress: getCachedElement('progress-display', true),
        progressFill: getCachedElement('progress-fill', true)
    };
    
    // Update elements with null safety
    elements.correct && (elements.correct.textContent = correct);
    elements.incorrect && (elements.incorrect.textContent = incorrect);
    elements.progress && (elements.progress.textContent = `${current}/${total}`);
    
    if (elements.progressFill) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        elements.progressFill.style.width = `${percentage}%`;
    }
}

/**
 * Updates the accuracy display
 */
export function updateAccuracyDisplay() {
    const accuracyElement = getCachedElement('accuracy-display', true);
    if (!accuracyElement) return;
    
    // Get stats from app state if available, otherwise fall back to DOM
    let correct, incorrect;
    if (window.appState?.userAnswers) {
        // Use single pass to count both correct and incorrect
        const counts = window.appState.userAnswers.reduce((acc, answer) => {
            if (answer?.correctness === 'Correct') {
                acc.correct++;
            } else if (answer?.correctness) {
                acc.incorrect++;
            }
            return acc;
        }, { correct: 0, incorrect: 0 });
        correct = counts.correct;
        incorrect = counts.incorrect;
    } else {
        const correctElement = getCachedElement('correct-count', true);
        const incorrectElement = getCachedElement('incorrect-count', true);
        correct = parseInt(correctElement?.textContent || '0');
        incorrect = parseInt(incorrectElement?.textContent || '0');
    }
    
    const total = correct + incorrect;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    accuracyElement.textContent = `Accuracy (so far): ${percentage}%`;
}

/**
 * Updates the question counter
 */
export function updateQuestionCounter() {
    const counterElement = document.getElementById('question-counter');
    if (!counterElement) return;
    
    // Get current question index from the app state
    const currentIndex = window.appState?.currentQuestionIndex || 0;
    const totalQuestions = window.appState?.filteredQuestions?.length || 0;
    
    counterElement.textContent = `Q ${currentIndex + 1} / ${totalQuestions}`;
}

// Memoization cache for question filtering
const filterCache = new Map();

/**
 * Creates a cache key for filter combinations
 * @param {Array} selectedSubjects - Selected subject categories
 * @param {string} selectedLevel - Selected difficulty level
 * @returns {string} Cache key
 */
function createFilterCacheKey(selectedSubjects, selectedLevel) {
    return `${selectedSubjects.sort().join(',')}|${selectedLevel}`;
}

/**
 * Filters questions with memoization
 * @param {Array} questions - All available questions
 * @param {Array} selectedSubjects - Selected subject categories
 * @param {string} selectedLevel - Selected difficulty level
 * @returns {Array} Filtered questions
 */
function filterQuestionsMemoized(questions, selectedSubjects, selectedLevel) {
    const cacheKey = createFilterCacheKey(selectedSubjects, selectedLevel);
    
    if (filterCache.has(cacheKey)) {
        return filterCache.get(cacheKey);
    }
    
    const filteredQuestions = questions.filter(question => {
        // Subject filter
        const subjectMatch = selectedSubjects.length === 0 || 
                           selectedSubjects.includes(question.category);
        
        // Level filter
        const levelMatch = !selectedLevel || question.level === selectedLevel;
        
        return subjectMatch && levelMatch;
    });
    
    // Cache the result
    filterCache.set(cacheKey, filteredQuestions);
    return filteredQuestions;
}

/**
 * Updates the pool preview with estimated question count
 */
export function updatePoolPreview() {
    const previewElement = getCachedElement('pool-preview', true);
    if (!previewElement) {
        console.warn('Pool preview element not found');
        return;
    }
    
    // Get selected subjects and level
    const selectedSubjects = Array.from(
        document.querySelectorAll('.subject-group input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    const selectedLevel = document.querySelector('input[name="level"]:checked')?.value || '';
    
    // Get questions from the global app state or use a fallback
    const questions = window.appState?.questions || [];
    
    // Use memoized filtering
    const filteredQuestions = filterQuestionsMemoized(questions, selectedSubjects, selectedLevel);
    
    previewElement.textContent = `${filteredQuestions.length} questions available (randomized each session)`;
}

/**
 * Clear filter cache (call when question bank changes)
 */
export function clearFilterCache() {
    filterCache.clear();
}

/**
 * Updates the filter tags display
 */
export function updateFilterTags() {
    const filterTagsElements = document.querySelectorAll('#filter-tags, #summary-filter-tags');
    if (!filterTagsElements.length) return;
    
    // Get active filters
    const selectedSubjects = Array.from(
        document.querySelectorAll('.subject-group input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    const selectedLevel = document.querySelector('input[name="level"]:checked')?.value || '';
    const timeAllocated = window.appState?.timeAllocated || 10;
    
    // Create filter tags
    const tags = [];
    
    if (selectedSubjects.length === 0) {
        tags.push('All Subjects');
    } else if (selectedSubjects.length <= 3) {
        selectedSubjects.forEach(subject => {
            const specific = subject.split('>')[1] || subject;
            tags.push(specific);
        });
    } else {
        tags.push(`${selectedSubjects.length} Subjects`);
    }
    
    if (!selectedLevel) {
        tags.push('All Levels');
    } else {
        tags.push(selectedLevel);
    }
    
    tags.push(`${timeAllocated}s per question`);
    
    // Update all filter tag containers
    filterTagsElements.forEach(container => {
        container.innerHTML = '';
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'filter-tag';
            tagElement.textContent = tag;
            container.appendChild(tagElement);
        });
    });
}

/**
 * Displays a question with all its information
 * @param {Object} question - Question object
 */
export function displayQuestion(question) {
    const elements = {
        category: getCachedElement('question-category', true),
        level: getCachedElement('question-level', true),
        author: getCachedElement('question-author', true),
        question: getCachedElement('question-text', true),
        answerInput: getCachedElement('answer-input', true),
        resultDisplay: getCachedElement('result-display', true)
    };
    
    // CRITICAL: Clean up any existing text reveal state first
    if (window.appState?.textRevealTimer) {
        clearInterval(window.appState.textRevealTimer);
        window.appState.textRevealTimer = null;
    }
    
    // Remove any existing click handlers and revealing class safely
    if (elements.question) {
        elements.question.classList.remove('revealing');
        // Remove existing event listeners by cloning
        const newQuestionElement = elements.question.cloneNode(true);
        elements.question.parentNode?.replaceChild(newQuestionElement, elements.question);
        // Update cache with new element
        domCache.set('question-text', newQuestionElement);
    }
    
    // Update question metadata
    if (elements.category) {
        const categoryParts = question.category.split('>');
        elements.category.textContent = categoryParts.length > 1 ? categoryParts[1] : question.category;
    }
    if (elements.level) elements.level.textContent = question.level;
    if (elements.author) elements.author.textContent = `Author: ${question.author}`;
    
    // Start progressive text reveal with the fresh element
    const freshQuestionElement = getCachedElement('question-text', true);
    if (freshQuestionElement) {
        startTextReveal(freshQuestionElement, question.question);
        
        // Add click handler to skip text reveal
        const skipReveal = () => {
            if (window.appState?.textRevealTimer) {
                clearInterval(window.appState.textRevealTimer);
                window.appState.textRevealTimer = null;
                freshQuestionElement.textContent = question.question;
                freshQuestionElement.classList.remove('revealing');
                
                // Focus the answer input and scroll to it on mobile
                if (elements.answerInput) {
                    elements.answerInput.focus();
                    scrollToAnswerInput();
                }
            }
        };
        
        freshQuestionElement.addEventListener('click', skipReveal, { once: true });
    }
    
    // Clear previous answer input
    if (elements.answerInput) {
        elements.answerInput.value = '';
    }
    
    // Hide result display
    if (elements.resultDisplay) {
        elements.resultDisplay.classList.add('hidden');
    }
}

/**
 * Progressively reveals text word by word
 * @param {HTMLElement} element - Element to display text in
 * @param {string} fullText - Complete text to reveal
 */
function startTextReveal(element, fullText) {
    // Clear any existing text reveal timer safely
    if (window.appState?.textRevealTimer) {
        clearInterval(window.appState.textRevealTimer);
        window.appState.textRevealTimer = null;
    }
    
    const words = fullText.split(' ');
    const readingSpeed = window.appState?.readingSpeed || 200; // Words per minute
    const intervalMs = (60 / readingSpeed) * 1000; // Convert to milliseconds per word
    
    let currentWordIndex = 0;
    element.textContent = ''; // Clear the element
    element.style.opacity = '1';
    element.classList.add('revealing'); // Add blinking cursor
    
    // Function to add the next word
    const revealNextWord = () => {
        if (currentWordIndex < words.length) {
            if (currentWordIndex > 0) {
                element.textContent += ' ';
            }
            element.textContent += words[currentWordIndex];
            currentWordIndex++;
        } else {
            // Text reveal complete - clear timer and focus input
            if (window.appState?.textRevealTimer) {
                clearInterval(window.appState.textRevealTimer);
                window.appState.textRevealTimer = null;
            }
            element.classList.remove('revealing'); // Remove blinking cursor
            
            // Focus the answer input once text is fully revealed and scroll to it
            const answerInput = getCachedElement('answer-input', true);
            if (answerInput) {
                answerInput.focus();
                scrollToAnswerInput();
            }
        }
    };
    
    // Start the reveal immediately with first word
    revealNextWord();
    
    // Continue revealing words at the specified interval
    if (words.length > 1) {
        // Ensure appState exists before setting timer
        if (!window.appState) {
            console.warn('appState not available for text reveal timer');
            return;
        }
        window.appState.textRevealTimer = setInterval(revealNextWord, intervalMs);
    } else {
        // Single word - remove revealing class and focus input immediately
        element.classList.remove('revealing');
        const answerInput = getCachedElement('answer-input', true);
        if (answerInput) {
            answerInput.focus();
            scrollToAnswerInput();
        }
    }
}

/**
 * Shows the result of an answered question
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {string} userAnswer - User's submitted answer
 * @param {string} canonicalAnswer - Correct answer to display
 * @param {string} resultType - Type of result (Correct/Incorrect/Timeout)
 */
export function showQuestionResult(isCorrect, userAnswer, canonicalAnswer, resultType) {
    const resultDisplay = document.getElementById('result-display');
    const resultStatus = document.getElementById('result-status');
    const canonicalElement = document.getElementById('canonical-answer');
    
    if (resultDisplay && resultStatus && canonicalElement) {
        // Set result status
        resultStatus.textContent = resultType;
        resultStatus.className = `result-status ${resultType.toLowerCase()}`;
        
        // Show canonical answer
        canonicalElement.textContent = canonicalAnswer;
        
        // Show result display
        resultDisplay.classList.remove('hidden');
    }
}



/**
 * Updates subject selection UI based on available questions
 * @param {Array} questions - Available questions
 */
export function updateSubjectSelector(questions) {
    const subjectGroups = document.querySelectorAll('.subject-group');
    
    subjectGroups.forEach(group => {
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const subjectValue = checkbox.value;
            const hasQuestions = questions.some(q => q.category === subjectValue);
            
            // Debug logging
            console.log('Checking subject:', subjectValue, 'hasQuestions:', hasQuestions);
            console.log('Available categories:', questions.map(q => q.category));
            
            checkbox.disabled = !hasQuestions;
            if (!hasQuestions) {
                checkbox.checked = false;
            }
        });
    });
}

/**
 * Shows parser errors in the error panel
 * @param {Array} errors - Array of parser error objects
 */
export function showParserErrors(errors) {
    const errorPanel = document.getElementById('error-panel');
    const errorList = document.getElementById('error-list');
    
    if (errorPanel && errorList && errors.length > 0) {
        // Clear previous errors
        errorList.innerHTML = '';
        
        // Add error count
        const errorCount = document.createElement('p');
        errorCount.textContent = `Found ${errors.length} parsing errors:`;
        errorList.appendChild(errorCount);
        
        // Add each error
        errors.forEach(error => {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.innerHTML = `
                <strong>${error.filename}:${error.line}</strong> — ${error.reason}
                <br><small>Raw line: ${error.rawLine}</small>
            `;
            errorList.appendChild(errorItem);
        });
        
        // Show error panel
        errorPanel.classList.remove('hidden');
    }
}

/**
 * Hides the parser error panel
 */
export function hideParserErrors() {
    const errorPanel = document.getElementById('error-panel');
    if (errorPanel) {
        errorPanel.classList.add('hidden');
    }
}

/**
 * Updates the timer slider value display
 * @param {number} value - Timer value in seconds
 */
export function updateTimerValue(value) {
    const timerValue = document.getElementById('timer-value');
    if (timerValue) {
        timerValue.textContent = `${value}s`;
    }
}

/**
 * Updates the reading speed slider value display
 * @param {number} value - Reading speed in words per minute
 */
export function updateReadingSpeedValue(value) {
    const readingSpeedValue = document.getElementById('reading-speed-value');
    if (readingSpeedValue) {
        readingSpeedValue.textContent = `${value} WPM`;
    }
}

/**
 * Updates the practice screen reading speed slider value display
 * @param {number} value - Reading speed in words per minute
 */
export function updateReadingSpeedPracticeValue(value) {
    const readingSpeedPracticeValue = document.getElementById('reading-speed-practice-value');
    if (readingSpeedPracticeValue) {
        readingSpeedPracticeValue.textContent = `${value} WPM`;
    }
}

/**
 * Disables/enables the start practice button
 * @param {boolean} disabled - Whether to disable the button
 */
export function setStartButtonState(disabled) {
    const startButton = document.getElementById('start-practice');
    if (startButton) {
        startButton.disabled = disabled;
        if (disabled) {
            startButton.innerHTML = '<span class="btn-icon">⏳</span>Loading...';
        } else {
            startButton.innerHTML = '<span class="btn-icon">▶️</span>Start';
        }
    }
}

/**
 * Shows the summary screen with session results
 * @param {Object} sessionData - Session results data
 */
export function showSummary(sessionData) {
    const { questions, userAnswers, timeAllocated, correct, incorrect, total } = sessionData;
    
    // Update overall results
    const overallScore = document.getElementById('overall-score');
    const overallPercentage = document.getElementById('overall-percentage');
    const overallProgressFill = document.getElementById('overall-progress-fill');
    
    if (overallScore) overallScore.textContent = `${correct}/${total}`;
    if (overallPercentage) {
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        overallPercentage.textContent = `(${percentage}%)`;
    }
    if (overallProgressFill) {
        const percentage = total > 0 ? (correct / total) * 100 : 0;
        overallProgressFill.style.width = `${percentage}%`;
    }
    
    // Update subject breakdown
    updateSubjectBreakdown(questions, userAnswers);
    
    // Update missed questions table
    updateMissedQuestionsTable(questions, userAnswers);
    
    // Update summary filter tags
    updateFilterTags();
    
    // Show summary screen
    showScreen('summary-screen');
}

/**
 * Updates the subject breakdown section
 * @param {Array} questions - Questions array
 * @param {Array} userAnswers - User answers array
 */
function updateSubjectBreakdown(questions, userAnswers) {
    const subjectAccuracy = document.getElementById('subject-accuracy');
    if (!subjectAccuracy) return;
    
    // Group questions by subject
    const subjectStats = {};
    questions.forEach((question, index) => {
        const subject = question.subjectSpecific;
        const userAnswer = userAnswers[index];
        
        if (!subjectStats[subject]) {
            subjectStats[subject] = { correct: 0, total: 0 };
        }
        
        subjectStats[subject].total++;
        if (userAnswer && userAnswer.correctness === 'Correct') {
            subjectStats[subject].correct++;
        }
    });
    
    // Create subject stat elements
    subjectAccuracy.innerHTML = '';
    Object.entries(subjectStats).forEach(([subject, stats]) => {
        const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        
        const subjectStat = document.createElement('div');
        subjectStat.className = 'subject-stat';
        subjectStat.innerHTML = `
            <h4>${subject}</h4>
            <p>${stats.correct}/${stats.total} (${percentage}%)</p>
        `;
        subjectAccuracy.appendChild(subjectStat);
    });
}

/**
 * Updates the missed questions table
 * @param {Array} questions - Questions array
 * @param {Array} userAnswers - User answers array
 */
function updateMissedQuestionsTable(questions, userAnswers) {
    const missedTable = document.getElementById('missed-table');
    if (!missedTable) return;
    
    // Filter for missed questions
    const missedQuestions = questions.filter((question, index) => {
        const userAnswer = userAnswers[index];
        return !userAnswer || userAnswer.correctness !== 'Correct';
    });
    
    if (missedQuestions.length === 0) {
        missedTable.innerHTML = '<p>No questions were missed!</p>';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Subject</th>
                <th>Question</th>
                <th>Canonical</th>
                <th>Your Answer</th>
                <th>Result</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    missedQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[questions.indexOf(question)] || {};
        const row = document.createElement('tr');
        
        let resultDisplay = userAnswer.correctness || 'Timeout';
        if (resultDisplay === 'Timeout') {
            resultDisplay = '<span style="color: #ffc107;">⏰ Timeout</span>';
        } else if (resultDisplay === 'Incorrect') {
            resultDisplay = '<span style="color: #dc3545;">❌ Incorrect</span>';
        }
        
        row.innerHTML = `
            <td>${question.subjectSpecific}</td>
            <td>${question.question}</td>
            <td>${question.answers[0]}</td>
            <td>${userAnswer.answer || '—'}</td>
            <td>${resultDisplay}</td>
        `;
        tbody.appendChild(row);
    });
    
    missedTable.innerHTML = '';
    missedTable.appendChild(table);
}

/**
 * Announces status changes for screen readers
 * @param {string} message - Message to announce
 * @param {string} type - Type of announcement (polite/assertive)
 */
export function announceStatus(message, type = 'polite') {
    const announcement = document.getElementById('status-announcement');
    if (announcement) {
        announcement.setAttribute('aria-live', type);
        announcement.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            announcement.textContent = '';
        }, 1000);
    }
}

/**
 * Announces errors for screen readers
 * @param {string} message - Error message to announce
 */
export function announceError(message) {
    announceStatus(message, 'assertive');
}

/**
 * Scrolls to the answer input on mobile devices for better UX
 */
function scrollToAnswerInput() {
    const answerInput = document.getElementById('answer-input');
    if (!answerInput) return;
    
    // Check if we're on a mobile device (screen width < 768px)
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    
    // Small delay to ensure the element is rendered
    setTimeout(() => {
        answerInput.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
        });
    }, 100);
}

