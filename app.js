/**
 * NCAL Study App - Main Application Logic
 * Orchestrates the entire application including data loading, session management,
 * timer functionality, and user interactions
 */

import { parseQuestionBank } from './parser.js';
import { isCorrect } from './normalize.js';
import { exportSessionCsv, prepareSessionResultsForCsv } from './csv.js';
import {
    showScreen, updateTimerDisplay, setTimerPauseState, updateStats,
    displayQuestion, showQuestionResult,
    updateSubjectSelector, showParserErrors, hideParserErrors,
    updateTimerValue, updateReadingSpeedValue, updateReadingSpeedPracticeValue, setStartButtonState, showSummary, announceStatus, announceError,
    updatePoolPreview, updateFilterTags, updateQuestionCounter, updateAccuracyDisplay
} from './ui.js';

// Application state
let appState = {
    questions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    sessionStartTime: null,
    timeAllocated: 10,
    readingSpeed: 200, // Words per minute
    timer: null,
    isPaused: false,
    isSessionActive: false,
    textRevealTimer: null
};

// Expose app state globally for UI functions
window.appState = appState;

/**
 * Fisher-Yates shuffle algorithm to randomize array order
 * @param {Array} array - Array to shuffle (modified in place)
 * @returns {Array} The shuffled array
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// DOM elements
let elements = {};

/**
 * Initialize the application
 */
async function init() {
    try {
        // Get DOM elements
        initializeElements();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load question bank
        await loadQuestionBank();
        
        // Initialize UI
        initializeUI();
        
        announceStatus('NCAL Study App loaded successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        announceError('Failed to load application');
    }
}

/**
 * Initialize DOM element references
 */
function initializeElements() {
    elements = {
        // Setup screen
        startPractice: document.getElementById('start-practice'),
        timerSlider: document.getElementById('timer'),
        timerValue: document.getElementById('timer-value'),
        readingSpeedSlider: document.getElementById('reading-speed'),
        readingSpeedValue: document.getElementById('reading-speed-value'),
        selectAll: document.getElementById('select-all'),
        clearAll: document.getElementById('clear-all'),
        resetFilters: document.getElementById('reset-filters'),
        
        // Practice screen
        backToSetup: document.getElementById('back-to-setup'),
        answerInput: document.getElementById('answer-input'),
        submitAnswer: document.getElementById('submit-answer'),
        nextQuestion: document.getElementById('next-question'),
        pauseTimer: document.getElementById('pause-timer'),
        resetFiltersEmpty: document.getElementById('reset-filters-empty'),
        
        // Summary screen
        backToPractice: document.getElementById('back-to-practice'),
        exportCsv: document.getElementById('export-csv'),
        newSession: document.getElementById('new-session'),
        
        // Error handling
        copyErrors: document.getElementById('copy-errors'),
        dismissErrors: document.getElementById('dismiss-errors')
    };
    
    // Debug: Log which elements were found
    console.log('Elements initialized:', {
        startPractice: !!elements.startPractice,
        timerSlider: !!elements.timerSlider,
        selectAll: !!elements.selectAll,
        clearAll: !!elements.clearAll
    });
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Timer slider
    if (elements.timerSlider) {
        console.log('Adding timer slider listener');
        elements.timerSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateTimerValue(value);
            appState.timeAllocated = value;
            updateFilterTags();
        });
    } else {
        console.error('Timer slider element not found!');
    }
    
    // Reading speed slider
    if (elements.readingSpeedSlider) {
        console.log('Adding reading speed slider listener');
        elements.readingSpeedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateReadingSpeedValue(value);
            appState.readingSpeed = value;
        });
    } else {
        console.error('Reading speed slider element not found!');
    }
    
    // Subject selection
    if (elements.selectAll) {
        console.log('Adding select all listener');
        elements.selectAll.addEventListener('click', selectAllSubjects);
    } else {
        console.error('Select all element not found!');
    }
    
    if (elements.clearAll) {
        console.log('Adding clear all listener');
        elements.clearAll.addEventListener('click', clearAllSubjects);
    } else {
        console.error('Clear all element not found!');
    }
    
    // Start practice
    if (elements.startPractice) {
        console.log('Adding start practice listener');
        elements.startPractice.addEventListener('click', startPracticeSession);
    } else {
        console.error('Start practice element not found!');
    }
    
    // Practice screen navigation
    if (elements.backToSetup) {
        elements.backToSetup.addEventListener('click', () => {
            if (confirm('Are you sure you want to end this session?')) {
                endSession();
                showScreen('setup-screen');
            }
        });
    }
    
    // Answer submission
    if (elements.answerInput) {
        elements.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        });
    }
    
    if (elements.submitAnswer) {
        elements.submitAnswer.addEventListener('click', submitAnswer);
    }
    
    // Next question
    if (elements.nextQuestion) {
        elements.nextQuestion.addEventListener('click', nextQuestion);
    }
    
    // Timer controls
    if (elements.pauseTimer) {
        elements.pauseTimer.addEventListener('click', toggleTimerPause);
    }
    
    // Reset filters
    if (elements.resetFilters) {
        elements.resetFilters.addEventListener('click', resetFilters);
    }
    
    // Reset filters from practice screen
    const resetFiltersPractice = document.getElementById('reset-filters-practice');
    if (resetFiltersPractice) {
        resetFiltersPractice.addEventListener('click', resetFilters);
    }
    
    // Reading speed slider in practice screen
    const readingSpeedPractice = document.getElementById('reading-speed-practice');
    if (readingSpeedPractice) {
        readingSpeedPractice.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateReadingSpeedPracticeValue(value);
            appState.readingSpeed = value;
            
            // Also update the main reading speed slider if it exists
            if (elements.readingSpeedSlider) {
                elements.readingSpeedSlider.value = value;
                updateReadingSpeedValue(value);
            }
            
            // Show feedback that speed has changed
            const speedHint = document.querySelector('.speed-hint');
            if (speedHint) {
                speedHint.textContent = 'Speed updated! Affects next question';
                speedHint.style.color = '#28a745';
                speedHint.style.fontWeight = '600';
                
                // Reset the hint after 2 seconds
                setTimeout(() => {
                    speedHint.textContent = 'Affects next question';
                    speedHint.style.color = '#6c757d';
                    speedHint.style.fontWeight = 'normal';
                }, 2000);
            }
        });
    }
    
    // Summary screen
    if (elements.backToPractice) {
        elements.backToPractice.addEventListener('click', () => {
            showScreen('practice-screen');
        });
    }
    
    if (elements.exportCsv) {
        elements.exportCsv.addEventListener('click', exportResults);
    }
    
    if (elements.newSession) {
        elements.newSession.addEventListener('click', startNewSession);
    }
    
    // Error handling
    if (elements.copyErrors) {
        elements.copyErrors.addEventListener('click', copyErrorDetails);
    }
    
    if (elements.dismissErrors) {
        elements.dismissErrors.addEventListener('click', hideParserErrors);
    }
    
    // Subject and level change listeners
    document.addEventListener('change', handleFilterChange);
    
    // Section header click listeners
    document.addEventListener('click', handleSectionHeaderClick);
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyboard);
}

