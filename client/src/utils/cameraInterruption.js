// Camera Interruption Detection Utility
// Detects: dark/covered lens, frozen frames, brightness drops, rapid toggling
//
// Uses MULTI-FRAME CONFIRMATION: no single abnormal frame triggers a violation.
// An interruption is only confirmed after several consecutive abnormal frames.
// Recovery also requires consecutive normal frames to prevent flickering.
//
// This utility uses a videoRefGetter (a function that returns the current video element)
// instead of a direct HTMLVideoElement reference. This solves React's ref timing issue
// where the video element isn't mounted when the useEffect first fires.

// --- Detection thresholds ---
const DARKNESS_THRESHOLD = 30;           // Average brightness below this = "dark"
const DARKNESS_RATIO_THRESHOLD = 0.80;   // 80% of pixels must be dark
const BRIGHTNESS_DROP_FACTOR = 0.35;     // Brightness drops to 35% of baseline
const FREEZE_SIMILARITY_THRESHOLD = 0.97; // 97% pixel similarity = frozen
const TOGGLE_WINDOW_MS = 15000;          // 15-second window for toggle detection
const TOGGLE_COUNT_THRESHOLD = 3;        // 3+ toggles in window = suspicious
const CHECK_INTERVAL_MS = 500;           // Check every 500ms (fast polling for multi-frame)

// --- Multi-frame confirmation ---
const ABNORMAL_FRAMES_TO_TRIGGER = 4;    // 4 consecutive bad frames (2s at 500ms) to trigger
const NORMAL_FRAMES_TO_RECOVER = 3;      // 3 consecutive good frames (1.5s) to recover
const FREEZE_FRAMES_TO_TRIGGER = 6;      // 6 consecutive identical frames (3s at 500ms) = frozen
const BASELINE_FRAMES = 8;              // Collect 8 frames to establish a stable baseline

