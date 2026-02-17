// PC Analysis Module - 3D Risk Heatmap Visualization

var AnalysisModule = {
  // DOM references
  plotContainer: null,
  sidebar: null,
  infoBody: null,
  infoChevron: null,
  viewMenuDropdown: null,
  plotLoading: null,

  // State
  isGraphReady: false,
  showSidebar: true,
  showInfo: true,
  showMenu: false,
  interactionMode: 'turntable',

  // Parameters
  peakHeight: 8.5,
  spread: 15,
  centerX: 0,
  centerY: 0,

  // Debounce timer
  _renderTimeout: null,

  init: function() {
    this.plotContainer = document.getElementById('plot-container');
    this.sidebar = document.getElementById('analysis-sidebar');
    this.infoBody = document.getElementById('info-body');
    this.infoChevron = document.getElementById('info-chevron');
    this.viewMenuDropdown = document.getElementById('view-menu-dropdown');
    this.plotLoading = document.getElementById('plot-loading');

    this.bindEvents();
    this.renderPlot();
  },

  bindEvents: function() {
    var self = this;

    // Sidebar toggle
    var btnToggle = document.getElementById('btn-toggle-sidebar');
    if (btnToggle) {
      btnToggle.addEventListener('click', function() { self.toggleSidebar(); });
    }
    var btnClose = document.getElementById('btn-close-sidebar');
    if (btnClose) {
      btnClose.addEventListener('click', function() { self.toggleSidebar(); });
    }

    // Info overlay toggle
    var btnInfo = document.getElementById('btn-toggle-info');
    if (btnInfo) {
      btnInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        self.toggleInfo();
      });
    }

    // View menu dropdown
    var btnMenu = document.getElementById('btn-view-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', function(e) {
        e.stopPropagation();
        self.toggleMenu();
      });
    }

    // View mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.setInteractionMode(btn.dataset.mode);
        self.toggleMenu();
      });
    });

    // Reset buttons
    var btnResetCamera = document.getElementById('btn-reset-camera');
    if (btnResetCamera) {
      btnResetCamera.addEventListener('click', function() {
        self.resetCamera();
        self.toggleMenu();
      });
    }
    var btnResetParams = document.getElementById('btn-reset-params');
    if (btnResetParams) {
      btnResetParams.addEventListener('click', function() {
        self.resetParams();
        self.toggleMenu();
      });
    }

    // Slider inputs
    var sliders = ['peakHeight', 'spread', 'centerX', 'centerY'];
    sliders.forEach(function(param) {
      var slider = document.getElementById('slider-' + param);
      if (slider) {
        slider.addEventListener('input', function() {
          self.onSliderInput(param, slider.value);
        });
      }
    });

    // Close menu on main click
    var main = document.getElementById('analysis-main');
    if (main) {
      main.addEventListener('click', function() {
        if (self.showMenu) self.toggleMenu();
      });
    }

    // Window resize
    window.addEventListener('resize', function() {
      self.resizePlot();
    });
  },

  // --- Data Generation ---

  generateSurfaceData: function() {
    var size = 50;
    var xValues = [];
    var yValues = [];
    var zValues = [];

    for (var i = -size / 2; i < size / 2; i++) {
      xValues.push(i);
      yValues.push(i);
    }

    for (var i = 0; i < size; i++) {
      var row = [];
      for (var j = 0; j < size; j++) {
        var x = xValues[j] - this.centerX;
        var y = yValues[i] - this.centerY;
        var distSq = (x * x) + (y * y);
        var value = this.peakHeight * Math.exp(-distSq / (2 * this.spread * this.spread));
        row.push(Math.max(0.5, value));
      }
      zValues.push(row);
    }

    return { x: xValues, y: yValues, z: zValues };
  },

  // --- Plotly Rendering ---

  renderPlot: function() {
    if (!this.plotContainer || !window.Plotly) return;

    var surface = this.generateSurfaceData();
    var self = this;

    var data = [{
      z: surface.z,
      x: surface.x,
      y: surface.y,
      type: 'surface',
      colorscale: 'Jet',
      showscale: true,
      colorbar: {
        title: '風險等級 (Risk)',
        titleside: 'right',
        thickness: 20,
        len: 0.8,
        tickfont: { color: '#e2e8f0' },
        titlefont: { color: '#e2e8f0' }
      },
      contours: {
        z: {
          show: true,
          usecolormap: true,
          highlightcolor: '#42f462',
          project: { z: true }
        }
      },
      hovertemplate:
        '<b>組織紋理</b>: %{x:.1f}<br>' +
        '<b>血氧濃度</b>: %{y:.1f}<br>' +
        '<b>風險值</b>: %{z:.2f}<extra></extra>'
    }];

    var layout = {
      title: {
        text: 'AI 模型特徵空間風險分佈',
        font: { color: '#e2e8f0', size: 18 }
      },
      autosize: true,
      paper_bgcolor: '#0f172a',
      plot_bgcolor: '#0f172a',
      font: {
        family: 'Inter, system-ui, sans-serif'
      },
      scene: {
        aspectratio: { x: 1, y: 1, z: 0.7 },
        dragmode: this.interactionMode,
        xaxis: {
          title: '組織紋理 (Texture)',
          backgroundcolor: 'rgba(0,0,0,0)',
          gridcolor: '#334155',
          showbackground: true,
          zerolinecolor: '#334155',
          tickfont: { color: '#94a3b8' },
          titlefont: { color: '#cbd5e1' }
        },
        yaxis: {
          title: '血氧濃度 (HbO2)',
          backgroundcolor: 'rgba(0,0,0,0)',
          gridcolor: '#334155',
          showbackground: true,
          zerolinecolor: '#334155',
          tickfont: { color: '#94a3b8' },
          titlefont: { color: '#cbd5e1' }
        },
        zaxis: {
          title: 'Risk Index (0-10)',
          backgroundcolor: 'rgba(0,0,0,0)',
          gridcolor: '#334155',
          showbackground: true,
          zerolinecolor: '#334155',
          tickfont: { color: '#94a3b8' },
          titlefont: { color: '#cbd5e1' },
          range: [0, 10]
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 }
        }
      },
      margin: { l: 0, r: 0, b: 0, t: 50 }
    };

    var config = {
      responsive: true,
      displayModeBar: false,
      displaylogo: false
    };

    window.Plotly.newPlot(this.plotContainer, data, layout, config).then(function() {
      self.isGraphReady = true;
      if (self.plotLoading) {
        self.plotLoading.classList.add('hidden');
      }
    });
  },

  resizePlot: function() {
    if (!this.isGraphReady || !this.plotContainer || !window.Plotly) return;
    try {
      window.Plotly.Plots.resize(this.plotContainer);
    } catch (e) {
      // ignore resize errors
    }
  },

  // --- UI Controls ---

  toggleSidebar: function() {
    this.showSidebar = !this.showSidebar;
    var toggleText = document.getElementById('sidebar-toggle-text');
    var toggleBtn = document.getElementById('btn-toggle-sidebar');

    if (this.showSidebar) {
      this.sidebar.classList.remove('w-0', 'p-0', 'opacity-0', 'overflow-hidden', 'border-none');
      this.sidebar.classList.add('w-80', 'p-6', 'opacity-100');
      if (toggleText) toggleText.textContent = '隱藏面板';
      if (toggleBtn) {
        toggleBtn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
        toggleBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-500');
      }
    } else {
      this.sidebar.classList.remove('w-80', 'p-6', 'opacity-100');
      this.sidebar.classList.add('w-0', 'p-0', 'opacity-0', 'overflow-hidden', 'border-none');
      if (toggleText) toggleText.textContent = '設定';
      if (toggleBtn) {
        toggleBtn.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
        toggleBtn.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
      }
    }

    var self = this;
    setTimeout(function() { self.resizePlot(); }, 350);
  },

  toggleInfo: function() {
    this.showInfo = !this.showInfo;
    if (this.infoBody) {
      this.infoBody.classList.toggle('hidden', !this.showInfo);
    }
    if (this.infoChevron) {
      this.infoChevron.setAttribute('data-lucide', this.showInfo ? 'chevron-up' : 'chevron-down');
      if (window.lucide) lucide.createIcons();
    }
  },

  toggleMenu: function() {
    this.showMenu = !this.showMenu;
    if (this.viewMenuDropdown) {
      this.viewMenuDropdown.classList.toggle('hidden', !this.showMenu);
    }
    // Update button style
    var btn = document.getElementById('btn-view-menu');
    if (btn) {
      if (this.showMenu) {
        btn.classList.remove('bg-slate-800', 'text-slate-300', 'border-slate-700');
        btn.classList.add('bg-slate-700', 'text-white', 'border-slate-600');
      } else {
        btn.classList.remove('bg-slate-700', 'text-white', 'border-slate-600');
        btn.classList.add('bg-slate-800', 'text-slate-300', 'border-slate-700');
      }
    }
  },

  setInteractionMode: function(mode) {
    this.interactionMode = mode;

    // Update button styles
    document.querySelectorAll('.view-mode-btn').forEach(function(btn) {
      if (btn.dataset.mode === mode) {
        btn.classList.remove('text-slate-300', 'hover:bg-slate-700');
        btn.classList.add('bg-blue-600', 'text-white');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-300', 'hover:bg-slate-700');
      }
    });

    // Apply to plot
    if (this.isGraphReady && this.plotContainer && window.Plotly) {
      try {
        window.Plotly.relayout(this.plotContainer, {
          'scene.dragmode': mode
        });
      } catch (e) {
        // ignore
      }
    }
  },

  resetCamera: function() {
    if (!this.isGraphReady || !this.plotContainer || !window.Plotly) return;
    try {
      window.Plotly.relayout(this.plotContainer, {
        'scene.camera': {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
          center: { x: 0, y: 0, z: 0 },
          up: { x: 0, y: 0, z: 1 }
        }
      });
      this.setInteractionMode('turntable');
    } catch (e) {
      // ignore
    }
  },

  resetParams: function() {
    this.peakHeight = 8.5;
    this.spread = 15;
    this.centerX = 0;
    this.centerY = 0;

    // Update sliders
    var sliderPH = document.getElementById('slider-peakHeight');
    var sliderSP = document.getElementById('slider-spread');
    var sliderCX = document.getElementById('slider-centerX');
    var sliderCY = document.getElementById('slider-centerY');

    if (sliderPH) sliderPH.value = 8.5;
    if (sliderSP) sliderSP.value = 15;
    if (sliderCX) sliderCX.value = 0;
    if (sliderCY) sliderCY.value = 0;

    // Update displays
    this.updateDisplay('peakHeight', '8.5');
    this.updateDisplay('spread', '15');
    this.updateDisplay('centerX', '0');
    this.updateDisplay('centerY', '0');

    this.renderPlot();
  },

  // --- Slider Handlers ---

  onSliderInput: function(param, value) {
    this[param] = parseFloat(value);
    this.updateDisplay(param, value);

    var self = this;
    if (this._renderTimeout) clearTimeout(this._renderTimeout);
    this._renderTimeout = setTimeout(function() {
      self.renderPlot();
    }, 50);
  },

  updateDisplay: function(param, value) {
    var el = document.getElementById('val-' + param);
    if (el) {
      if (param === 'peakHeight') {
        el.textContent = parseFloat(value).toFixed(1);
      } else {
        el.textContent = Math.round(parseFloat(value));
      }
    }
  }
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', function() {
  if (window.lucide) {
    lucide.createIcons();
  }

  if (window.Plotly) {
    AnalysisModule.init();
  } else {
    // Wait for Plotly to load
    var check = setInterval(function() {
      if (window.Plotly) {
        clearInterval(check);
        AnalysisModule.init();
      }
    }, 100);
  }
});
