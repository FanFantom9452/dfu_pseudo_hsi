// Risk Gauge, HbO2 Chart, and Prediction Chart rendering using safe DOM methods

function renderHbO2Chart(hbo2Offset, containerId) {
  var container = document.getElementById(containerId || 'hbo2-chart-container');
  if (!container) return;

  while (container.firstChild) container.removeChild(container.firstChild);

  // Determine status
  var status, statusEn, color, bgColor, borderColor, interpretation;
  if (hbo2Offset < -0.1) {
    status = '缺血'; statusEn = 'Ischemia'; color = '#dc2626';
    bgColor = '#fee2e2'; borderColor = 'rgba(220,38,38,0.25)';
    interpretation = '低血氧，組織缺血風險';
  } else if (hbo2Offset < 0) {
    status = '輕度缺氧'; statusEn = 'Mild Hypoxia'; color = '#f59e0b';
    bgColor = '#fef3c7'; borderColor = 'rgba(245,158,11,0.25)';
    interpretation = '組織氧合偏低';
  } else if (hbo2Offset < 0.1) {
    status = '正常'; statusEn = 'Normal'; color = '#10b981';
    bgColor = '#d1fae5'; borderColor = 'rgba(16,185,129,0.25)';
    interpretation = '組織氧合正常';
  } else {
    status = '發炎充血'; statusEn = 'Inflammation'; color = '#f97316';
    bgColor = '#ffedd5'; borderColor = 'rgba(249,115,22,0.25)';
    interpretation = '局部充血，可能發炎';
  }

  var minOffset = -0.3, maxOffset = 0.3;
  var normalizedPosition = ((hbo2Offset - minOffset) / (maxOffset - minOffset)) * 100;
  normalizedPosition = Math.max(0, Math.min(100, normalizedPosition));
  var valueStr = (hbo2Offset > 0 ? '+' : '') + hbo2Offset.toFixed(3);
  var metabolism = hbo2Offset < 0 ? '降低' : (hbo2Offset > 0.1 ? '升高' : '正常');
  var perfusion = hbo2Offset < -0.1 ? '不良' : (hbo2Offset < 0 ? '偏弱' : (hbo2Offset > 0.1 ? '充血' : '良好'));

  function el(tag, cls, styles) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (styles) { for (var k in styles) e.style[k] = styles[k]; }
    return e;
  }

  var wrapper = el('div', 'w-full space-y-4');

  // 1. Status Header
  var header = el('div', 'flex items-start justify-between gap-2');

  var headerLeft = el('div', 'flex items-start gap-2 flex-1 min-w-0');
  var dot = el('div', 'w-3 h-3 rounded-full flex-shrink-0 mt-0.5', { backgroundColor: color });
  headerLeft.appendChild(dot);

  var labelWrap = el('div', 'flex-1 min-w-0');
  var labelRow = el('div', 'flex items-baseline gap-2 flex-wrap');
  var statusSpan = el('span', 'font-bold text-gray-800 text-base');
  statusSpan.textContent = status;
  var statusEnSpan = el('span', 'text-xs text-gray-500');
  statusEnSpan.textContent = '(' + statusEn + ')';
  labelRow.appendChild(statusSpan);
  labelRow.appendChild(statusEnSpan);
  labelWrap.appendChild(labelRow);
  headerLeft.appendChild(labelWrap);
  header.appendChild(headerLeft);

  var headerRight = el('div', 'flex-shrink-0');
  var valSpan = el('span', 'text-sm font-mono font-bold whitespace-nowrap', { color: color });
  valSpan.textContent = valueStr;
  headerRight.appendChild(valSpan);
  header.appendChild(headerRight);
  wrapper.appendChild(header);

  // 2. Visual Scale
  var scaleWrap = el('div', 'relative pt-8');

  var marker = el('div', 'absolute top-0 h-6 w-0.5 bg-gray-800 z-10', {
    left: 'calc(' + normalizedPosition + '% - 1px)',
    transition: 'all 0.5s'
  });
  var tooltip = el('div', 'absolute -top-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded shadow-lg whitespace-nowrap font-mono');
  tooltip.textContent = valueStr;
  marker.appendChild(tooltip);
  scaleWrap.appendChild(marker);

  var bar = el('div', 'h-6 rounded-lg overflow-hidden opacity-40 shadow-inner', {
    background: 'linear-gradient(to right, #ef4444 0%, #fbbf24 30%, #10b981 50%, #fbbf24 70%, #f97316 100%)'
  });
  scaleWrap.appendChild(bar);

  var labels = el('div', 'flex items-center justify-between mt-1 text-xs text-gray-500 font-mono');
  var lbl1 = el('span'); lbl1.textContent = '-0.3';
  var lbl2 = el('span', 'text-green-600 font-bold'); lbl2.textContent = '0.0';
  var lbl3 = el('span'); lbl3.textContent = '+0.3';
  labels.appendChild(lbl1);
  labels.appendChild(lbl2);
  labels.appendChild(lbl3);
  scaleWrap.appendChild(labels);
  wrapper.appendChild(scaleWrap);

  // 3. Interpretation box
  var interpBox = el('div', 'p-3 rounded-lg border', { backgroundColor: bgColor, borderColor: borderColor });
  var interpP = el('p', 'text-sm text-gray-700 leading-relaxed');
  var interpBold = el('span', 'font-semibold');
  interpBold.textContent = '臨床解讀：';
  interpP.appendChild(interpBold);
  interpP.appendChild(document.createTextNode(interpretation));
  interpBox.appendChild(interpP);
  wrapper.appendChild(interpBox);

  // 4. Technical info grid
  var grid = el('div', 'grid grid-cols-2 gap-2 text-xs');

  var cell1 = el('div', 'bg-gray-50 p-2.5 rounded-lg');
  var cell1Label = el('div', 'text-gray-500 mb-1');
  cell1Label.textContent = '深層組織代謝';
  var cell1Val = el('div', 'font-semibold text-gray-700');
  cell1Val.textContent = metabolism;
  cell1.appendChild(cell1Label);
  cell1.appendChild(cell1Val);

  var cell2 = el('div', 'bg-gray-50 p-2.5 rounded-lg');
  var cell2Label = el('div', 'text-gray-500 mb-1');
  cell2Label.textContent = '灌流狀態';
  var cell2Val = el('div', 'font-semibold text-gray-700');
  cell2Val.textContent = perfusion;
  cell2.appendChild(cell2Label);
  cell2.appendChild(cell2Val);

  grid.appendChild(cell1);
  grid.appendChild(cell2);
  wrapper.appendChild(grid);

  container.appendChild(wrapper);
}

