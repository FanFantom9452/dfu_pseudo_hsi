// Dashboard module - report rendering and navigation

var DashboardModule = {

  init: function() {
    var self = this;

    // Back to camera (floating button in bottom nav)
    var btnBack = document.getElementById('btn-back-camera');
    if (btnBack) {
      btnBack.addEventListener('click', function() {
        self.handleBackToCamera();
      });
    }
  },

  handleBackToCamera: function() {
    ProcessingModule.reset();
    AppState.capturedImage = null;
    AppState.isLocked = false;
    AppState.isCapturing = false;

    switchScreen('camera');

    // Re-init camera
    CameraModule.init();

    // Restart mode
    if (AppState.mode === 'ai') {
      CameraModule.setMode('ai');
    } else {
      CameraModule.setMode('manual');
    }

    // Update angle indicator
    updateAngleIndicator();
  },

  renderReport: function() {
    // Patient ID
    var patientIdEl = document.getElementById('report-patient-id');
    if (patientIdEl && AppState.caseId) {
      patientIdEl.textContent = 'ID: ' + AppState.caseId;
    }

    // Date
    var dateEl = document.getElementById('report-date');
    if (dateEl) {
      var now = new Date();
      var timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      dateEl.textContent = 'Today, ' + timeStr;
    }

    // Re-create lucide icons for report section
    if (window.lucide) lucide.createIcons();
  },

  exportCSV: function() {
    fetch('/api/export/csv').then(function(response) {
      if (!response.ok) {
        showToast('目前沒有可匯出的資料');
        return;
      }
      return response.blob();
    }).then(function(blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dfu_research_dataset.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('報告匯出成功');
    }).catch(function(err) {
      showToast('匯出失敗: ' + err.message);
    });
  }
};