/**
 * Handle filter changes to update pool preview
 */
function handleFilterChange(event) {
    if (event.target.type === 'checkbox' || event.target.type === 'radio') {
        updatePoolPreview();
        updateFilterTags();
        updateSectionHeaderStates();
    }
}

/**
 * Handle section header clicks to select/deselect all subcategories
 */
function handleSectionHeaderClick(event) {
    if (event.target.classList.contains('section-header')) {
        const section = event.target.getAttribute('data-section');
        const sectionGroup = event.target.closest('.subject-group');
        const checkboxes = sectionGroup.querySelectorAll('input[type="checkbox"]');
        
        // Check if all checkboxes in this section are selected
        const allSelected = Array.from(checkboxes).every(cb => cb.checked);
        
        // Toggle all checkboxes in this section
        checkboxes.forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = !allSelected;
            }
        });
        
        // Update UI
        updatePoolPreview();
        updateFilterTags();
        updateSectionHeaderStates();
        
        // Announce the action
        const action = allSelected ? 'deselected' : 'selected';
        announceStatus(`${section} section ${action}`);
    }
}

/**
 * Update the visual state of section headers based on checkbox states
 */
function updateSectionHeaderStates() {
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    sectionHeaders.forEach(header => {
        const sectionGroup = header.closest('.subject-group');
        const checkboxes = sectionGroup.querySelectorAll('input[type="checkbox"]');
        const enabledCheckboxes = Array.from(checkboxes).filter(cb => !cb.disabled);
        
        if (enabledCheckboxes.length === 0) {
            // No enabled checkboxes, remove all state classes
            header.classList.remove('all-selected', 'none-selected', 'mixed-selected');
            return;
        }
        
        const selectedCount = enabledCheckboxes.filter(cb => cb.checked).length;
        const totalCount = enabledCheckboxes.length;
        
        // Remove all state classes
        header.classList.remove('all-selected', 'none-selected', 'mixed-selected');
        
        // Add appropriate state class
        if (selectedCount === 0) {
            header.classList.add('none-selected');
        } else if (selectedCount === totalCount) {
            header.classList.add('all-selected');
        } else {
            header.classList.add('mixed-selected');
        }
    });
}

