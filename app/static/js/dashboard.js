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
    // Check if images were uploaded; warn if not
    if ((AppState.capturedImage || AppState.capturedImage90) &&
        (!AppState.uploaded90 || !AppState.uploaded45)) {
      var hasUnuploaded = [];
      if (!AppState.uploaded90 && AppState.capturedImage90) hasUnuploaded.push('90°');
      if (!AppState.uploaded45 && AppState.capturedImage) hasUnuploaded.push('45°');

      if (hasUnuploaded.length > 0) {
        var confirmMsg = hasUnuploaded.join(' 和 ') + ' 照片尚未上傳成功，確定要返回？';
        if (!confirm(confirmMsg)) return;

        // Try one last upload attempt before leaving
        if (!AppState.uploaded90 && AppState.capturedImage90) {
          uploadImage(AppState.caseId, AppState.capturedImage90, '90', 0);
        }
        if (!AppState.uploaded45 && AppState.capturedImage) {
          uploadImage(AppState.caseId, AppState.capturedImage, '45', 0);
        }
      }
    }

    ProcessingModule.reset();

    // Clear captured images and upload state
    AppState.capturedImage = null;
    AppState.capturedImage90 = null;
    AppState.uploaded90 = false;
    AppState.uploaded45 = false;
    AppState.uploadErrors = [];
    AppState.isLocked = false;
    AppState.isCapturing = false;
    AppState.shotStep = 0;

    // Generate new case ID for next patient
    AppState.caseId = generateCaseId();

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
