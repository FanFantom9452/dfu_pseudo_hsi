// Main app controller

var AppState = {
  currentScreen: 'camera',
  capturedImage: null,
  capturedImage90: null,
  caseId: null,
  riskScore: 78,

  // AI camera state
  mode: 'ai',         // 'ai' or 'manual'
  isLocked: false,
  confidence: 0,
  isCapturing: false,
  shotStep: 0,

  // Upload tracking
  uploaded90: false,
  uploaded45: false,
  uploadErrors: []
};

// --- Shared image upload function with retry ---
function uploadImage(caseId, imageData, angle, retries) {
  if (retries === undefined) retries = 2;

  return fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId: caseId,
      image: imageData,
      angle: angle
    })
  }).then(function(response) {
    return response.json();
  }).then(function(result) {
    if (result.success) {
      if (angle === '90') {
        AppState.uploaded90 = true;
      } else {
        AppState.uploaded45 = true;
      }
      showToast(angle + '° 照片上傳成功');
      return result;
    } else {
      throw new Error(result.error || '上傳失敗');
    }
  }).catch(function(err) {
    if (retries > 0) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve(uploadImage(caseId, imageData, angle, retries - 1));
        }, 2000);
      });
    } else {
      AppState.uploadErrors.push(angle + '° 照片: ' + err.message);
      showToast(angle + '° 照片上傳失敗: ' + err.message, 5000);
      throw err;
    }
  });
}

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

function updateAngleIndicator() {
  var icon90 = document.getElementById('angle-icon-90');
  var icon45 = document.getElementById('angle-icon-45');
  var fill = document.getElementById('angle-progress-fill');
  var step = document.getElementById('angle-step-text');
  var hint = document.getElementById('angle-hint-text');

  if (AppState.shotStep === 0) {
    if (icon90) icon90.classList.remove('hidden');
    if (icon45) icon45.classList.add('hidden');
    if (fill) fill.style.width = '0%';
    if (step) step.textContent = '0/2';
    if (hint) hint.textContent = '請垂直 90° 俯拍';
  } else if (AppState.shotStep === 1) {
    if (icon90) icon90.classList.add('hidden');
    if (icon45) icon45.classList.remove('hidden');
    if (fill) fill.style.width = '50%';
    if (step) step.textContent = '1/2';
    if (hint) hint.textContent = '請 45° 側視角拍攝';
  } else {
    if (icon90) icon90.classList.add('hidden');
    if (icon45) icon45.classList.remove('hidden');
    if (fill) fill.style.width = '100%';
    if (step) step.textContent = '2/2';
    if (hint) hint.textContent = '拍攝完成';
  }
}

function handleCapture() {
  if (AppState.isCapturing) return;

  // In AI mode, must be locked first
  if (AppState.mode === 'ai' && !AppState.isLocked) return;

  // Camera must be ready (fallback has its own handler)
  if (!CameraModule.cameraReady) return;

  AppState.isCapturing = true;

  if (AppState.shotStep === 0) {
    // --- Shot 1 (90°): flash → upload → stay on camera ---
    AppState.capturedImage90 = CameraModule.capture();

    CameraModule.triggerFlash(function() {
      // Immediately upload 90° image
      uploadImage(AppState.caseId, AppState.capturedImage90, '90');

      AppState.shotStep = 1;
      AppState.isCapturing = false;

      updateAngleIndicator();

      // Unlock so user can re-lock for shot 2
      AppState.isLocked = false;
      CameraModule.updateDetectionBoxUI(false);
      CameraModule.updateShutterState();

      // Reset AI status label
      var label = document.getElementById('ai-status-label');
      if (label) {
        var span = label.querySelector('span');
        var icon = label.querySelector('i');
        if (span) span.textContent = 'VGG19-Lite 偵測中';
        label.classList.remove('text-emerald-300');
        label.classList.add('text-emerald-400');
        if (icon) icon.classList.add('animate-pulse');
      }
    });

  } else {
    // --- Shot 2 (45°): flash → upload → processing → report ---
    AppState.capturedImage = CameraModule.capture();

    CameraModule.triggerFlash(function() {
      CameraModule.stopAIScanning();

      // Immediately upload 45° image
      uploadImage(AppState.caseId, AppState.capturedImage, '45');

      ProcessingModule.start(function() {
        AppState.shotStep = 2;
        CameraModule.stop();
        switchScreen('report');
        AppState.isCapturing = false;
      });
    });
  }
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

  // Photo guide sheet
  var btnPhotoGuide = document.getElementById('btn-photo-guide');
  var photoGuideModal = document.getElementById('photo-guide-modal');
  var btnClosePhotoGuide = document.getElementById('btn-close-photo-guide');

  function openPhotoGuide() {
    photoGuideModal.classList.remove('hidden');
    photoGuideModal.classList.remove('sheet-close');
    photoGuideModal.classList.add('sheet-open');
    if (window.lucide) lucide.createIcons();
  }

  function closePhotoGuide() {
    photoGuideModal.classList.remove('sheet-open');
    photoGuideModal.classList.add('sheet-close');
    setTimeout(function() {
      photoGuideModal.classList.add('hidden');
      photoGuideModal.classList.remove('sheet-close');
    }, 280);
  }

  if (btnPhotoGuide && photoGuideModal) {
    btnPhotoGuide.addEventListener('click', function(e) {
      e.stopPropagation();
      openPhotoGuide();
    });
  }
  if (btnClosePhotoGuide) {
    btnClosePhotoGuide.addEventListener('click', closePhotoGuide);
  }
  if (photoGuideModal) {
    photoGuideModal.addEventListener('click', function(e) {
      if (e.target === photoGuideModal) closePhotoGuide();
    });
  }

  // Init modules
  DashboardModule.init();
  AnnotationModule.init();

  // Show initial screen
  switchScreen('camera');
});
