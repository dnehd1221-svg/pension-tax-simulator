'use strict';

// ===================== 공용 유틸 =====================

function formatWon(amount) {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

function formatPercent(rate) {
  return `${(rate * 100).toFixed(1)}%`;
}

// 숫자 스탯을 0에서 목표값까지 부드럽게 카운트업
function animateValue(el, to, formatFn, duration = 600) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatFn(to * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// empty-state를 감추고 결과 영역을 페이드인으로 드러낸다
function revealResult(cardId) {
  const card = document.getElementById(cardId);
  card.querySelector('.empty-state').hidden = true;
  const content = card.querySelector('.result-content');
  content.hidden = false;
  content.classList.remove('is-revealed');
  void content.offsetWidth;
  content.classList.add('is-revealed');
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.hidden = false;
}

function hideError(id) {
  const el = document.getElementById(id);
  el.hidden = true;
}

function getRadioValue(form, name) {
  return form.querySelector(`input[name="${name}"]:checked`).value;
}

// 금액 입력 필드: 입력하는 즉시 천단위 콤마를 붙여준다
function attachThousandsFormatting(input) {
  input.addEventListener('input', () => {
    const cursorPos = input.selectionStart;
    const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
    const digits = input.value.replace(/[^0-9]/g, '');
    input.value = digits === '' ? '' : Number(digits).toLocaleString('ko-KR');

    let seen = 0;
    let newPos = input.value.length;
    for (let i = 0; i < input.value.length; i++) {
      if (/[0-9]/.test(input.value[i])) seen++;
      if (seen === digitsBeforeCursor) { newPos = i + 1; break; }
    }
    if (digitsBeforeCursor === 0) newPos = 0;
    input.setSelectionRange(newPos, newPos);
  });
}

document.querySelectorAll('input[data-money]').forEach(attachThousandsFormatting);

// 콤마가 포함된 금액 입력값을 숫자로 변환 (빈 값은 NaN)
function parseMoneyInput(id) {
  const raw = document.getElementById(id).value.replace(/[^0-9]/g, '');
  return raw === '' ? NaN : Number(raw);
}

// ===================== 탭 전환 =====================

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      const isActive = panel.id === `tab-${target}`;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  });
});

// ===================== 툴팁 =====================

const tooltipEl = document.getElementById('tooltip');

