// Camera Access and Monitoring Utilities

let cameraWarningOverlay = null;
let violationCount = 0;

// Request camera access, returns MediaStream or null
export const requestCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream;
    } catch (error) {
        console.error('[Camera] Access denied:', error);
        return null;
    }
};

// Stop all tracks on a camera stream
export const stopCamera = (stream) => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
};

// Show camera warning overlay
const showCameraWarning = () => {
    if (cameraWarningOverlay) return;

    cameraWarningOverlay = document.createElement('div');
    cameraWarningOverlay.id = 'camera-warning-overlay';
    cameraWarningOverlay.innerHTML = `
    <div class="warning-content">
      <div class="warning-icon">📷</div>
      <h2>Camera Not Active</h2>
      <p>Camera is not active. Please enable camera to continue.</p>
      <p class="violation-count">This has been recorded as a violation.</p>
    </div>
  `;

    cameraWarningOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    color: white;
    font-family: system-ui, sans-serif;
  `;

    const style = document.createElement('style');
    style.id = 'camera-warning-style';
    style.textContent = `
    #camera-warning-overlay .warning-content {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #1a1a2e, #2d1b2e);
      border-radius: 20px;
      border: 2px solid #f59e0b;
    }
    #camera-warning-overlay .warning-icon { font-size: 72px; margin-bottom: 20px; }
    #camera-warning-overlay h2 { color: #f59e0b; margin: 0 0 10px; }
    #camera-warning-overlay p { color: #a0a0a0; margin: 0 0 10px; }
    #camera-warning-overlay .violation-count { color: #f59e0b; font-weight: bold; font-size: 16px; }
  `;

    if (!document.getElementById('camera-warning-style')) {
        document.head.appendChild(style);
    }
    document.body.appendChild(cameraWarningOverlay);
};

// Hide camera warning overlay
const hideCameraWarning = () => {
    if (cameraWarningOverlay) {
        cameraWarningOverlay.remove();
        cameraWarningOverlay = null;
    }
};

// Monitor camera stream health — polls every second + listens for track end
export const monitorCamera = (stream, onCameraOff, onCameraBack) => {
    if (!stream) return () => { };

    violationCount = 0;
    let cameraWasOff = false;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return () => { };

    // When the track ends entirely (hardware disconnect, permission revoke)
    const handleTrackEnd = () => {
        if (!cameraWasOff) {
            cameraWasOff = true;
            violationCount++;
            showCameraWarning();
            if (onCameraOff) onCameraOff(violationCount);
        }
    };

    videoTrack.addEventListener('ended', handleTrackEnd);

    // Poll for muted / disabled state changes
    const pollInterval = setInterval(() => {
        const isActive = videoTrack.readyState === 'live' && videoTrack.enabled;

        if (!isActive && !cameraWasOff) {
            cameraWasOff = true;
            violationCount++;
            showCameraWarning();
            if (onCameraOff) onCameraOff(violationCount);
        } else if (isActive && cameraWasOff) {
            cameraWasOff = false;
            hideCameraWarning();
            if (onCameraBack) onCameraBack();
        }
    }, 1000);

    return () => {
        clearInterval(pollInterval);
        videoTrack.removeEventListener('ended', handleTrackEnd);
        hideCameraWarning();
        violationCount = 0;
    };
};
