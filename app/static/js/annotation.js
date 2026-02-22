// Annotation module - form modal, data collection, submission

var AnnotationModule = {
  modal: null,
  selectedLocation: '',

  init: function() {
    var self = this;
    this.modal = document.getElementById('annotation-modal');

    // Close buttons
    var btnClose = document.getElementById('btn-close-annotation');
    if (btnClose) btnClose.addEventListener('click', function() { self.close(); });

    var btnCancel = document.getElementById('btn-cancel-annotation');
    if (btnCancel) btnCancel.addEventListener('click', function() { self.close(); });

    // Save button
    var btnSave = document.getElementById('btn-save-annotation');
    if (btnSave) btnSave.addEventListener('click', function() { self.save(); });

    // Location buttons
    document.querySelectorAll('.location-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.selectedLocation = btn.dataset.location;
        document.getElementById('field-location').value = self.selectedLocation;
        document.querySelectorAll('.location-btn').forEach(function(b) {
          b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'font-semibold');
          b.classList.add('border-gray-200');
        });
        btn.classList.remove('border-gray-200');
        btn.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'font-semibold');
      });
    });

    // Infection checkboxes
    document.querySelectorAll('.infection-check').forEach(function(cb) {
      cb.addEventListener('change', function() { self.updateInfectionResult(); });
    });

    document.querySelectorAll('.infection-cb').forEach(function(label) {
      var cb = label.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.addEventListener('change', function() {
          if (cb.checked) {
            label.classList.remove('border-gray-200');
            label.classList.add('border-red-600', 'bg-red-50');
          } else {
            label.classList.remove('border-red-600', 'bg-red-50');
            label.classList.add('border-gray-200');
          }
        });
      }
    });

    // Depth radio styling
    document.querySelectorAll('.depth-option input[type="radio"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        document.querySelectorAll('.depth-option').forEach(function(opt) {
          opt.classList.remove('border-blue-600', 'bg-blue-50');
          opt.classList.add('border-gray-200');
        });
        radio.closest('.depth-option').classList.remove('border-gray-200');
        radio.closest('.depth-option').classList.add('border-blue-600', 'bg-blue-50');
      });
    });

    // Wagner radio styling
    document.querySelectorAll('.wagner-option input[type="radio"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        document.querySelectorAll('.wagner-option').forEach(function(opt) {
          opt.classList.remove('border-blue-600', 'bg-blue-50');
          opt.classList.add('border-gray-200');
        });
        radio.closest('.wagner-option').classList.remove('border-gray-200');
        radio.closest('.wagner-option').classList.add('border-blue-600', 'bg-blue-50');
      });
    });

    // Action checkboxes styling
    document.querySelectorAll('.action-cb').forEach(function(label) {
      var cb = label.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.addEventListener('change', function() {
          if (cb.checked) {
            label.classList.remove('border-gray-200');
            label.classList.add('border-blue-600', 'bg-blue-50');
          } else {
            label.classList.remove('border-blue-600', 'bg-blue-50');
            label.classList.add('border-gray-200');
          }
        });
      }
    });

    // Compliance checkboxes
    document.querySelectorAll('.compliance-check').forEach(function(cb) {
      cb.addEventListener('change', function() { self.updateComplianceRate(); });
    });
  },

  open: function() {
    this.resetForm();
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    var caseId = 'P-' + y + m + d + '-' + rand;

    document.getElementById('field-caseId').value = caseId;
    document.getElementById('field-date').value = now.toISOString().split('T')[0];

    if (window.lucide) lucide.createIcons();
  },

  close: function() {
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  resetForm: function() {
    var form = document.getElementById('annotation-form');
    if (form) form.reset();

    this.selectedLocation = '';
    document.getElementById('field-location').value = '';

    document.querySelectorAll('.location-btn').forEach(function(b) {
      b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'font-semibold');
      b.classList.add('border-gray-200');
    });

    document.querySelectorAll('.infection-cb').forEach(function(label) {
      label.classList.remove('border-red-600', 'bg-red-50');
      label.classList.add('border-gray-200');
    });

    document.querySelectorAll('.depth-option, .wagner-option').forEach(function(opt) {
      opt.classList.remove('border-blue-600', 'bg-blue-50');
      opt.classList.add('border-gray-200');
    });

    document.querySelectorAll('.action-cb').forEach(function(label) {
      label.classList.remove('border-blue-600', 'bg-blue-50');
      label.classList.add('border-gray-200');
    });

    this.updateInfectionResult();
    this.updateComplianceRate();
  },

  updateInfectionResult: function() {
    var checks = document.querySelectorAll('.infection-check');
    var count = 0;
    checks.forEach(function(cb) { if (cb.checked) count++; });

    var isInfected = count >= 2;
    var resultDiv = document.getElementById('infection-result');
    var textEl = document.getElementById('infection-text');
    var iconEl = document.getElementById('infection-icon');

    if (isInfected) {
      resultDiv.classList.remove('border-green-500', 'bg-green-50');
      resultDiv.classList.add('border-red-500', 'bg-red-50');
      textEl.classList.remove('text-green-700');
      textEl.classList.add('text-red-700');
      textEl.textContent = '判定結果: 感染 (' + count + '/5 項符合)';
      if (iconEl) {
        iconEl.setAttribute('data-lucide', 'alert-circle');
        iconEl.classList.remove('text-green-600');
        iconEl.classList.add('text-red-600');
      }
    } else {
      resultDiv.classList.remove('border-red-500', 'bg-red-50');
      resultDiv.classList.add('border-green-500', 'bg-green-50');
      textEl.classList.remove('text-red-700');
      textEl.classList.add('text-green-700');
      textEl.textContent = '判定結果: 無感染 (' + count + '/5 項符合)';
      if (iconEl) {
        iconEl.setAttribute('data-lucide', 'check-circle');
        iconEl.classList.remove('text-red-600');
        iconEl.classList.add('text-green-600');
      }
    }

    if (window.lucide) lucide.createIcons();
  },

  updateComplianceRate: function() {
    var checks = document.querySelectorAll('.compliance-check');
    var count = 0;
    checks.forEach(function(cb) { if (cb.checked) count++; });

    var rate = Math.round((count / 7) * 100);
    var textEl = document.getElementById('compliance-rate-text');
    var barEl = document.getElementById('compliance-rate-bar');

    if (textEl) textEl.textContent = rate + '%';
    if (barEl) barEl.style.width = rate + '%';

    var textColor, barColor;
    if (rate === 100) { textColor = 'text-green-600'; barColor = 'bg-green-500'; }
    else if (rate >= 80) { textColor = 'text-blue-600'; barColor = 'bg-blue-500'; }
    else if (rate >= 60) { textColor = 'text-yellow-600'; barColor = 'bg-yellow-500'; }
    else { textColor = 'text-red-600'; barColor = 'bg-red-500'; }

    if (textEl) textEl.className = 'text-lg font-bold ' + textColor;
    if (barEl) barEl.className = 'h-2 rounded-full transition-all duration-300 ' + barColor;
  },

  collectFormData: function() {
    var getVal = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var getChecked = function(id) { var el = document.getElementById(id); return el ? el.checked : false; };
    var getRadio = function(name) {
      var el = document.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    };

    var infectionSigns = {};
    document.querySelectorAll('.infection-check').forEach(function(cb) {
      infectionSigns[cb.dataset.sign] = cb.checked;
    });

    var clinicalActions = {};
    document.querySelectorAll('.action-check').forEach(function(cb) {
      clinicalActions[cb.dataset.action] = cb.checked;
    });

    var photoCompliance = {};
    document.querySelectorAll('.compliance-check').forEach(function(cb) {
      photoCompliance[cb.dataset.compliance] = cb.checked;
    });

    return {
      caseId: getVal('field-caseId'),
      date: getVal('field-date'),
      ageGroup: getVal('field-ageGroup'),
      gender: getRadio('gender'),
      diabetesDuration: getVal('field-diabetesDuration'),
      hba1c: getVal('field-hba1c'),
      location: getVal('field-location'),
      erythema: getVal('field-erythema'),
      exudate: getVal('field-exudate'),
      necrosis: getVal('field-necrosis'),
      granulation: getVal('field-granulation'),
      edema: getChecked('field-edema'),
      odor: getChecked('field-odor'),
      depth: getRadio('depth'),
      infectionSigns: infectionSigns,
      wagnerGrade: getRadio('wagnerGrade'),
      clinicalActions: clinicalActions,
      photoCompliance: photoCompliance
    };
  },

  save: function() {
    var self = this;
    var data = this.collectFormData();

    fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(response) {
      return response.json();
    }).then(function(result) {
      if (result.success) {
        if (result.is_valid) {
          showToast('標註儲存成功');
        } else {
          showToast('標註已儲存（' + result.errors.length + ' 個驗證警告）');
        }

        self.close();
      } else {
        showToast('儲存失敗: ' + (result.error || '未知錯誤'));
      }
    }).catch(function(err) {
      showToast('網路錯誤: ' + err.message);
    });
  }
};