function renderRiskGauge(score, containerId) {
  var container = document.getElementById(containerId || 'risk-gauge-container');
  if (!container) return;

  var radius = 80;
  var stroke = 12;
  var cx = 100;
  var cy = 100;
  var normalizedScore = Math.min(Math.max(score, 0), 100);

  var riskLabel, riskColorClass, riskBgClass, riskBorderClass;
  if (score < 40) {
    riskLabel = '低風險';
    riskColorClass = 'text-green-600';
    riskBgClass = 'bg-green-50';
    riskBorderClass = 'border-green-200';
  } else if (score < 70) {
    riskLabel = '中風險';
    riskColorClass = 'text-amber-600';
    riskBgClass = 'bg-amber-50';
    riskBorderClass = 'border-amber-200';
  } else {
    riskLabel = '高風險';
    riskColorClass = 'text-red-600';
    riskBgClass = 'bg-red-50';
    riskBorderClass = 'border-red-200';
  }

  // Clear container
  while (container.firstChild) container.removeChild(container.firstChild);

  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '120');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.style.display = 'block';
  svg.style.margin = '0 auto';

  // Gradient definition
  var defs = document.createElementNS(ns, 'defs');
  var grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', 'riskGradient');
  grad.setAttribute('x1', '0%');
  grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%');
  grad.setAttribute('y2', '0%');

  var colors = [
    { offset: '0%', color: '#10b981' },
    { offset: '50%', color: '#f59e0b' },
    { offset: '100%', color: '#ef4444' }
  ];
  colors.forEach(function(c) {
    var stop = document.createElementNS(ns, 'stop');
    stop.setAttribute('offset', c.offset);
    stop.setAttribute('stop-color', c.color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  // Arc endpoints
  var startX = cx - radius;
  var endXFull = cx + radius;

  // Background arc: full semicircle from left to right, curving upward
  var bgPath = document.createElementNS(ns, 'path');
  bgPath.setAttribute('d',
    'M ' + startX + ',' + cy +
    ' A ' + radius + ',' + radius + ' 0 0,1 ' + endXFull + ',' + cy
  );
  bgPath.setAttribute('fill', 'none');
  bgPath.setAttribute('stroke', '#e5e7eb');
  bgPath.setAttribute('stroke-width', String(stroke));
  bgPath.setAttribute('stroke-linecap', 'round');
  svg.appendChild(bgPath);

  // Foreground arc: partial based on score
  if (normalizedScore > 0) {
    var endAngle = Math.PI * (1 - normalizedScore / 100);
    var endX = cx + radius * Math.cos(endAngle);
    var endY = cy - radius * Math.sin(endAngle);
    var largeArc = 0;

    var fgPath = document.createElementNS(ns, 'path');
    fgPath.setAttribute('d',
      'M ' + startX + ',' + cy +
      ' A ' + radius + ',' + radius + ' 0 ' + largeArc + ',1 ' +
      endX.toFixed(1) + ',' + endY.toFixed(1)
    );
    fgPath.setAttribute('fill', 'none');
    fgPath.setAttribute('stroke', 'url(#riskGradient)');
    fgPath.setAttribute('stroke-width', String(stroke));
    fgPath.setAttribute('stroke-linecap', 'round');
    svg.appendChild(fgPath);
  }

  // Score text rendered inside SVG for precise centering
  var scoreText = document.createElementNS(ns, 'text');
  scoreText.setAttribute('x', String(cx));
  scoreText.setAttribute('y', '70');
  scoreText.setAttribute('text-anchor', 'middle');
  scoreText.setAttribute('dominant-baseline', 'central');
  scoreText.setAttribute('font-size', '36');
  scoreText.setAttribute('font-weight', '700');
  scoreText.setAttribute('fill', '#1f2937');
  scoreText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
  // Display as X.X/10
  var displayScore = (score / 10).toFixed(1);
  scoreText.textContent = displayScore;
  svg.appendChild(scoreText);

  // "/10" suffix
  var suffixText = document.createElementNS(ns, 'text');
  suffixText.setAttribute('x', String(cx + 30));
  suffixText.setAttribute('y', '70');
  suffixText.setAttribute('text-anchor', 'start');
  suffixText.setAttribute('dominant-baseline', 'central');
  suffixText.setAttribute('font-size', '14');
  suffixText.setAttribute('fill', '#9ca3af');
  suffixText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
  suffixText.textContent = '/10';
  svg.appendChild(suffixText);

  var labelText = document.createElementNS(ns, 'text');
  labelText.setAttribute('x', String(cx));
  labelText.setAttribute('y', '90');
  labelText.setAttribute('text-anchor', 'middle');
  labelText.setAttribute('dominant-baseline', 'central');
  labelText.setAttribute('font-size', '11');
  labelText.setAttribute('fill', '#6b7280');
  labelText.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
  labelText.textContent = '風險指數';
  svg.appendChild(labelText);

  container.appendChild(svg);

  // Risk level badge
  var badge = document.createElement('div');
  badge.className = 'mt-2 text-sm font-semibold ' + riskColorClass + ' ' + riskBgClass + ' px-4 py-1.5 rounded-full border ' + riskBorderClass;
  badge.textContent = riskLabel;
  container.appendChild(badge);
}

function renderPredictionChart(containerId) {
  var container = document.getElementById(containerId || 'prediction-chart-container');
  if (!container) return;

  while (container.firstChild) container.removeChild(container.firstChild);

  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 300 150');
  svg.setAttribute('class', 'w-full h-full overflow-visible');

  // Grid lines
  var line1 = document.createElementNS(ns, 'line');
  line1.setAttribute('x1', '0'); line1.setAttribute('y1', '130');
  line1.setAttribute('x2', '300'); line1.setAttribute('y2', '130');
  line1.setAttribute('stroke', '#e5e7eb'); line1.setAttribute('stroke-width', '1');
  svg.appendChild(line1);

  var line2 = document.createElementNS(ns, 'line');
  line2.setAttribute('x1', '0'); line2.setAttribute('y1', '70');
  line2.setAttribute('x2', '300'); line2.setAttribute('y2', '70');
  line2.setAttribute('stroke', '#e5e7eb'); line2.setAttribute('stroke-width', '1');
  svg.appendChild(line2);

  // Curve
  var curve = document.createElementNS(ns, 'path');
  curve.setAttribute('d', 'M0,120 Q50,115 100,100 T200,60 T300,20');
  curve.setAttribute('fill', 'none');
  curve.setAttribute('stroke', '#ef4444');
  curve.setAttribute('stroke-width', '3');
  curve.setAttribute('stroke-linecap', 'round');
  svg.appendChild(curve);

  // Fill area
  var fill = document.createElementNS(ns, 'path');
  fill.setAttribute('d', 'M0,120 Q50,115 100,100 T200,60 T300,20 V130 H0 Z');
  fill.setAttribute('fill', '#ef4444');
  fill.setAttribute('fill-opacity', '0.1');
  svg.appendChild(fill);

  // Current point
  var circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '100'); circle.setAttribute('cy', '100');
  circle.setAttribute('r', '4'); circle.setAttribute('fill', '#ef4444');
  circle.setAttribute('stroke', 'white'); circle.setAttribute('stroke-width', '2');
  svg.appendChild(circle);

  // Tooltip
  var rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', '80'); rect.setAttribute('y', '75');
  rect.setAttribute('width', '40'); rect.setAttribute('height', '20');
  rect.setAttribute('rx', '4'); rect.setAttribute('fill', '#1f2937');
  svg.appendChild(rect);

  var text = document.createElementNS(ns, 'text');
  text.setAttribute('x', '100'); text.setAttribute('y', '89');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'white');
  text.setAttribute('font-size', '10');
  text.textContent = 'Today';
  svg.appendChild(text);

  // X-axis labels
  var labels = [
    { x: '0', anchor: 'start', text: 'Week 1' },
    { x: '140', anchor: 'middle', text: 'Week 4' },
    { x: '280', anchor: 'end', text: 'Week 8' }
  ];
  labels.forEach(function(l) {
    var t = document.createElementNS(ns, 'text');
    t.setAttribute('x', l.x);
    t.setAttribute('y', '145');
    t.setAttribute('font-size', '10');
    t.setAttribute('fill', '#9ca3af');
    t.setAttribute('text-anchor', l.anchor);
    t.textContent = l.text;
    svg.appendChild(t);
  });

  container.appendChild(svg);

  // Legend
  var legend = document.createElement('div');
  legend.className = 'absolute top-2 right-2 flex items-center gap-1';

  var dot = document.createElement('div');
  dot.className = 'w-2 h-2 rounded-full bg-red-500';
  legend.appendChild(dot);

  var legendText = document.createElement('span');
  legendText.className = 'text-xs text-gray-500';
  legendText.textContent = '癒合預測機率';
  legend.appendChild(legendText);

  container.appendChild(legend);
}
