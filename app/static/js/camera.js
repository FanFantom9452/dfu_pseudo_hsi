// Camera module - Web Camera API + AI scanning simulation + mode switching

var CameraModule = {
  videoEl: null,
  canvasEl: null,
  stream: null,
  cameraReady: false,

  // AI scanning state
  _scanInterval: null,
  _confidence: 0,

  // DOM cache
  _confidenceBar: null,
  _confidenceText: null,
  _scanLine: null,
  _detectionBox: null,
  _lockLabel: null,
  _lockGrid: null,
  _lockCrosshair: null,
  _lockReadyText: null,
  _lockConfidenceText: null,
  _corners: null,
  _aiStatusLabel: null,
  _qaBadge: null,
  _guideAI: null,
  _guideManual: null,
  _aiDetectionArea: null,

  init: function() {
    this.videoEl = document.getElementById('camera-video');
    this.canvasEl = document.getElementById('camera-canvas');

    // Cache DOM references
    this._confidenceBar = document.getElementById('confidence-bar');
    this._confidenceText = document.getElementById('confidence-text');
    this._scanLine = document.getElementById('scan-line');
    this._detectionBox = document.getElementById('detection-box');
    this._lockLabel = document.getElementById('lock-label');
    this._lockGrid = document.getElementById('lock-grid');
    this._lockCrosshair = document.getElementById('lock-crosshair');
    this._lockReadyText = document.getElementById('lock-ready-text');
    this._lockConfidenceText = document.getElementById('lock-confidence-text');
    this._angleIcon90 = document.getElementById('angle-icon-90');
    this._angleIcon45 = document.getElementById('angle-icon-45');
    this._angleProgressFill = document.getElementById('angle-progress-fill');
    this._angleStepText = document.getElementById('angle-step-text');
    this._corners = [
      document.getElementById('corner-tl'),
      document.getElementById('corner-tr'),
      document.getElementById('corner-bl'),
      document.getElementById('corner-br')
    ];
    this._aiStatusLabel = document.getElementById('ai-status-label');
    this._qaBadge = document.getElementById('qa-badge');
    this._guideAI = document.getElementById('guide-area-ai');
    this._guideManual = document.getElementById('guide-area-manual');
    this._aiDetectionArea = document.getElementById('ai-detection-area');

    var self = this;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      self.showFallback('需要 HTTPS 連線才能使用相機');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    }).then(function(stream) {
      self.stream = stream;
      self.videoEl.srcObject = stream;
      self.cameraReady = true;
    }).catch(function(err) {
      console.warn('Camera not available:', err.message);
      self.showFallback('相機無法使用：' + err.message);
    });
  },

  showFallback: function(reason) {
    var viewport = document.getElementById('camera-viewport');
    if (!viewport) return;

    if (this.videoEl) this.videoEl.style.display = 'none';

    // Hide AI overlays in fallback mode
    var aiOverlay = viewport.querySelector('.absolute.inset-0.flex.flex-col');
    if (aiOverlay) aiOverlay.style.display = 'none';

    var fallback = document.createElement('div');
    fallback.id = 'camera-fallback';
    fallback.className = 'absolute inset-0 flex flex-col items-center justify-center z-10 text-white p-6';

    var icon = document.createElement('div');
    icon.className = 'w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mb-4';
    icon.style.cssText = 'font-size: 36px;';
    icon.textContent = '\uD83D\uDCF7';
    fallback.appendChild(icon);

    var msg = document.createElement('p');
    msg.className = 'text-sm text-gray-300 mb-4 text-center';
    msg.textContent = reason;
    fallback.appendChild(msg);

    var label = document.createElement('label');
    label.className = 'px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-sm cursor-pointer transition';
    label.textContent = '選擇照片上傳';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.className = 'hidden';
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        AppState.capturedImage = ev.target.result;
        ProcessingModule.start(function() {
          switchScreen('report');
        });
      };
      reader.readAsDataURL(file);
    });

    label.appendChild(fileInput);
    fallback.appendChild(label);
    viewport.appendChild(fallback);

    // Make capture button trigger file picker in fallback
    var btnCapture = document.getElementById('btn-capture');
    if (btnCapture) {
      btnCapture.classList.remove('cursor-not-allowed', 'opacity-60');
      btnCapture.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }
  },

  capture: function() {
    if (!this.videoEl || !this.canvasEl) return null;

    var video = this.videoEl;
    var canvas = this.canvasEl;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.85);
  },

  stop: function() {
    this.stopAIScanning();
    if (this.stream) {
      this.stream.getTracks().forEach(function(track) { track.stop(); });
      this.stream = null;
    }
    this.cameraReady = false;
  },

  // --- AI Scanning ---

  startAIScanning: function() {
    if (this._scanInterval) return;
    this._confidence = 0;
    var self = this;

    this._scanInterval = setInterval(function() {
      if (AppState.isLocked) {
        // Converge toward 98.7%
        self._confidence += (98.7 - self._confidence) * 0.15;
        if (self._confidence > 98) self._confidence = 98.7;
      } else {
        // Fluctuate between 45-70%
        var target = 55 + Math.random() * 15;
        self._confidence += (target - self._confidence) * 0.3;
      }
      self.updateConfidenceUI(self._confidence);
    }, 150);
  },

  stopAIScanning: function() {
    if (this._scanInterval) {
      clearInterval(this._scanInterval);
      this._scanInterval = null;
    }
    this._confidence = 0;
  },

  updateConfidenceUI: function(value) {
    if (this._confidenceBar) {
      this._confidenceBar.style.width = Math.round(value) + '%';
    }
    if (this._confidenceText) {
      this._confidenceText.textContent = Math.round(value) + '%';
    }

    // Update lock confidence text
    if (this._lockConfidenceText && AppState.isLocked) {
      this._lockConfidenceText.textContent = '模型信心分數: ' + value.toFixed(1) + '%';
    }

    // Update QA badge
    if (this._qaBadge) {
      var span = this._qaBadge.querySelector('span');
      if (AppState.isLocked) {
        span.textContent = 'QA: 已鎖定';
        this._qaBadge.classList.remove('border-zinc-600');
        this._qaBadge.classList.add('border-emerald-500', 'bg-emerald-900/70');
        span.classList.remove('text-zinc-300');
        span.classList.add('text-emerald-300');
      } else {
        span.textContent = 'QA: 掃描中...';
        this._qaBadge.classList.remove('border-emerald-500', 'bg-emerald-900/70');
        this._qaBadge.classList.add('border-zinc-600');
        span.classList.remove('text-emerald-300');
        span.classList.add('text-zinc-300');
      }
    }
  },

  toggleLock: function() {
    AppState.isLocked = !AppState.isLocked;
    this.updateDetectionBoxUI(AppState.isLocked);
    this.updateShutterState();

    // Update AI status label
    if (this._aiStatusLabel) {
      var span = this._aiStatusLabel.querySelector('span');
      var icon = this._aiStatusLabel.querySelector('i');
      if (AppState.isLocked) {
        span.textContent = 'VGG19-Lite 已鎖定';
        this._aiStatusLabel.classList.remove('text-emerald-400');
        this._aiStatusLabel.classList.add('text-emerald-300');
        if (icon) icon.classList.remove('animate-pulse');
      } else {
        span.textContent = 'VGG19-Lite 偵測中';
        this._aiStatusLabel.classList.remove('text-emerald-300');
        this._aiStatusLabel.classList.add('text-emerald-400');
        if (icon) icon.classList.add('animate-pulse');
      }
    }

  },

  updateDetectionBoxUI: function(locked) {
    if (!this._detectionBox) return;

    if (locked) {
      // Locked state: green border, show grid/crosshair/label, hide scan line
      this._detectionBox.classList.remove('border-white/40', 'bg-white/5');
      this._detectionBox.classList.add('border-emerald-400', 'bg-emerald-400/5', 'animate-pulse-glow');
      if (this._scanLine) this._scanLine.classList.add('hidden');
      if (this._lockLabel) this._lockLabel.classList.remove('hidden');
      if (this._lockGrid) this._lockGrid.classList.remove('hidden');
      if (this._lockCrosshair) this._lockCrosshair.classList.remove('hidden');
      if (this._lockReadyText) this._lockReadyText.classList.remove('hidden');
      if (this._guideAI) this._guideAI.classList.add('hidden');

      // Green corners
      this._corners.forEach(function(c) {
        if (!c) return;
        c.className = c.className
          .replace(/border-white\/60/g, 'border-emerald-400')
          .replace(/border-\[5px\]/g, 'border-[5px]');
      });
    } else {
      // Scanning state: white border, show scan line, hide lock elements
      this._detectionBox.classList.remove('border-emerald-400', 'bg-emerald-400/5', 'animate-pulse-glow');
      this._detectionBox.classList.add('border-white/40', 'bg-white/5');
      if (this._scanLine) this._scanLine.classList.remove('hidden');
      if (this._lockLabel) this._lockLabel.classList.add('hidden');
      if (this._lockGrid) this._lockGrid.classList.add('hidden');
      if (this._lockCrosshair) this._lockCrosshair.classList.add('hidden');
      if (this._lockReadyText) this._lockReadyText.classList.add('hidden');
      if (this._guideAI) this._guideAI.classList.remove('hidden');

      // White corners
      this._corners.forEach(function(c) {
        if (!c) return;
        c.className = c.className
          .replace(/border-emerald-400/g, 'border-white/60');
      });
    }
  },

  updateShutterState: function() {
    var btn = document.getElementById('btn-capture');
    var inner = document.getElementById('shutter-inner');
    var ping = document.getElementById('shutter-ping');
    if (!btn) return;

    if (AppState.mode === 'manual' || AppState.isLocked) {
      // Shutter enabled
      btn.classList.remove('cursor-not-allowed', 'opacity-60', 'border-white/25');
      btn.classList.add('cursor-pointer', 'border-zinc-500/20', 'active:scale-90');
      if (inner) {
        inner.classList.remove('bg-white/40', 'scale-90');
        inner.classList.add('scale-100');
      }
      if (ping && AppState.isLocked) {
        ping.classList.remove('hidden');
      }
    } else {
      // Shutter disabled (AI mode, not locked)
      btn.classList.add('cursor-not-allowed', 'opacity-60', 'border-white/25');
      btn.classList.remove('cursor-pointer', 'border-zinc-500/20', 'active:scale-90');
      if (inner) {
        inner.classList.add('bg-white/40', 'scale-90');
        inner.classList.remove('scale-100');
      }
      if (ping) {
        ping.classList.add('hidden');
      }
    }
  },

  setMode: function(mode) {
    AppState.mode = mode;
    AppState.isLocked = false;

    var btnAI = document.getElementById('btn-mode-ai');
    var btnManual = document.getElementById('btn-mode-manual');

    if (mode === 'ai') {
      // Show AI detection area, hide manual guide
      if (this._aiDetectionArea) this._aiDetectionArea.classList.remove('hidden');
      if (this._guideManual) this._guideManual.classList.add('hidden');
      if (this._aiStatusLabel) this._aiStatusLabel.parentElement.classList.remove('hidden');
      if (this._qaBadge) this._qaBadge.classList.remove('hidden');

      if (btnAI) {
        btnAI.classList.add('bg-zinc-800', 'rounded-full', 'text-white', 'font-bold', 'shadow-inner');
        btnAI.classList.remove('text-zinc-500');
      }
      if (btnManual) {
        btnManual.classList.remove('bg-zinc-800', 'rounded-full', 'text-white', 'font-bold', 'shadow-inner');
        btnManual.classList.add('text-zinc-500');
      }

      this.updateDetectionBoxUI(false);
      this.startAIScanning();
    } else {
      // Manual mode: hide detection area, show manual guide
      if (this._aiDetectionArea) this._aiDetectionArea.classList.add('hidden');
      if (this._guideManual) this._guideManual.classList.remove('hidden');
      if (this._aiStatusLabel) this._aiStatusLabel.parentElement.classList.add('hidden');
      if (this._qaBadge) this._qaBadge.classList.add('hidden');

      if (btnManual) {
        btnManual.classList.add('bg-zinc-800', 'rounded-full', 'text-white', 'font-bold', 'shadow-inner');
        btnManual.classList.remove('text-zinc-500');
      }
      if (btnAI) {
        btnAI.classList.remove('bg-zinc-800', 'rounded-full', 'text-white', 'font-bold', 'shadow-inner');
        btnAI.classList.add('text-zinc-500');
      }

      this.stopAIScanning();
    }

    this.updateShutterState();
  },

  triggerFlash: function(callback) {
    var flash = document.getElementById('flash-overlay');
    if (!flash) {
      if (callback) callback();
      return;
    }

    flash.classList.remove('hidden');
    flash.classList.add('animate-flash');

    setTimeout(function() {
      flash.classList.add('hidden');
      flash.classList.remove('animate-flash');
      if (callback) callback();
    }, 150);
  }
};
