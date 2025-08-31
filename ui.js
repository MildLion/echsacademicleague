/**
 * UI management and screen transitions
 * Handles all visual updates and user interactions
 */

/**
 * Shows a specific screen and hides others
 * @param {string} screenId - ID of screen to show
 */
export function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

/**
 * Updates the timer display with countdown and visual progress
 * @param {number} timeLeft - Seconds remaining
 * @param {number} totalTime - Total time allocated
 */
export function updateTimerDisplay(timeLeft, totalTime) {
    const countdownElement = document.getElementById('timer-countdown');
    const progressElement = document.getElementById('timer-progress');
    const timerSecondsElement = document.querySelector('.timer-seconds');
    
    if (countdownElement && progressElement) {
        // Update countdown text
        countdownElement.textContent = timeLeft;
        
        // Update progress ring
        const circumference = 2 * Math.PI * 45; // r=45
        const progress = (timeLeft / totalTime) * circumference;
        progressElement.style.strokeDashoffset = circumference - progress;
        
        // Change color based on time remaining
        if (timeLeft <= 3) {
            progressElement.style.stroke = '#dc3545'; // Red
        } else if (timeLeft <= totalTime * 0.3) {
            progressElement.style.stroke = '#ffc107'; // Yellow
        } else {
            progressElement.style.stroke = '#007bff'; // Blue
        }
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
    const correctElement = document.getElementById('correct-count');
    const incorrectElement = document.getElementById('incorrect-count');
    const progressElement = document.getElementById('progress-display');
    const progressFillElement = document.getElementById('progress-fill');
    
    if (correctElement) correctElement.textContent = correct;
    if (incorrectElement) incorrectElement.textContent = incorrect;
    if (progressElement) progressElement.textContent = `${current}/${total}`;
    if (progressFillElement) {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        progressFillElement.style.width = `${percentage}%`;
    }
}

/**
 * Updates the accuracy display
 */
export function updateAccuracyDisplay() {
    const accuracyElement = document.getElementById('accuracy-display');
    if (!accuracyElement) return;
    
    // Get stats from app state if available, otherwise fall back to DOM
    let correct, incorrect;
    if (window.appState?.userAnswers) {
        correct = window.appState.userAnswers.filter(a => a?.correctness === 'Correct').length;
        incorrect = window.appState.userAnswers.filter(a => a?.correctness !== 'Correct').length;
    } else {
        correct = parseInt(document.getElementById('correct-count')?.textContent || '0');
        incorrect = parseInt(document.getElementById('incorrect-count')?.textContent || '0');
    }
    
    const total = correct + incorrect;
    
    if (total > 0) {
        const percentage = Math.round((correct / total) * 100);
        accuracyElement.textContent = `Accuracy (so far): ${percentage}%`;
    } else {
        accuracyElement.textContent = 'Accuracy (so far): 0%';
    }
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

/**
 * Updates the pool preview with estimated question count
 */
export function updatePoolPreview() {
    const previewElement = document.getElementById('pool-preview');
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
    
    console.log('updatePoolPreview called:', {
        selectedSubjects,
        selectedLevel,
        questionsCount: questions.length,
        appState: window.appState
    });
    
    // Debug: Show first few question categories
    if (questions.length > 0) {
        console.log('First 5 question categories:', questions.slice(0, 5).map(q => q.category));
    }
    
    // Filter questions based on current selection
    const filteredQuestions = questions.filter(question => {
        // Subject filter
        const subjectMatch = selectedSubjects.length === 0 || 
                           selectedSubjects.includes(question.category);
        
        // Level filter
        const levelMatch = !selectedLevel || question.level === selectedLevel;
        
        return subjectMatch && levelMatch;
    });
    
    previewElement.textContent = `Pool preview: ~${filteredQuestions.length} questions`;
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
    const categoryElement = document.getElementById('question-category');
    const levelElement = document.getElementById('question-level');
    const authorElement = document.getElementById('question-author');
    const questionElement = document.getElementById('question-text');
    
    if (categoryElement) {
        const categoryParts = question.category.split('>');
        categoryElement.textContent = categoryParts.length > 1 ? categoryParts[1] : question.category;
    }
    if (levelElement) levelElement.textContent = question.level;
    if (authorElement) authorElement.textContent = `Author: ${question.author}`;
    if (questionElement) questionElement.textContent = question.question;
    
    // Clear previous answer input
    const answerInput = document.getElementById('answer-input');
    if (answerInput) {
        answerInput.value = '';
        answerInput.focus();
    }
    
    // Hide result display
    const resultDisplay = document.getElementById('result-display');
    if (resultDisplay) {
        resultDisplay.classList.add('hidden');
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
 * Shows empty state when no questions match filters
 */
export function showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    const questionCard = document.querySelector('.question-card');
    
    if (emptyState && questionCard) {
        questionCard.style.display = 'none';
        emptyState.classList.remove('hidden');
    }
}

/**
 * Hides empty state and shows question card
 */
export function hideEmptyState() {
    const emptyState = document.getElementById('empty-state');
    const questionCard = document.querySelector('.question-card');
    
    if (emptyState && questionCard) {
        emptyState.classList.add('hidden');
        questionCard.style.display = 'block';
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