/**
 * Load the question bank from file
 */
async function loadQuestionBank() {
    try {
        setStartButtonState(true);
        
        const response = await fetch('data/bank_sample.txt');
        if (!response.ok) {
            throw new Error(`Failed to load question bank: ${response.status}`);
        }
        
        const content = await response.text();
        
        // Parse the question bank
        const parseResult = parseQuestionBank(content, 'bank_sample.txt');
        
        appState.questions = parseResult.questions;
        
        // Show parser errors if any
        if (parseResult.errors.length > 0) {
            showParserErrors(parseResult.errors);
            announceError(`Found ${parseResult.errors.length} parsing errors`);
        } else {
            hideParserErrors();
        }
        
        // Update subject selector based on available questions
        updateSubjectSelector(appState.questions);
        
        // Update pool preview
        updatePoolPreview();
        
        announceStatus(`Loaded ${parseResult.validQuestions} questions successfully`);
        
    } catch (error) {
        console.error('Failed to load question bank:', error);
        announceError('Failed to load question bank');
        throw error;
    } finally {
        setStartButtonState(false);
    }
}

/**
 * Initialize the UI with default values
 */
function initializeUI() {
    // Set default timer value
    updateTimerValue(appState.timeAllocated);
    
    // Set default reading speed value
    updateReadingSpeedValue(appState.readingSpeed);
    
    // Select all subjects by default
    selectAllSubjects();
    
    // Update filter tags
    updateFilterTags();
    
    // Update section header states
    updateSectionHeaderStates();
}

/**
 * Select all subject checkboxes
 */
function selectAllSubjects() {
    document.querySelectorAll('.subject-group input[type="checkbox"]').forEach(checkbox => {
        if (!checkbox.disabled) {
            checkbox.checked = true;
        }
    });
    updatePoolPreview();
    updateFilterTags();
    updateSectionHeaderStates();
}

/**
 * Clear all subject checkboxes
 */