function showTooltip(x, y, labelText, valueText) {
  tooltipEl.innerHTML = '';
  const value = document.createElement('div');
  value.className = 'tt-value';
  value.textContent = valueText;
  const label = document.createElement('div');
  label.className = 'tt-label';
  label.textContent = labelText;
  tooltipEl.appendChild(value);
  tooltipEl.appendChild(label);
  tooltipEl.hidden = false;
  const rect = tooltipEl.getBoundingClientRect();
  let left = x + 12;
  let top = y - rect.height - 12;
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 12;
  if (top < 8) top = y + 16;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

function hideTooltip() {
  tooltipEl.hidden = true;
}

// ===================== SVG 바 차트 =====================

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function roundedTopBarPath(x, y, w, h) {
  const r = Math.min(4, h / 2, w / 2);
  if (r <= 0) return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  return `M ${x} ${y + r}
          A ${r} ${r} 0 0 1 ${x + r} ${y}
          L ${x + w - r} ${y}
          A ${r} ${r} 0 0 1 ${x + w} ${y + r}
          L ${x + w} ${y + h}
          L ${x} ${y + h}
          Z`;
}

/**
 * 단일 시리즈 바 차트 렌더링 (범례 불필요: 제목이 시리즈를 설명)
 * items: [{ x: string, value: number }]
 */
function renderBarChart(container, items, opts = {}) {
  const { valueSuffix = '원', showValueLabels = false, xTickEvery = 1 } = opts;
  container.innerHTML = '';

  const width = 640;
  const height = 220;
  const margin = { top: 16, right: 12, bottom: 28, left: 64 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxValue = Math.max(...items.map((d) => d.value), 1) * 1.15;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'bar chart' });

  const g = svgEl('g', { transform: `translate(${margin.left},${margin.top})` });

  // gridlines + y ticks
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const v = (maxValue / tickCount) * i;
    const y = innerH - (v / maxValue) * innerH;
    g.appendChild(svgEl('line', { x1: 0, x2: innerW, y1: y, y2: y, class: 'chart-gridline' }));
    const label = svgEl('text', { x: -8, y: y + 4, class: 'chart-axis-label', 'text-anchor': 'end' });
    label.textContent = formatCompactWon(v);
    g.appendChild(label);
  }
  // baseline
  g.appendChild(svgEl('line', { x1: 0, x2: innerW, y1: innerH, y2: innerH, class: 'chart-baseline' }));

  const slotWidth = innerW / items.length;
  const barWidth = Math.min(24, slotWidth * 0.6);

  items.forEach((item, i) => {
    const barHeight = (item.value / maxValue) * innerH;
    const slotX = i * slotWidth;
    const barX = slotX + (slotWidth - barWidth) / 2;
    const barY = innerH - barHeight;

    // hit target: full slot, bigger than the bar itself
    const hit = svgEl('rect', { x: slotX, y: 0, width: slotWidth, height: innerH, fill: 'transparent' });
    const bar = svgEl('path', { d: roundedTopBarPath(barX, barY, barWidth, barHeight), class: 'chart-bar' });
    bar.style.transform = 'scaleY(0)';
    bar.style.transitionDelay = `${Math.min(i * 12, 240)}ms`;

    const onEnter = (evt) => {
      bar.classList.add('is-active');
      const point = evt.touches ? evt.touches[0] : evt;
      showTooltip(point.clientX, point.clientY, item.x, formatWon(item.value));
    };
    const onLeave = () => {
      bar.classList.remove('is-active');
      hideTooltip();
    };
    hit.addEventListener('pointermove', onEnter);
    hit.addEventListener('pointerenter', onEnter);
    hit.addEventListener('pointerleave', onLeave);
    hit.addEventListener('focus', onEnter);
    hit.addEventListener('blur', onLeave);
    hit.setAttribute('tabindex', '0');

    g.appendChild(bar);
    g.appendChild(hit);

    if (showValueLabels) {
      const valueLabel = svgEl('text', {
        x: barX + barWidth / 2, y: barY - 6, class: 'chart-value-label', 'text-anchor': 'middle',
      });
      valueLabel.textContent = formatCompactWon(item.value);
      g.appendChild(valueLabel);
    }

    if (i % xTickEvery === 0) {
      const xLabel = svgEl('text', {
        x: slotX + slotWidth / 2, y: innerH + 18, class: 'chart-axis-label', 'text-anchor': 'middle',
      });
      xLabel.textContent = item.x;
      g.appendChild(xLabel);
    }
  });

  svg.appendChild(g);
  container.appendChild(svg);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    g.querySelectorAll('.chart-bar').forEach((bar) => { bar.style.transform = 'scaleY(1)'; });
  }));
}

