import * as faceapi from '@vladmandic/face-api';

// --- Configuration ---
const CHECK_INTERVAL_MS = 500;              // Target interval between checks (500ms)
const CONSECUTIVE_MISSES_TO_TRIGGER = 30;   // 30 consecutive misses = ~15 seconds
const WARMUP_MS = 5000;                     // 5-second warm-up (camera + model settle)
const MODEL_URL = '/models';                // TinyFaceDetector weights in public/models/

let modelsLoaded = false;
let modelLoadPromise = null;

/**
 * Load the TinyFaceDetector model (only once, cached globally).
 * Uses a shared promise so concurrent calls don't trigger duplicate loads.
 */
const loadModels = async () => {
    if (modelsLoaded) return true;
    if (modelLoadPromise) return modelLoadPromise;

    modelLoadPromise = (async () => {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            modelsLoaded = true;
            console.log('[Face Detection] TinyFaceDetector model loaded successfully');
            return true;
        } catch (error) {
            console.error('[Face Detection] Failed to load model:', error);
            modelLoadPromise = null;
            return false;
        }
    })();

    return modelLoadPromise;
};

/**
 * Monitor camera feed for face presence. Auto-submits exam if face is absent
 * for a sustained duration (CONSECUTIVE_MISSES_TO_TRIGGER × ~CHECK_INTERVAL_MS).
 *
 * Uses a sequential setTimeout loop (not setInterval) so that each detection
 * fully completes before the next one starts. This prevents overlapping async
 * calls when detection takes longer than CHECK_INTERVAL_MS.
 *
 * @param {Function} videoRefGetter  - () => videoRef.current (video element getter)
 * @param {Function} onAutoSubmit    - Called once when sustained absence triggers auto-submit
 * @returns {Function} cleanup function to stop monitoring
 */
export const monitorFaceDetection = (videoRefGetter, onAutoSubmit) => {
    const state = {
        consecutiveMisses: 0,
        triggered: false,
        destroyed: false,
        startTime: null,
        ready: false,
        running: false,     // prevents overlapping detection calls
    };

    // Offscreen canvas for drawing video frames before detection
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let timeoutId = null;

    /**
     * Run a single face detection check, then schedule the next one.
     */
    const runDetectionCycle = async () => {
        if (state.destroyed || state.triggered) return;

        // Prevent re-entry if a previous cycle is still running
        if (state.running) {
            timeoutId = setTimeout(runDetectionCycle, CHECK_INTERVAL_MS);
            return;
        }

        state.running = true;

        try {
            const videoEl = typeof videoRefGetter === 'function' ? videoRefGetter() : videoRefGetter;

            // Wait for video element to be available and playing
            if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
                state.running = false;
                timeoutId = setTimeout(runDetectionCycle, CHECK_INTERVAL_MS);
                return;
            }

            // Mark as ready and start warm-up timer
            if (!state.ready) {
                state.ready = true;
                state.startTime = Date.now();
                console.log(
                    `[Face Detection] Video ready: ${videoEl.videoWidth}x${videoEl.videoHeight}, ` +
                    `readyState=${videoEl.readyState}. Warming up for ${WARMUP_MS / 1000}s...`
                );
            }

            // Skip detection during warm-up period
            if (Date.now() - state.startTime < WARMUP_MS) {
                state.running = false;
                timeoutId = setTimeout(runDetectionCycle, CHECK_INTERVAL_MS);
                return;
            }

            // Draw current video frame to offscreen canvas.
            // This avoids issues where face-api.js can't read directly from
            // a video element (cross-origin, security, or timing problems).
            const vw = videoEl.videoWidth;
            const vh = videoEl.videoHeight;
            canvas.width = vw;
            canvas.height = vh;
            ctx.drawImage(videoEl, 0, 0, vw, vh);

            // Run face detection on the canvas (not the video element)
            const detections = await faceapi.detectAllFaces(
                canvas,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            );

            if (state.destroyed || state.triggered) {
                state.running = false;
                return;
            }

            if (detections.length === 0) {
                // No face detected this frame
                state.consecutiveMisses++;

                if (state.consecutiveMisses % 5 === 0) {
                    console.log(
                        `[Face Detection] No face — ${state.consecutiveMisses}/${CONSECUTIVE_MISSES_TO_TRIGGER} consecutive misses`
                    );
                }

                if (state.consecutiveMisses >= CONSECUTIVE_MISSES_TO_TRIGGER && !state.triggered) {
                    state.triggered = true;
                    console.log(
                        `[Face Detection] AUTO-SUBMIT TRIGGERED after ${state.consecutiveMisses} consecutive missed detections ` +
                        `(~${(state.consecutiveMisses * CHECK_INTERVAL_MS / 1000).toFixed(1)}s)`
                    );
                    state.running = false;
                    if (onAutoSubmit) onAutoSubmit();
                    return; // Don't schedule next cycle
                }
            } else {
                // Face detected — immediately reset counter
                if (state.consecutiveMisses > 0) {
                    console.log(
                        `[Face Detection] Face found (${detections.length} face(s), ` +
                        `score=${detections[0].score.toFixed(3)}). ` +
                        `Reset miss counter from ${state.consecutiveMisses} to 0.`
                    );
                }
                state.consecutiveMisses = 0;
            }
        } catch (error) {
            // Detection error — skip this frame, don't count as miss
            console.warn('[Face Detection] Detection error (skipping frame):', error.message);
        }

        state.running = false;

        // Schedule the next cycle
        if (!state.destroyed && !state.triggered) {
            timeoutId = setTimeout(runDetectionCycle, CHECK_INTERVAL_MS);
        }
    };

    // Start the monitoring process
    const startMonitoring = async () => {
        const loaded = await loadModels();
        if (!loaded || state.destroyed) {
            console.warn('[Face Detection] Could not start — model not loaded or already destroyed');
            return;
        }

        console.log('[Face Detection] Monitor started. Waiting for video element...');

        // Start the first detection cycle
        timeoutId = setTimeout(runDetectionCycle, CHECK_INTERVAL_MS);
    };

    startMonitoring();

    // Cleanup function
    return () => {
        state.destroyed = true;
        if (timeoutId) clearTimeout(timeoutId);
        console.log('[Face Detection] Monitor cleaned up');
    };
};