function clearAllSubjects() {
    document.querySelectorAll('.subject-group input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    updatePoolPreview();
    updateFilterTags();
    updateSectionHeaderStates();
}

/**
 * Select only subjects that have available questions
 */
function selectAllAvailableSubjects() {
    document.querySelectorAll('.subject-group input[type="checkbox"]').forEach(checkbox => {
        if (!checkbox.disabled) {
            checkbox.checked = true;
        }
    });
    updatePoolPreview();
    updateFilterTags();
    updateSectionHeaderStates();
}

/**
 * Get selected subjects and level filters
 */
function getActiveFilters() {
    const selectedSubjects = Array.from(
        document.querySelectorAll('.subject-group input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    const selectedLevel = document.querySelector('input[name="level"]:checked')?.value || '';
    
    return { selectedSubjects, selectedLevel };
}

/**
 * Filter questions based on selected subjects and level
 */
function filterQuestions() {
    const { selectedSubjects, selectedLevel } = getActiveFilters();
    
    appState.filteredQuestions = appState.questions.filter(question => {
        // Subject filter
        const subjectMatch = selectedSubjects.length === 0 || 
                           selectedSubjects.includes(question.category);
        
        // Level filter
        const levelMatch = !selectedLevel || question.level === selectedLevel;
        
        return subjectMatch && levelMatch;
    });
    
    // Randomize the order of filtered questions
    shuffleArray(appState.filteredQuestions);
    
    return appState.filteredQuestions.length;
}

/**
 * Start a new practice session
 */
function startPracticeSession() {
    console.log('startPracticeSession called');
    console.log('Current app state:', appState);
    
    let questionCount = filterQuestions();
    console.log('Question count after filtering:', questionCount);
    
    // If no questions match, try to expand filters automatically
    if (questionCount === 0) {
        console.log('No questions match filters, auto-expanding filters');
        
        // First try: select all subjects if none selected
        const selectedSubjects = Array.from(
            document.querySelectorAll('.subject-group input[type="checkbox"]:checked')
        );
        
        if (selectedSubjects.length === 0) {
            selectAllSubjects();
            questionCount = filterQuestions();
        }
        
        // Second try: remove level filter if still no matches
        if (questionCount === 0) {
            document.querySelector('input[name="level"][value=""]').checked = true;
            questionCount = filterQuestions();
        }
        
        // Third try: select all available subjects
        if (questionCount === 0) {
            selectAllAvailableSubjects();
            questionCount = filterQuestions();
        }
        
        if (questionCount === 0) {
            announceError('Unable to find any questions. Please check your question bank.');
            return;
        }
        
        announceStatus(`Expanded filters to include ${questionCount} randomized questions`);
        updatePoolPreview();
    }
    
    console.log('Starting session with questions:', appState.filteredQuestions);
    
    // Initialize session state
    appState.currentQuestionIndex = 0;
    appState.userAnswers = [];
    appState.sessionStartTime = Date.now();
    appState.isSessionActive = true;
    appState.isPaused = false;
    

    
    // Switch to practice screen
    showScreen('practice-screen');
    
    // Scroll to top to ensure question is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update UI elements
    updateQuestionCounter();
    updateFilterTags();
    
    // Initialize practice screen reading speed control
    const readingSpeedPractice = document.getElementById('reading-speed-practice');
    if (readingSpeedPractice) {
        readingSpeedPractice.value = appState.readingSpeed;
        updateReadingSpeedPracticeValue(appState.readingSpeed);
    }
    
    // Display first question
    displayQuestion(appState.filteredQuestions[0]);
    
    // Start timer
    startTimer();
    
    announceStatus(`Practice session started with ${questionCount} randomized questions`);
}

/**
 * Start the timer for the current question
 */
function startTimer() {
    if (appState.timer) {
        clearInterval(appState.timer);
    }
    
    let timeLeft = appState.timeAllocated;
    
    // Update display immediately
    updateTimerDisplay(timeLeft, appState.timeAllocated);
    
    appState.timer = setInterval(() => {
        if (!appState.isPaused) {
            timeLeft--;
            
            if (timeLeft <= 0) {
                // Time's up - show 0 before handling timeout
                updateTimerDisplay(0, appState.timeAllocated);
                clearInterval(appState.timer);
                handleTimeout();
            } else {
                updateTimerDisplay(timeLeft, appState.timeAllocated);
            }
        }
    }, 1000);
}

/**
 * Handle timer timeout
 */
function handleTimeout() {
    const currentQuestion = appState.filteredQuestions[appState.currentQuestionIndex];
    
    // Add timeout visual effect to timer
    const timerDisplay = document.querySelector('.timer-display');
    if (timerDisplay) {
        timerDisplay.classList.add('timeout');
        // Remove the timeout class after animation completes
        setTimeout(() => {
            timerDisplay.classList.remove('timeout');
        }, 500);
    }
    
    // Record timeout
    appState.userAnswers[appState.currentQuestionIndex] = {
        answer: '',
        correctness: 'Timeout',
        timeElapsed: appState.timeAllocated,
        timestamp: Date.now()
    };
    
    // Show result
    showQuestionResult(false, '', currentQuestion.answers[0], 'Timeout');
    
    // Update stats
    updateStats(
        appState.userAnswers.filter(a => a?.correctness === 'Correct').length,
        appState.userAnswers.filter(a => a?.correctness !== 'Correct').length,
        appState.currentQuestionIndex + 1,
        appState.filteredQuestions.length
    );
    
    // Update accuracy display
    updateAccuracyDisplay();
    
    announceStatus('Time is up');
}

/**
 * Toggle timer pause/resume
 */
function toggleTimerPause() {
    appState.isPaused = !appState.isPaused;
    setTimerPauseState(appState.isPaused);
    
    if (appState.isPaused) {
        announceStatus('Timer paused');
    } else {
        announceStatus('Timer resumed');
    }
}

/**
 * Submit the current answer
 */
function submitAnswer() {
    const answerInput = elements.answerInput;
    const userAnswer = answerInput.value.trim();
    
    if (!userAnswer) {
        announceError('Please enter an answer');
        return;
    }
    
    // Stop timer
    if (appState.timer) {
        clearInterval(appState.timer);
        appState.timer = null;
    }
    
    const currentQuestion = appState.filteredQuestions[appState.currentQuestionIndex];
    const isAnswerCorrect = isCorrect(userAnswer, currentQuestion.answers);
    
    // Calculate time elapsed
    const timeLeft = parseInt(document.getElementById('timer-countdown').textContent) || 0;
    const timeElapsed = appState.timeAllocated - timeLeft;
    
    // Record answer
    appState.userAnswers[appState.currentQuestionIndex] = {
        answer: userAnswer,
        correctness: isAnswerCorrect ? 'Correct' : 'Incorrect',
        timeElapsed: timeElapsed,
        timestamp: Date.now()
    };
    
    // Show result
    showQuestionResult(isAnswerCorrect, userAnswer, currentQuestion.answers[0], 
                      isAnswerCorrect ? 'Correct' : 'Incorrect');
    
    // Update stats
    updateStats(
        appState.userAnswers.filter(a => a?.correctness === 'Correct').length,
        appState.userAnswers.filter(a => a?.correctness !== 'Correct').length,
        appState.currentQuestionIndex + 1,
        appState.filteredQuestions.length
    );
    
    // Update accuracy display
    updateAccuracyDisplay();
    
    // Announce result
    announceStatus(isAnswerCorrect ? 'Correct answer!' : 'Incorrect answer');
}

/**
 * Move to the next question
 */
function nextQuestion() {
    appState.currentQuestionIndex++;
    
    if (appState.currentQuestionIndex >= appState.filteredQuestions.length) {
        // Session complete
        endSession();
        showSummary({
            questions: appState.filteredQuestions,
            userAnswers: appState.userAnswers,
            timeAllocated: appState.timeAllocated,
            correct: appState.userAnswers.filter(a => a?.correctness === 'Correct').length,
            incorrect: appState.userAnswers.filter(a => a?.correctness !== 'Correct').length,
            total: appState.filteredQuestions.length
        });
        return;
    }
    
    // Update question counter
    updateQuestionCounter();
    
    // Display next question
    displayQuestion(appState.filteredQuestions[appState.currentQuestionIndex]);
    
    // Start timer for new question
    startTimer();
    
    announceStatus(`Question ${appState.currentQuestionIndex + 1} of ${appState.filteredQuestions.length}`);
}

/**
 * End the current session
 */
function endSession() {
    appState.isSessionActive = false;
    
    if (appState.timer) {
        clearInterval(appState.timer);
        appState.timer = null;
    }
    
    if (appState.textRevealTimer) {
        clearInterval(appState.textRevealTimer);
        appState.textRevealTimer = null;
    }
}

/**
 * Reset filters and return to setup
 */
function resetFilters() {
    selectAllSubjects();
    document.querySelector('input[name="level"][value=""]').checked = true;
    showScreen('setup-screen');
}

/**
 * Export session results to CSV
 */
function exportResults() {
    try {
        const sessionResults = prepareSessionResultsForCsv(
            appState.filteredQuestions,
            appState.userAnswers,
            appState.timeAllocated
        );
        
        exportSessionCsv(sessionResults, `ncal-session-${Date.now()}`);
        announceStatus('Results exported successfully');
        
    } catch (error) {
        console.error('Failed to export results:', error);
        announceError('Failed to export results');
    }
}

/**
 * Start a new session
 */
function startNewSession() {
    showScreen('setup-screen');
    resetFilters();
}

/**
 * Copy error details to clipboard
 */
async function copyErrorDetails() {
    try {
        const errorList = document.getElementById('error-list');
        const errorText = errorList.textContent;
        
        await navigator.clipboard.writeText(errorText);
        announceStatus('Error details copied to clipboard');
        
    } catch (error) {
        console.error('Failed to copy error details:', error);
        announceError('Failed to copy error details');
    }
}

/**
 * Handle global keyboard shortcuts
 */
function handleGlobalKeyboard(event) {
    // Don't trigger shortcuts when typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Space bar toggles pause
    if (event.key === ' ') {
        event.preventDefault();
        if (appState.isSessionActive && appState.timer) {
            toggleTimerPause();
        }
    }
    
    // N key skips to next question
    if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        if (appState.isSessionActive) {
            // Check if we're on the practice screen and there's a next question button
            const nextQuestionBtn = document.getElementById('next-question');
            if (nextQuestionBtn && !nextQuestionBtn.disabled) {
                nextQuestion();
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

