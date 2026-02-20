// Idle Activity Monitoring Utility

const IDLE_THRESHOLD = 10000; // 10 seconds of no activity

/**
 * Start monitoring user idle activity during an exam.
 *
 * Tracks: mousemove, mousedown, keydown, click, scroll, touchstart
 *
 * When idle for IDLE_THRESHOLD ms:
 *   - calls onIdle(count) with cumulative idle event count
 *
 * When activity resumes after idle:
 *   - calls onActive()
 *
 * Returns a cleanup function.
 */
export const monitorIdle = (onIdle, onActive) => {
    let idleTimer = null;
    let idleCount = 0;
    let isCurrentlyIdle = false;

    const ACTIVITY_EVENTS = [
        'mousemove',
        'mousedown',
        'keydown',
        'click',
        'scroll',
        'touchstart'
    ];

    const resetTimer = () => {
        // If user was idle, signal they're back
        if (isCurrentlyIdle) {
            isCurrentlyIdle = false;
            if (onActive) onActive();
        }

        // Clear existing timer and start fresh
        if (idleTimer) clearTimeout(idleTimer);

        idleTimer = setTimeout(() => {
            isCurrentlyIdle = true;
            idleCount++;
            if (onIdle) onIdle(idleCount);
        }, IDLE_THRESHOLD);
    };

    // Attach listeners
    ACTIVITY_EVENTS.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start the initial timer
    resetTimer();

    // Cleanup function
    return () => {
        if (idleTimer) clearTimeout(idleTimer);
        ACTIVITY_EVENTS.forEach((event) => {
            window.removeEventListener(event, resetTimer);
        });
    };
};
