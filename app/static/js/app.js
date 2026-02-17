// Main app controller

var AppState = {
  currentScreen: 'camera',
  capturedImage: null,
  caseId: null,
  riskScore: 78,

  // AI camera state
  mode: 'ai',         // 'ai' or 'manual'
  isLocked: false,
  confidence: 0,
  isCapturing: false
};

function switchScreen(screenName) {
  document.querySelectorAll('[data-screen]').forEach(function(el) {
    if (el.dataset.screen === screenName) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.remove('flex');
      el.classList.add('hidden');
    }
  });
  AppState.currentScreen = screenName;

  if (screenName === 'report') {
    DashboardModule.renderReport();
  }
}

function showToast(message, duration) {
  duration = duration || 3000;
  var toast = document.getElementById('toast');
  if (!toast) return;
  var inner = toast.querySelector('div');
  if (inner) inner.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(function() { toast.classList.add('hidden'); }, duration);
}

function generateCaseId() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return 'P-' + y + m + d + '-' + rand;
}

function handleCapture() {
  if (AppState.isCapturing) return;

  // In AI mode, must be locked first
  if (AppState.mode === 'ai' && !AppState.isLocked) return;

  // Camera must be ready (fallback has its own handler)
  if (!CameraModule.cameraReady) return;

  AppState.isCapturing = true;

  // 1) Capture image
  AppState.capturedImage = CameraModule.capture();

  // 2) Flash effect
  CameraModule.triggerFlash(function() {
    // 3) Stop AI scanning (keep camera for background)
    CameraModule.stopAIScanning();

    // 4) Start processing overlay (stays on camera screen)
    ProcessingModule.start(function() {
      // 5) Switch to report
      CameraModule.stop();
      switchScreen('report');
      AppState.isCapturing = false;
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Init lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  AppState.caseId = generateCaseId();

  // Init camera
  CameraModule.init();

  // Start in AI mode
  CameraModule.setMode('ai');

  // Capture button
  var btnCapture = document.getElementById('btn-capture');
  if (btnCapture) {
    btnCapture.addEventListener('click', function() {
      handleCapture();
    });
  }

  // Mode toggle buttons
  var btnModeAI = document.getElementById('btn-mode-ai');
  var btnModeManual = document.getElementById('btn-mode-manual');

  if (btnModeAI) {
    btnModeAI.addEventListener('click', function() {
      CameraModule.setMode('ai');
    });
  }
  if (btnModeManual) {
    btnModeManual.addEventListener('click', function() {
      CameraModule.setMode('manual');
    });
  }

  // Viewport click to toggle lock (AI mode only)
  var viewport = document.getElementById('camera-viewport');
  if (viewport) {
    viewport.addEventListener('click', function(e) {
      // Don't trigger on button clicks
      if (e.target.closest('button') || e.target.closest('label') || e.target.closest('input')) return;
      if (AppState.mode !== 'ai') return;
      if (AppState.isCapturing) return;

      CameraModule.toggleLock();
    });
  }

  // Init modules
  DashboardModule.init();
  AnnotationModule.init();

  // Show initial screen
  switchScreen('camera');
});
