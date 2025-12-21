/**
 * NCAL Study App - Main Application Logic
 * Orchestrates the entire application including data loading, session management,
 * timer functionality, and user interactions
 */

import { parseQuestionBank } from './parser.js';
import { isCorrect } from './normalize.js';
import {
    showScreen, updateTimerDisplay, setTimerPauseState, updateStats,
    displayQuestion, showQuestionResult,
    updateSubjectSelector, showParserErrors, hideParserErrors,
    updateTimerValue, updateReadingSpeedValue, updateReadingSpeedPracticeValue, setStartButtonState, showSummary, announceStatus, announceError,
    updatePoolPreview, updateFilterTags, updateQuestionCounter, updateAccuracyDisplay,
    clearDomCache, clearFilterCache
} from './ui.js';

// Constants for better maintainability
const APP_CONSTANTS = {
    DEFAULT_TIME_ALLOCATED: 10,
    DEFAULT_READING_SPEED: 300,
    MIN_TIMER_VALUE: 3,
    MAX_TIMER_VALUE: 60,
    MIN_READING_SPEED: 50,
    MAX_READING_SPEED: 500,
    READING_SPEED_STEP: 25
};

// Application state
let appState = {
    questions: [],
    filteredQuestions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    sessionStartTime: null,
    timeAllocated: APP_CONSTANTS.DEFAULT_TIME_ALLOCATED,
    readingSpeed: APP_CONSTANTS.DEFAULT_READING_SPEED,
    timer: null,
    isPaused: false,
    isSessionActive: false,
    textRevealTimer: null,
    enterPressCount: 0,
    lastEnterTime: 0
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

/**
 * Calculates correct/incorrect stats from user answers in a single pass
 * @param {Array} userAnswers - Array of user answer objects
 * @returns {Object} Object with correct and incorrect counts
 */
function calculateStats(userAnswers) {
    return userAnswers.reduce((acc, answer) => {
        if (answer?.correctness === 'Correct') {
            acc.correct++;
        } else if (answer?.correctness) {
            acc.incorrect++;
        }
        return acc;
    }, { correct: 0, incorrect: 0 });
}

// DOM elements
let elements = {};

/**
 * Password Protection Module
 * Provides a non-dismissable modal with focus trap, background lock, and accessibility features
 */

const PASSWORD_PROTECTION = {
    // Password is obfuscated to prevent easy discovery in source code
    // Uses character code manipulation and string reconstruction
    _getPassword() {
        // Split password into parts and reconstruct
        const part1 = String.fromCharCode(112, 97, 110);
        const part2 = String.fromCharCode(99, 97);
        const part3 = String.fromCharCode(107, 101, 115);
        return part1 + part2 + part3;
    },
    STORAGE_KEY: 'unlocked',
    
    /**
     * Check if user is unlocked
     */
    isUnlocked() {
        return sessionStorage.getItem(this.STORAGE_KEY) === 'true';
    },
    
    /**
     * Set unlocked state
     */
    setUnlocked(value) {
        if (value) {
            sessionStorage.setItem(this.STORAGE_KEY, 'true');
        } else {
            sessionStorage.removeItem(this.STORAGE_KEY);
        }
    },
    
    /**
     * Get all focusable elements within the password modal
     */
    getFocusableElements(container) {
        const focusableSelectors = [
            'input:not([disabled])',
            'button:not([disabled])',
            'a[href]',
            'textarea:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(focusableSelectors));
    },
    
    /**
     * Trap focus within the password modal
     */
    trapFocus(event, container) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    },
    
    /**
     * Prevent background scrolling
     */
    lockBodyScroll() {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    },
    
    /**
     * Restore background scrolling
     */
    unlockBodyScroll() {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    },
    
    /**
     * Show error message
     */
    showError(errorElement, inputElement) {
        errorElement.classList.remove('hidden');
        errorElement.textContent = 'Incorrect password. Please try again.';
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.classList.add('error');
    },
    
    /**
     * Hide error message
     */
    hideError(errorElement, inputElement) {
        errorElement.classList.add('hidden');
        inputElement.setAttribute('aria-invalid', 'false');
        inputElement.classList.remove('error');
    },
    
    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(inputElement, toggleButton) {
        const isPassword = inputElement.type === 'password';
        inputElement.type = isPassword ? 'text' : 'password';
        
        const icon = toggleButton.querySelector('.toggle-password-icon');
        toggleButton.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        
        if (icon) {
            icon.textContent = isPassword ? '🙈' : '👁️';
        }
    },
    
    /**
     * Initialize password protection
     */
    init() {
        const passwordScreen = document.getElementById('password-screen');
        const passwordForm = document.getElementById('password-form');
        const passwordInput = document.getElementById('password-input');
        const passwordSubmit = document.getElementById('password-submit');
        const passwordError = document.getElementById('password-error');
        const togglePasswordBtn = document.getElementById('toggle-password');
        
        if (!passwordScreen || !passwordForm || !passwordInput) {
            console.error('Password protection elements not found');
            return true; // Allow app to continue if elements missing
        }
        
        // Check if already unlocked
        if (this.isUnlocked()) {
            passwordScreen.classList.add('hidden');
            passwordScreen.setAttribute('aria-hidden', 'true');
            return true;
        }
        
        // Lock body scroll
        this.lockBodyScroll();
        
        // Show password screen
        passwordScreen.classList.remove('hidden');
        passwordScreen.setAttribute('aria-hidden', 'false');
        document.body.classList.add('password-protected');
        
        // Focus trap - prevent Tab from escaping modal
        const handleKeyDown = (e) => {
            // Prevent ESC key from closing modal
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Trap focus within modal
            this.trapFocus(e, passwordScreen);
        };
        
        // Prevent clicks on backdrop from closing modal
        const backdrop = passwordScreen.querySelector('.password-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
        
        // Prevent clicks outside modal from closing it
        passwordScreen.addEventListener('click', (e) => {
            if (e.target === passwordScreen) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        // Toggle password visibility
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', () => {
                this.togglePasswordVisibility(passwordInput, togglePasswordBtn);
                passwordInput.focus();
            });
        }
        
        // Handle form submission
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const enteredPassword = passwordInput.value.trim();
            
            if (enteredPassword === this._getPassword()) {
                // Success - unlock
                this.setUnlocked(true);
                this.hideError(passwordError, passwordInput);
                
                // Hide password screen
                passwordScreen.classList.add('hidden');
                passwordScreen.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('password-protected');
                
                // Unlock body scroll
                this.unlockBodyScroll();
                
                // Remove event listeners
                passwordScreen.removeEventListener('keydown', handleKeyDown);
                
                // Clear password field
                passwordInput.value = '';
                passwordInput.type = 'password'; // Reset to password type
                
                // Initialize app after successful authentication
                init();
            } else {
                // Wrong password - show error
                this.showError(passwordError, passwordInput);
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
        
        // Add focus trap listener
        passwordScreen.addEventListener('keydown', handleKeyDown);
        
        // Focus the input on load
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
        
        return false;
    }
};

/**
 * Check if user is authenticated (backward compatibility)
 */
function checkAuthentication() {
    return PASSWORD_PROTECTION.isUnlocked();
}

/**
 * Set authentication state (backward compatibility)
 */
function setAuthenticated(value) {
    PASSWORD_PROTECTION.setUnlocked(value);
}

/**
 * Initialize password protection (wrapper for backward compatibility)
 */
function initPasswordProtection() {
    return PASSWORD_PROTECTION.init();
}

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
        
        // Summary screen
        backToPractice: document.getElementById('back-to-practice'),
        newSession: document.getElementById('new-session'),
        
        // Error handling
        copyErrors: document.getElementById('copy-errors'),
        dismissErrors: document.getElementById('dismiss-errors')
    };
    
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Timer slider
    if (elements.timerSlider) {
        elements.timerSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateTimerValue(value);
            appState.timeAllocated = value;
            updateFilterTags();
        });
    }
    
    // Reading speed slider
    if (elements.readingSpeedSlider) {
        elements.readingSpeedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            updateReadingSpeedValue(value);
            appState.readingSpeed = value;
        });
    }
    
    // Subject selection
    if (elements.selectAll) {
        elements.selectAll.addEventListener('click', selectAllSubjects);
    }
    
    if (elements.clearAll) {
        elements.clearAll.addEventListener('click', clearAllSubjects);
    }
    
    // Start practice
    if (elements.startPractice) {
        elements.startPractice.addEventListener('click', startPracticeSession);
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
                const currentTime = Date.now();
                
                // Reset counter if more than 1 second has passed since last Enter
                if (currentTime - appState.lastEnterTime > 1000) {
                    appState.enterPressCount = 0;
                }
                
                appState.enterPressCount++;
                appState.lastEnterTime = currentTime;
                
                if (appState.enterPressCount === 1) {
                    // First Enter - submit answer
                    submitAnswer();
                } else if (appState.enterPressCount === 2) {
                    // Second Enter - move to next question
                    e.preventDefault();
                    const nextQuestionBtn = document.getElementById('next-question');
                    if (nextQuestionBtn && !nextQuestionBtn.disabled) {
                        nextQuestion();
                    }
                    appState.enterPressCount = 0; // Reset counter
                }
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
        
        // Clear caches before updating questions
        clearFilterCache();
        clearDomCache();
        
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
    let questionCount = filterQuestions();
    
    // If no questions match, try to expand filters automatically
    if (questionCount === 0) {
        
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
    
    // Display first question (safety check)
    if (appState.filteredQuestions.length > 0) {
        resetEnterCounter();
        displayQuestion(appState.filteredQuestions[0]);
        
        // Start timer
        startTimer();
        
        announceStatus(`Practice session started with ${questionCount} randomized questions`);
    } else {
        // This should not happen due to earlier checks, but handle gracefully
        announceError('No questions available. Please check your filters.');
        showScreen('setup-screen');
    }
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
                appState.timer = null;
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
    // Update stats with optimized calculation
    const stats = calculateStats(appState.userAnswers);
    updateStats(
        stats.correct,
        stats.incorrect,
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
    // Update stats with optimized calculation
    const stats = calculateStats(appState.userAnswers);
    updateStats(
        stats.correct,
        stats.incorrect,
        appState.currentQuestionIndex + 1,
        appState.filteredQuestions.length
    );
    
    // Update accuracy display
    updateAccuracyDisplay();
    
    // Announce result
    announceStatus(isAnswerCorrect ? 'Correct answer!' : 'Incorrect answer');
}

/**
 * Reset Enter key press counter
 */
function resetEnterCounter() {
    appState.enterPressCount = 0;
    appState.lastEnterTime = 0;
}

/**
 * Move to the next question
 */
function nextQuestion() {
    appState.currentQuestionIndex++;
    
    if (appState.currentQuestionIndex >= appState.filteredQuestions.length) {
        // Session complete
        endSession();
        const stats = calculateStats(appState.userAnswers);
        showSummary({
            questions: appState.filteredQuestions,
            userAnswers: appState.userAnswers,
            timeAllocated: appState.timeAllocated,
            correct: stats.correct,
            incorrect: stats.incorrect,
            total: appState.filteredQuestions.length
        });
        return;
    }
    
    // Update question counter
    updateQuestionCounter();
    
    // Display next question
    resetEnterCounter();
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
    
    // Clear all timers safely
    if (appState.timer) {
        clearInterval(appState.timer);
        appState.timer = null;
    }
    
    if (appState.textRevealTimer) {
        clearInterval(appState.textRevealTimer);
        appState.textRevealTimer = null;
    }
    
    // Clear caches when session ends
    clearFilterCache();
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

// Initialize password protection when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const isAuthenticated = initPasswordProtection();
    if (isAuthenticated) {
        init();
    }
});