function formatCompactWon(amount) {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`;
  return Math.round(amount).toLocaleString('ko-KR');
}

// ===================== 탭 1: 세액공제 한도 =====================

document.getElementById('form-credit').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  hideError('error-credit');

  const incomeType = getRadioValue(form, 'incomeType');
  const incomeAmount = parseMoneyInput('incomeAmount');
  const pensionSavings = parseMoneyInput('pensionSavings');
  const irpAmount = parseMoneyInput('irpAmount');

  if ([incomeAmount, pensionSavings, irpAmount].some(Number.isNaN)) {
    showError('error-credit', '모든 항목에 숫자를 입력해 주세요.');
    return;
  }

  const result = calcTaxCredit({ incomeType, incomeAmount, pensionSavings, irp: irpAmount });

  animateValue(document.getElementById('credit-rate'), result.rate, formatPercent);
  animateValue(document.getElementById('credit-eligible'), result.eligibleAmount, formatWon);
  animateValue(document.getElementById('credit-amount'), result.credit, formatWon);

  const limitBadge = document.getElementById('credit-limit-badge');
  const overLimitEl = document.getElementById('credit-overlimit');
  if (result.overLimitAmount > 0) {
    limitBadge.textContent = '한도 초과분 있음';
    limitBadge.className = 'badge-pill badge-warning';
    overLimitEl.hidden = false;
    overLimitEl.textContent = `납입액 중 ${formatWon(result.overLimitAmount)}은 세액공제 한도를 초과하여 공제 대상에서 제외됩니다.`;
  } else {
    limitBadge.textContent = '한도 내 전액 공제 대상';
    limitBadge.className = 'badge-pill badge-good';
    overLimitEl.hidden = true;
  }

  document.getElementById('credit-basis').innerHTML = `
    <b>계산 근거</b><br>
    · 연금저축 단독 한도: ${formatWon(TAX_RULES.PENSION_SAVINGS_LIMIT)} / 연금저축+IRP 합산 한도: ${formatWon(TAX_RULES.COMBINED_LIMIT)}<br>
    · 공제율 판단 기준: ${incomeType === 'salary' ? `총급여 ${formatWon(TAX_RULES.SALARY_THRESHOLD)}` : `종합소득 ${formatWon(TAX_RULES.BUSINESS_INCOME_THRESHOLD)}`} 이하 16.5% / 초과 13.2%<br>
    · 세액공제 대상금액 = min(min(연금저축, 600만) + IRP, 900만) = ${formatWon(result.eligibleAmount)}<br>
    · 예상 절세액 = 대상금액 × 공제율 = ${formatWon(result.eligibleAmount)} × ${formatPercent(result.rate)} = ${formatWon(result.credit)}
  `;

  revealResult('result-credit');
  logConsultation('credit', { incomeType, incomeAmount, pensionSavings, irpAmount }, result);
});

// ===================== 탭 2: 중도인출 세금 =====================

const reasonRadios = document.querySelectorAll('#form-withdraw input[name="reason"]');
function toggleAgeField() {
  const reason = getRadioValue(document.getElementById('form-withdraw'), 'reason');
  document.getElementById('field-age-withdraw').style.display = reason === 'unavoidable' ? '' : 'none';
}
reasonRadios.forEach((r) => r.addEventListener('change', toggleAgeField));
toggleAgeField();

document.getElementById('form-withdraw').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  hideError('error-withdraw');

  const reason = getRadioValue(form, 'reason');
  const age = Number(document.getElementById('ageWithdraw').value);
  const totalContribution = parseMoneyInput('totalContribution');
  const creditClaimedAmount = parseMoneyInput('creditClaimedAmount');
  const currentValuation = parseMoneyInput('currentValuation');

  if (reason === 'unavoidable' && (Number.isNaN(age) || age <= 0)) {
    showError('error-withdraw', '부득이한 사유는 인출 시점의 나이를 입력해야 세율을 계산할 수 있습니다.');
    return;
  }
  if ([totalContribution, creditClaimedAmount, currentValuation].some(Number.isNaN)) {
    showError('error-withdraw', '총 납입액, 세액공제 신청 누적액, 현재 평가금액에 숫자를 입력해 주세요.');
    return;
  }

  const composition = deriveWithdrawalComposition({ totalContribution, creditClaimedAmount, currentValuation });
  const result = calcWithdrawalTax({
    reason, age, taxableAmount: composition.taxableAmount, taxFreeAmount: composition.taxFreeAmount,
  });

  const reasonBadge = document.getElementById('withdraw-reason-badge');
  if (reason === 'unavoidable') {
    reasonBadge.textContent = `연금소득세 저율 적용 (${formatPercent(result.rate)})`;
    reasonBadge.className = 'badge-pill badge-teal';
  } else {
    reasonBadge.textContent = `기타소득세 적용 (${formatPercent(result.rate)})`;
    reasonBadge.className = 'badge-pill badge-warning';
  }

  document.getElementById('withdraw-tax-label').textContent = `${result.taxLabel} (${formatPercent(result.rate)})`;
  animateValue(document.getElementById('withdraw-total'), result.totalWithdrawal, formatWon);
  animateValue(document.getElementById('withdraw-tax'), result.tax, formatWon);
  animateValue(document.getElementById('withdraw-net'), result.netAmount, formatWon);

  document.getElementById('withdraw-composition').innerHTML = `
    · 비과세 (세액공제 안 받은 원금) = 총 납입액 − 세액공제 신청액 = ${formatWon(totalContribution)} − ${formatWon(composition.creditClaimedCapped)} = <b>${formatWon(composition.taxFreeAmount)}</b><br>
    · 과세대상 (세액공제 받은 원금 + 운용수익) = ${formatWon(composition.creditClaimedCapped)} + ${formatWon(composition.gains)} = <b>${formatWon(composition.taxableAmount)}</b>
  `;

  const compositionNoteEl = document.getElementById('withdraw-composition-note');
  if (composition.wasCreditCapped) {
    compositionNoteEl.hidden = false;
    compositionNoteEl.textContent = '세액공제 신청 누적액이 총 납입액보다 커서 총 납입액만큼만 인정해 계산했습니다. 입력값을 다시 확인해 주세요.';
  } else if (composition.hasLoss) {
    compositionNoteEl.hidden = false;
    compositionNoteEl.textContent = '현재 평가금액이 총 납입액보다 낮아(손실) 손실 비율만큼 비과세·과세 금액을 비례 축소해 계산했습니다.';
  } else {
    compositionNoteEl.hidden = true;
  }

  document.getElementById('withdraw-basis').innerHTML = `
    <b>계산 근거</b><br>
    · 인출 사유: ${TAX_RULES.WITHDRAWAL_REASONS[reason].label}<br>
    · 적용 세목/세율: ${result.taxLabel} ${formatPercent(result.rate)}${reason === 'unavoidable' ? ` (나이 ${age}세 기준 연금소득세율)` : ' (기타소득세, 지방소득세 포함)'}<br>
    · 비과세금액(세액공제 미청구 원금)은 과세 대상에서 제외됩니다.<br>
    · 세금 = 과세대상금액 × 세율 = ${formatWon(composition.taxableAmount)} × ${formatPercent(result.rate)} = ${formatWon(result.tax)}<br>
    · 실수령액 = 총 인출금액 − 세금 = ${formatWon(result.totalWithdrawal)} − ${formatWon(result.tax)} = ${formatWon(result.netAmount)}
  `;

  revealResult('result-withdraw');
  logConsultation('withdraw', { reason, age, totalContribution, creditClaimedAmount, currentValuation }, result);
});

// ===================== 탭 3: 연금수령 시뮬레이션 =====================

document.getElementById('form-pension').addEventListener('submit', (e) => {
  e.preventDefault();
  hideError('error-pension');

  const startAge = Number(document.getElementById('startAge').value);
  const years = Number(document.getElementById('years').value);
  const totalAsset = parseMoneyInput('totalAsset');
  const isLifetime = document.getElementById('isLifetime').checked;

  if (Number.isNaN(startAge) || startAge < 55) {
    showError('error-pension', '연금수령 개시 나이는 55세 이상이어야 세제혜택이 적용됩니다.');
    return;
  }
  if (Number.isNaN(years) || years < 1) {
    showError('error-pension', '수령 기간은 1년 이상으로 입력해 주세요.');
    return;
  }
  if (Number.isNaN(totalAsset)) {
    showError('error-pension', '연금계좌 평가금액에 숫자를 입력해 주세요.');
    return;
  }

  const sim = simulatePensionPayout({ startAge, years, totalAsset });
  const effRate = sim.totalGross > 0 ? sim.totalTax / sim.totalGross : 0;
  const grossAnnual = sim.totalGross / years;

  const comprehensiveNoteEl = document.getElementById('pension-comprehensive-note');
  if (grossAnnual > TAX_RULES.PRIVATE_PENSION_COMPREHENSIVE_THRESHOLD) {
    comprehensiveNoteEl.hidden = false;
    comprehensiveNoteEl.textContent = `연간 세전 수령액(${formatWon(grossAnnual)})이 사적연금 종합과세 기준(${formatWon(TAX_RULES.PRIVATE_PENSION_COMPREHENSIVE_THRESHOLD)})을 초과합니다. 다른 소득과 합산해 종합소득세로 과세될 수 있어 실제 세액이 이 계산과 달라질 수 있습니다.`;
  } else {
    comprehensiveNoteEl.hidden = true;
  }

  document.getElementById('pension-lifetime-badge').hidden = !isLifetime;
  animateValue(document.getElementById('pension-gross'), sim.totalGross, formatWon);
  animateValue(document.getElementById('pension-tax'), sim.totalTax, formatWon);
  animateValue(document.getElementById('pension-net'), sim.totalNet, formatWon);
  animateValue(document.getElementById('pension-effrate'), effRate, formatPercent);

  // 연차별 차트
  const yearlyItems = sim.rows.map((r) => ({ x: `${r.year}년차`, value: r.net }));
  const xTickEvery = years > 15 ? Math.ceil(years / 10) : 1;
  renderBarChart(document.getElementById('chart-yearly'), yearlyItems, { xTickEvery });

  // 수령기간별 비교 차트
  const periods = [5, 10, 15, 20, 30].filter((p) => p !== years).concat([years]).sort((a, b) => a - b);
  const comparison = comparePayoutPeriods({ startAge, totalAsset, periods });
  const periodItems = comparison.map((c) => ({ x: `${c.years}년`, value: c.totalNet }));
  renderBarChart(document.getElementById('chart-periods'), periodItems, { showValueLabels: true });

  // 상세 테이블
  const tbody = document.querySelector('#pension-table tbody');
  tbody.innerHTML = '';
  sim.rows.forEach((r) => {
    const tr = document.createElement('tr');
    [
      `${r.year}`,
      `${r.age}세`,
      formatPercent(r.rate),
      formatWon(r.gross),
      formatWon(r.tax),
      formatWon(r.net),
    ].forEach((text) => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById('pension-basis').innerHTML = `
    <b>계산 근거</b><br>
    · 연금소득세율(나이 기준): 55~69세 5.5% / 70~79세 4.4% / 80세 이상 3.3%<br>
    · 연간 세전 수령액 = 평가금액 ÷ 수령기간 = ${formatWon(totalAsset)} ÷ ${years}년 = ${formatWon(grossAnnual)} (균등수령 가정)<br>
    · 실효세율 = 총세금 ÷ 총세전수령액 = ${formatPercent(effRate)}<br>
    · 사적연금 종합과세 기준: 연간 수령액이 ${formatWon(TAX_RULES.PRIVATE_PENSION_COMPREHENSIVE_THRESHOLD)}을 초과하면 다른 소득과 합산해 종합소득세로 과세될 수 있습니다.${isLifetime ? '<br>· 종신형 연금은 연금수령한도 초과분도 저율 연금소득세가 유지되나, 본 시뮬레이터는 한도 초과 여부는 계산하지 않습니다.' : ''}
  `;

  revealResult('result-pension');
  logConsultation('pension', { startAge, years, totalAsset, isLifetime }, {
    totalGross: sim.totalGross, totalTax: sim.totalTax, totalNet: sim.totalNet, effRate,
  });
});
