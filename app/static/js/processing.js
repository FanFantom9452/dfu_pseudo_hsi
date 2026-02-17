// Processing module - SVG ring progress + lucide icon step animation

var ProcessingModule = {
  _interval: null,
  _timeout: null,
  _progress: 0,

  start: function(onComplete) {
    var overlay = document.getElementById('processing-overlay');
    if (!overlay) {
      if (onComplete) onComplete();
      return;
    }

    // Show overlay
    overlay.classList.remove('hidden');

    // Reset all
    this._progress = 0;
    this._updateRing(0);

    var steps = overlay.querySelectorAll('[data-proc-step]');
    for (var i = 0; i < steps.length; i++) {
      this._setStepState(steps[i], 'pending');
    }

    // Mark step 0 as active immediately
    if (steps[0]) this._setStepState(steps[0], 'active');

    var self = this;

    // Animate progress from 0 to 100
    this._interval = setInterval(function() {
      self._progress += 2;
      if (self._progress > 100) self._progress = 100;

      self._updateRing(self._progress);

      // Step transitions based on progress thresholds
      if (self._progress >= 25 && steps[0] && steps[0].dataset.procState !== 'done') {
        self._setStepState(steps[0], 'done');
        if (steps[1]) self._setStepState(steps[1], 'active');
      }
      if (self._progress >= 50 && steps[1] && steps[1].dataset.procState !== 'done') {
        self._setStepState(steps[1], 'done');
        if (steps[2]) self._setStepState(steps[2], 'active');
      }
      if (self._progress >= 75 && steps[2] && steps[2].dataset.procState !== 'done') {
        self._setStepState(steps[2], 'done');
        if (steps[3]) self._setStepState(steps[3], 'active');
      }
      if (self._progress >= 100) {
        if (steps[3]) self._setStepState(steps[3], 'done');
        clearInterval(self._interval);
        self._interval = null;

        // Wait 800ms then hide and callback
        self._timeout = setTimeout(function() {
          overlay.classList.add('hidden');
          if (onComplete) onComplete();
        }, 800);
      }
    }, 50);
  },

  _updateRing: function(progress) {
    var ring = document.getElementById('progress-ring');
    if (!ring) return;
    var circumference = 502;
    var offset = circumference - (circumference * progress) / 100;
    ring.setAttribute('stroke-dashoffset', offset);
  },

  // Note: innerHTML below only uses hardcoded icon markup, never user input
  _setStepState: function(stepEl, state) {
    if (!stepEl) return;
    stepEl.dataset.procState = state;

    var iconContainer = stepEl.querySelector('.proc-icon');
    if (!iconContainer) return;

    var label = stepEl.querySelector('.proc-label');

    // Build icon element using DOM API
    var i = document.createElement('i');

    if (state === 'pending') {
      i.setAttribute('data-lucide', 'circle');
      i.className = 'w-6 h-6 text-zinc-700';
      if (label) {
        label.classList.remove('text-zinc-100', 'font-medium');
        label.classList.add('text-zinc-500');
      }
    } else if (state === 'active') {
      i.setAttribute('data-lucide', 'loader-2');
      i.className = 'w-6 h-6 text-emerald-400 animate-spin';
      if (label) {
        label.classList.remove('text-zinc-500');
        label.classList.add('text-zinc-100', 'font-medium');
      }
    } else if (state === 'done') {
      i.setAttribute('data-lucide', 'check-circle-2');
      i.className = 'w-6 h-6 text-emerald-500';
      if (label) {
        label.classList.remove('text-zinc-500');
        label.classList.add('text-zinc-100', 'font-medium');
      }
    }

    // Replace icon container contents safely
    while (iconContainer.firstChild) {
      iconContainer.removeChild(iconContainer.firstChild);
    }
    iconContainer.appendChild(i);

    // Re-render lucide icons for the new elements
    if (window.lucide) {
      lucide.createIcons({ nodes: [iconContainer] });
    }
  },

  reset: function() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
    this._progress = 0;

    var overlay = document.getElementById('processing-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      this._updateRing(0);
      var steps = overlay.querySelectorAll('[data-proc-step]');
      for (var i = 0; i < steps.length; i++) {
        this._setStepState(steps[i], 'pending');
      }
    }
  }
};
