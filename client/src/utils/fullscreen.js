// Fullscreen and Tab Switch Detection Utilities

let violationCount = 0;
let warningOverlay = null;
let tabSwitchOverlay = null;

// Enter fullscreen mode
export const enterFullscreen = async (element = document.documentElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    }
    return true;
  } catch (error) {
    console.error('[Fullscreen] Failed to enter:', error);
    return false;
  }
};

// Check if currently in fullscreen
export const isFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
};

// Show fullscreen warning overlay
const showWarning = () => {
  if (warningOverlay) return;

  warningOverlay = document.createElement('div');
  warningOverlay.id = 'fullscreen-warning-overlay';
  warningOverlay.innerHTML = `
    <div class="warning-content">
      <div class="warning-icon">⚠️</div>
      <h2>Fullscreen Mode Required</h2>
      <p>Return to fullscreen to continue exam</p>
      <button id="return-fullscreen-btn">Return to Fullscreen</button>
    </div>
  `;

  warningOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    color: white;
    font-family: system-ui, sans-serif;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #fullscreen-warning-overlay .warning-content {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-radius: 20px;
      border: 2px solid #e94560;
    }
    #fullscreen-warning-overlay .warning-icon { font-size: 64px; margin-bottom: 20px; }
    #fullscreen-warning-overlay h2 { color: #e94560; margin: 0 0 10px; }
    #fullscreen-warning-overlay p { color: #a0a0a0; margin: 0 0 20px; }
    #fullscreen-warning-overlay button {
      background: linear-gradient(135deg, #e94560, #0f3460);
      border: none;
      color: white;
      padding: 15px 40px;
      font-size: 16px;
      border-radius: 10px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(warningOverlay);

  document.getElementById('return-fullscreen-btn').addEventListener('click', async () => {
    await enterFullscreen();
  });
};

// Hide fullscreen warning overlay
const hideWarning = () => {
  if (warningOverlay) {
    warningOverlay.remove();
    warningOverlay = null;
  }
};

// Handle fullscreen change events
export const handleFullscreenChange = (onExit, onEnter) => {
  const handler = () => {
    if (!isFullscreen()) {
      violationCount++;
      showWarning();
      if (onExit) onExit(violationCount);
    } else {
      hideWarning();
      if (onEnter) onEnter();
    }
  };

  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);

  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    hideWarning();
    violationCount = 0;
  };
};

// Show tab switch warning overlay
const showTabSwitchWarning = (count) => {
  if (tabSwitchOverlay) return;

  tabSwitchOverlay = document.createElement('div');
  tabSwitchOverlay.id = 'tab-switch-warning-overlay';
  tabSwitchOverlay.innerHTML = `
    <div class="warning-content">
      <div class="warning-icon">🚫</div>
      <h2>Tab Switch Detected!</h2>
      <p>Switching tabs during an exam is a violation</p>
      <p class="violation-count">Violations: ${count}</p>
    </div>
  `;

  tabSwitchOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.98);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    color: white;
    font-family: system-ui, sans-serif;
  `;

  const style = document.createElement('style');
  style.id = 'tab-switch-warning-style';
  style.textContent = `
    #tab-switch-warning-overlay .warning-content {
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #2d1b1b, #1a1a2e);
      border-radius: 20px;
      border: 2px solid #dc2626;
    }
    #tab-switch-warning-overlay .warning-icon { font-size: 72px; margin-bottom: 20px; }
    #tab-switch-warning-overlay h2 { color: #dc2626; margin: 0 0 10px; }
    #tab-switch-warning-overlay p { color: #a0a0a0; margin: 0 0 10px; }
    #tab-switch-warning-overlay .violation-count { color: #dc2626; font-weight: bold; font-size: 20px; }
  `;

  if (!document.getElementById('tab-switch-warning-style')) {
    document.head.appendChild(style);
  }
  document.body.appendChild(tabSwitchOverlay);
};

// Hide tab switch warning
const hideTabSwitchWarning = () => {
  if (tabSwitchOverlay) {
    tabSwitchOverlay.remove();
    tabSwitchOverlay = null;
  }
};

// Handle tab switch detection
export const handleTabSwitch = (onTabSwitch, onTabReturn) => {
  let tabSwitchCount = 0;
  let switchedAway = false;

  // Detect tab visibility change (switching browser tabs)
  const handleVisibilityChange = () => {
    if (document.hidden && !switchedAway) {
      switchedAway = true;
      tabSwitchCount++;
      showTabSwitchWarning(tabSwitchCount);
      if (onTabSwitch) onTabSwitch(tabSwitchCount);
    } else if (!document.hidden && switchedAway) {
      switchedAway = false;
      hideTabSwitchWarning();
      if (onTabReturn) onTabReturn();
    }
  };

  // Detect window blur (Windows key, Alt+Tab, clicking outside browser)
  const handleWindowBlur = () => {
    if (!switchedAway) {
      switchedAway = true;
      tabSwitchCount++;
      showTabSwitchWarning(tabSwitchCount);
      if (onTabSwitch) onTabSwitch(tabSwitchCount);
    }
  };

  // Detect window focus return
  const handleWindowFocus = () => {
    if (switchedAway) {
      switchedAway = false;
      hideTabSwitchWarning();
      if (onTabReturn) onTabReturn();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    hideTabSwitchWarning();
  };
};
