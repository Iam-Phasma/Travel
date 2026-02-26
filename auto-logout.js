/**
 * Auto-Logout Module
 * Automatically logs out users after a period of inactivity
 * Shows a warning modal with countdown before logging out
 */

export class AutoLogout {
    constructor(options = {}) {
        // Configuration
        this.warningTime = options.warningTime || 1 * 60 * 1000; // 4 minutes in milliseconds
        this.logoutTime = options.logoutTime || 2 * 60 * 1000; // 5 minutes in milliseconds
        this.countdownDuration = this.logoutTime - this.warningTime; // 1 minute countdown
        this.supabase = options.supabase; // Supabase client instance
        this.onLogout = options.onLogout || null; // Optional callback before logout
        
        // State
        this.activityTimer = null;
        this.countdownTimer = null;
        this.countdownInterval = null;
        this.modalVisible = false;
        this.lastActivity = Date.now();
        this.lastResetTime = 0; // Track last time timer was reset for throttling
        
        // Activity event types to monitor
        this.activityEvents = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];
        
        // Bind methods
        this.handleActivity = this.handleActivity.bind(this);
        this.showWarningModal = this.showWarningModal.bind(this);
        this.hideWarningModal = this.hideWarningModal.bind(this);
        this.performLogout = this.performLogout.bind(this);
        this.startCountdown = this.startCountdown.bind(this);
        
        // Initialize
        this.createModal();
        this.init();
    }
    
    /**
     * Create the warning modal HTML
     */
    createModal() {
        // Check if modal already exists
        if (document.getElementById('auto-logout-modal')) {
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'auto-logout-modal';
        modal.className = 'auto-logout-modal';
        modal.innerHTML = `
            <div class="auto-logout-overlay"></div>
            <div class="auto-logout-content">
                <div class="auto-logout-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <h3>Session Timeout Warning</h3>
                <p>You've been inactive for a while. For your security, you'll be automatically logged out in:</p>
                <div class="auto-logout-countdown">
                    <span id="auto-logout-seconds">60</span>
                    <span class="auto-logout-label">seconds</span>
                </div>
                <p class="auto-logout-hint">Click the button below to stay signed in.</p>
                <button id="auto-logout-stay-btn" class="auto-logout-btn-primary">
                    Stay Signed In
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listener to "Stay Signed In" button
        document.getElementById('auto-logout-stay-btn').addEventListener('click', () => {
            this.hideWarningModal();
            this.resetTimer();
        });
    }
    
    /**
     * Initialize the auto-logout system
     */
    init() {
        // Add activity listeners
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.handleActivity, true);
        });
        
        // Start the timer
        this.resetTimer();
        
        console.log('Auto-logout initialized: Warning at', this.warningTime / 1000, 'seconds, Logout at', this.logoutTime / 1000, 'seconds');
    }
    
    /**
     * Handle user activity
     */
    handleActivity() {
        // SECURITY: Ignore all activity when modal is visible
        // This prevents users from exploiting mouse movement or keyboard presses
        // Only the explicit "Stay Signed In" button click can reset the timer
        if (this.modalVisible) {
            return;
        }
        
        this.lastActivity = Date.now();
        
        // Throttle timer resets to once per second to reduce overhead
        // This prevents excessive timer resets from rapid mouse movements
        const now = Date.now();
        const throttleDelay = 1000; // 1 second
        
        if (now - this.lastResetTime >= throttleDelay) {
            this.lastResetTime = now;
            this.resetTimer();
            console.log('[Auto-Logout] Timer reset due to user activity');
        }
    }
    
    /**
     * Reset the inactivity timer
     */
    resetTimer() {
        // Clear existing timers
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
        }
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // Set new timer for warning
        this.activityTimer = setTimeout(this.showWarningModal, this.warningTime);
    }
    
    /**
     * Show the warning modal
     */
    showWarningModal() {
        if (this.modalVisible) return;
        
        console.log('[Auto-Logout] ⚠️ Showing warning modal - user has been inactive');
        this.modalVisible = true;
        const modal = document.getElementById('auto-logout-modal');
        modal.classList.add('active');
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Start countdown
        this.startCountdown();
        
        // Set timer to logout after countdown
        this.countdownTimer = setTimeout(this.performLogout, this.countdownDuration);
    }
    
    /**
     * Hide the warning modal
     */
    hideWarningModal() {
        if (!this.modalVisible) return;
        
        this.modalVisible = false;
        const modal = document.getElementById('auto-logout-modal');
        modal.classList.remove('active');
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        // Clear countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
    }
    
    /**
     * Start the countdown display
     */
    startCountdown() {
        const secondsElement = document.getElementById('auto-logout-seconds');
        let remainingSeconds = Math.floor(this.countdownDuration / 1000);
        
        // Update immediately
        secondsElement.textContent = remainingSeconds;
        
        // Update every second
        this.countdownInterval = setInterval(() => {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
                clearInterval(this.countdownInterval);
                secondsElement.textContent = '0';
                return;
            }
            
            secondsElement.textContent = remainingSeconds;
            
            // Add urgency class when less than 10 seconds
            if (remainingSeconds <= 10) {
                secondsElement.classList.add('urgent');
            }
        }, 1000);
    }
    
    /**
     * Perform the logout
     */
    async performLogout() {
        // Clear all timers
        if (this.activityTimer) clearTimeout(this.activityTimer);
        if (this.countdownTimer) clearTimeout(this.countdownTimer);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        // Remove event listeners
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.handleActivity, true);
        });
        
        try {
            // Call custom logout callback if provided
            if (this.onLogout && typeof this.onLogout === 'function') {
                await this.onLogout();
            }
            
            // Sign out from Supabase
            if (this.supabase) {
                await this.supabase.auth.signOut();
            }
            
            // Clear local storage (session tokens, etc.)
            localStorage.removeItem('admin_session_token');
            
            // Redirect to login page
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error during auto-logout:', error);
            // Force redirect even if logout fails
            window.location.href = '../index.html';
        }
    }
    
    /**
     * Destroy the auto-logout instance
     */
    destroy() {
        // Remove event listeners
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.handleActivity, true);
        });
        
        // Clear timers
        if (this.activityTimer) clearTimeout(this.activityTimer);
        if (this.countdownTimer) clearTimeout(this.countdownTimer);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        // Remove modal
        const modal = document.getElementById('auto-logout-modal');
        if (modal) {
            modal.remove();
        }
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }
}

/**
 * Simple initialization function for easy setup
 */
export function initAutoLogout(supabase, options = {}) {
    return new AutoLogout({
        supabase,
        ...options
    });
}