// Show camera interruption warning overlay
const showInterruptionWarning = (overlayState) => {
    if (overlayState.overlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'camera-interruption-overlay';
    overlay.innerHTML = `
    <div class="interruption-content">
      <div class="interruption-icon">\u{1F6AB}\u{1F4F7}</div>
      <h2>Camera Obstruction Detected</h2>
      <p>Please ensure your camera is clear and unobstructed.</p>
      <p class="interruption-sub">The exam is paused until the camera feed returns to normal.</p>
      <p class="violation-count">This has been recorded as a violation.</p>
    </div>
  `;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
    color: white;
    font-family: system-ui, sans-serif;
  `;

    const style = document.createElement('style');
    style.id = 'camera-interruption-style';
    style.textContent = `
    #camera-interruption-overlay .interruption-content {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #2e1a1a, #2e1b1b);
      border-radius: 20px;
      border: 2px solid #ef4444;
      max-width: 500px;
    }
    #camera-interruption-overlay .interruption-icon { font-size: 72px; margin-bottom: 20px; }
    #camera-interruption-overlay h2 { color: #ef4444; margin: 0 0 10px; font-size: 1.5rem; }
    #camera-interruption-overlay p { color: #a0a0a0; margin: 0 0 10px; }
    #camera-interruption-overlay .interruption-sub { color: #d4d4d4; font-size: 0.95rem; }
    #camera-interruption-overlay .violation-count { color: #ef4444; font-weight: bold; font-size: 16px; margin-top: 16px; }
  `;

    if (!document.getElementById('camera-interruption-style')) {
        document.head.appendChild(style);
    }
    document.body.appendChild(overlay);
    overlayState.overlay = overlay;
};

// Hide camera interruption warning overlay
const hideInterruptionWarning = (overlayState) => {
    if (overlayState.overlay) {
        overlayState.overlay.remove();
        overlayState.overlay = null;
    }
    // Also clean up any orphaned overlays
    const orphaned = document.getElementById('camera-interruption-overlay');
    if (orphaned) orphaned.remove();
};

/**
 * Analyze a video frame — returns brightness stats and a pixel signature for freeze detection.
 * The signature is a downsampled array of brightness values (not a single hash)
 * for robust similarity comparison that tolerates minor sensor noise.
 */
const analyzeFrame = (video, canvas, ctx) => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }

    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;

    try {
        ctx.drawImage(video, 0, 0, w, h);
    } catch (e) {
        return null;
    }

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    let brightnessSum = 0;
    let darkPixels = 0;
    let sampledCount = 0;

    // Sample every 4th pixel for brightness analysis
    for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        brightnessSum += brightness;
        if (brightness < DARKNESS_THRESHOLD) {
            darkPixels++;
        }
        sampledCount++;
    }

    if (sampledCount === 0) return null;

    const avgBrightness = brightnessSum / sampledCount;
    const darkRatio = darkPixels / sampledCount;

    // Build a pixel signature for freeze detection — sample ~300 evenly-spaced brightness values.
    // Comparing arrays with a similarity score is far more robust than a single hash:
    // it tolerates minor sensor noise while still catching real changes.
    const signatureStep = Math.max(1, Math.floor(data.length / (300 * 4))) * 4;
    const signature = [];
    for (let i = 0; i < data.length; i += signatureStep) {
        const r = data[i];
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        signature.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
    }

    return { avgBrightness, darkRatio, signature };
};

/**
 * Compare two frame signatures and return a similarity ratio (0.0 to 1.0).
 * Uses a per-pixel tolerance of +/-5 to absorb minor sensor noise that would
 * otherwise cause a single-hash approach to see every frame as "different".
 */
const compareSignatures = (sig1, sig2) => {
    if (!sig1 || !sig2 || sig1.length === 0 || sig2.length === 0) return 0;
    const len = Math.min(sig1.length, sig2.length);
    let matching = 0;
    for (let i = 0; i < len; i++) {
        if (Math.abs(sig1[i] - sig2[i]) <= 5) {
            matching++;
        }
    }
    return matching / len;
};

/**
 * Monitor for camera interruption (obstruction/tampering while camera is ON).
 *
 * MULTI-FRAME CONFIRMATION:
 *   - Frames are analyzed every 500ms.
 *   - Each check classifies the frame as "abnormal" or "normal".
 *   - An interruption is only triggered after ABNORMAL_FRAMES_TO_TRIGGER consecutive
 *     abnormal frames (default 4 = 2 seconds of sustained obstruction).
 *   - Recovery requires NORMAL_FRAMES_TO_RECOVER consecutive normal frames (default 3 = 1.5s).
 *   - Freeze detection requires FREEZE_FRAMES_TO_TRIGGER consecutive near-identical frames.
 *   - This eliminates false positives from momentary shadows, lighting changes, etc.
 *
 * @param {MediaStream} stream             - The active camera MediaStream
 * @param {Function}    videoRefGetter      - () => videoRef.current
 * @param {Function}    onInterruption      - Called when interruption confirmed: (count) => {}
 * @param {Function}    onResume            - Called when feed recovers: () => {}
 * @returns {Function} cleanup function
 */
export const monitorCameraInterruption = (stream, videoRefGetter, onInterruption, onResume) => {
    if (!stream) return () => {};

    const state = {
        interruptionCount: 0,
        baselineBrightness: null,
        baselineFrameCount: 0,
        isCurrentlyInterrupted: false,
        videoReady: false,
        destroyed: false,

        // Multi-frame confirmation counters
        consecutiveAbnormalFrames: 0,   // dark / brightness-drop counter
        consecutiveNormalFrames: 0,     // recovery counter
        consecutiveFrozenFrames: 0,     // freeze counter
        lastReason: '',                 // last abnormal reason for logging

        // Frame signature for freeze comparison
        lastSignature: null,
    };
    const overlayState = { overlay: null };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Track rapid on/off toggling
    const toggleTimestamps = [];
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return () => {};

    let lastTrackEnabled = videoTrack.enabled;

    console.log('[Camera Interruption] Monitor started (multi-frame confirmation). Waiting for video element...');

    const trackToggleCheck = setInterval(() => {
        if (state.destroyed) return;
        if (videoTrack.enabled !== lastTrackEnabled) {
            toggleTimestamps.push(Date.now());
            lastTrackEnabled = videoTrack.enabled;

            const cutoff = Date.now() - TOGGLE_WINDOW_MS;
            while (toggleTimestamps.length > 0 && toggleTimestamps[0] < cutoff) {
                toggleTimestamps.shift();
            }

            if (toggleTimestamps.length >= TOGGLE_COUNT_THRESHOLD && !state.isCurrentlyInterrupted) {
                state.isCurrentlyInterrupted = true;
                state.interruptionCount++;
                state.consecutiveNormalFrames = 0;
                console.log('[Camera Interruption] Rapid toggling detected');
                showInterruptionWarning(overlayState);
                if (onInterruption) onInterruption(state.interruptionCount);
            }
        }
    }, 500);

    const checkInterval = setInterval(() => {
        if (state.destroyed) return;

        const videoEl = typeof videoRefGetter === 'function' ? videoRefGetter() : videoRefGetter;
        if (!videoEl) return;
        if (videoTrack.readyState !== 'live' || !videoTrack.enabled) return;
        if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;

        if (!state.videoReady) {
            state.videoReady = true;
            console.log(`[Camera Interruption] Video ready: ${videoEl.videoWidth}x${videoEl.videoHeight}. Starting multi-frame analysis.`);
        }

        const result = analyzeFrame(videoEl, canvas, ctx);
        if (!result) return;

        const { avgBrightness, darkRatio, signature } = result;

        // --- Build baseline from first good frames ---
        if (state.baselineFrameCount < BASELINE_FRAMES) {
            if (avgBrightness > DARKNESS_THRESHOLD) {
                state.baselineBrightness = state.baselineBrightness
                    ? (state.baselineBrightness * state.baselineFrameCount + avgBrightness) / (state.baselineFrameCount + 1)
                    : avgBrightness;
                state.baselineFrameCount++;
                if (state.baselineFrameCount === BASELINE_FRAMES) {
                    console.log(`[Camera Interruption] Baseline established: brightness=${state.baselineBrightness.toFixed(1)}`);
                }
            }
            state.lastSignature = signature;
            return;
        }

        // --- Classify this frame ---
        let frameIsAbnormal = false;
        let reason = '';

        // Check 1: Dark / covered lens
        if (darkRatio >= DARKNESS_RATIO_THRESHOLD && avgBrightness < DARKNESS_THRESHOLD) {
            frameIsAbnormal = true;
            reason = 'dark_frame';
        }

        // Check 2: Abnormal brightness drop from baseline
        if (!frameIsAbnormal && state.baselineBrightness && avgBrightness < state.baselineBrightness * BRIGHTNESS_DROP_FACTOR) {
            frameIsAbnormal = true;
            reason = 'brightness_drop';
        }

        // Check 3: Freeze detection (signature similarity)
        let frameIsFrozen = false;
        if (state.lastSignature) {
            const similarity = compareSignatures(signature, state.lastSignature);
            if (similarity >= FREEZE_SIMILARITY_THRESHOLD) {
                state.consecutiveFrozenFrames++;
                if (state.consecutiveFrozenFrames >= FREEZE_FRAMES_TO_TRIGGER) {
                    frameIsFrozen = true;
                    reason = 'frozen_frame';
                }
            } else {
                state.consecutiveFrozenFrames = 0;
            }
        }

        // --- Multi-frame confirmation logic ---
        if (frameIsAbnormal || frameIsFrozen) {
            // Abnormal frame: increment counter, reset normal counter
            if (frameIsAbnormal) {
                state.consecutiveAbnormalFrames++;
            }
            state.consecutiveNormalFrames = 0;
            state.lastReason = reason;

            // Only trigger after enough consecutive abnormal frames OR confirmed freeze
            const shouldTrigger = frameIsFrozen || (state.consecutiveAbnormalFrames >= ABNORMAL_FRAMES_TO_TRIGGER);

            if (shouldTrigger && !state.isCurrentlyInterrupted) {
                state.isCurrentlyInterrupted = true;
                state.interruptionCount++;
                const frames = frameIsFrozen ? state.consecutiveFrozenFrames : state.consecutiveAbnormalFrames;
                console.log(
                    `[Camera Interruption] CONFIRMED after ${frames} consecutive frames: ${reason}, ` +
                    `brightness: ${avgBrightness.toFixed(1)}, darkRatio: ${darkRatio.toFixed(2)}`
                );
                showInterruptionWarning(overlayState);
                if (onInterruption) onInterruption(state.interruptionCount);
            }
        } else {
            // Normal frame: increment normal counter, reset abnormal counter
            state.consecutiveAbnormalFrames = 0;
            state.consecutiveNormalFrames++;

            // Only recover after enough consecutive normal frames
            if (state.isCurrentlyInterrupted && state.consecutiveNormalFrames >= NORMAL_FRAMES_TO_RECOVER) {
                state.isCurrentlyInterrupted = false;
                state.consecutiveFrozenFrames = 0;
                console.log(`[Camera Interruption] Feed recovered after ${NORMAL_FRAMES_TO_RECOVER} consecutive normal frames`);
                hideInterruptionWarning(overlayState);
                if (onResume) onResume();
            }
        }

        state.lastSignature = signature;
    }, CHECK_INTERVAL_MS);

    // Cleanup
    return () => {
        state.destroyed = true;
        clearInterval(checkInterval);
        clearInterval(trackToggleCheck);
        hideInterruptionWarning(overlayState);
        console.log('[Camera Interruption] Monitor cleaned up');
    };
};
