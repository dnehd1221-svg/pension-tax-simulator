/**
 * 세율·한도 상수 모음 (2026년 기준, 참고용)
 *
 * 세법 개정 시 이 파일의 값만 수정하면 전체 계산기에 반영됩니다.
 * 근거: 소득세법 제20조의3, 제59조의3, 소득세법 시행령 제40조의2 등
 * (실제 적용 전 반드시 국세청 공식 자료로 최신 여부를 확인하세요.)
 */

const TAX_RULES = {
  // ---- 세액공제 한도 (연금저축·IRP) ----
  PENSION_SAVINGS_LIMIT: 6_000_000,   // 연금저축 단독 세액공제 대상 납입한도 (연)
  COMBINED_LIMIT: 9_000_000,          // 연금저축+IRP 합산 세액공제 대상 납입한도 (연)

  // 공제율 판단 기준 소득
  SALARY_THRESHOLD: 55_000_000,       // 총급여 기준
  BUSINESS_INCOME_THRESHOLD: 45_000_000, // 종합소득금액 기준

  DEDUCTION_RATE_LOW: 0.165,   // 기준 이하 (지방소득세 포함, 16.5%)
  DEDUCTION_RATE_HIGH: 0.132,  // 기준 초과 (지방소득세 포함, 13.2%)

  // ---- 중도인출(연금외수령) 세금 ----
  OTHER_INCOME_TAX_RATE: 0.165, // 일반 사유 인출 시 기타소득세 (지방소득세 포함)

  // ---- 연금소득세율 (연금수령 및 부득이한 사유 인출 공통 적용, 나이 기준) ----
  PENSION_INCOME_TAX_BRACKETS: [
    { minAge: 80, rate: 0.033 }, // 80세 이상: 3.3%
    { minAge: 70, rate: 0.044 }, // 70세~79세: 4.4%
    { minAge: 0, rate: 0.055 },  // 55세~69세(그 외): 5.5%
  ],

  WITHDRAWAL_REASONS: {
    general: { label: '일반 사유', taxType: 'other' },
    unavoidable: { label: '부득이한 사유(요양·개인회생·파산·해외이주·사망·천재지변 등)', taxType: 'pension' },
  },
};

/** 총급여/종합소득 구간에 따른 세액공제율 반환 */
function getDeductionRate(incomeType, incomeAmount) {
  const threshold = incomeType === 'salary'
    ? TAX_RULES.SALARY_THRESHOLD
    : TAX_RULES.BUSINESS_INCOME_THRESHOLD;
  return incomeAmount <= threshold
    ? TAX_RULES.DEDUCTION_RATE_LOW
    : TAX_RULES.DEDUCTION_RATE_HIGH;
}

/** 나이에 따른 연금소득세율 반환 */
function getPensionIncomeTaxRate(age) {
  for (const bracket of TAX_RULES.PENSION_INCOME_TAX_BRACKETS) {
    if (age >= bracket.minAge) return bracket.rate;
  }
  return TAX_RULES.PENSION_INCOME_TAX_BRACKETS.at(-1).rate;
}

/** 세액공제 한도·예상 절세액 계산 */
function calcTaxCredit({ incomeType, incomeAmount, pensionSavings, irp }) {
  const rate = getDeductionRate(incomeType, incomeAmount);
  const pensionSavingsCapped = Math.min(pensionSavings, TAX_RULES.PENSION_SAVINGS_LIMIT);
  const eligibleAmount = Math.min(pensionSavingsCapped + irp, TAX_RULES.COMBINED_LIMIT);
  const credit = Math.round(eligibleAmount * rate);
  const totalContribution = pensionSavings + irp;
  const overLimitAmount = Math.max(totalContribution - eligibleAmount, 0);
  return { rate, pensionSavingsCapped, eligibleAmount, credit, totalContribution, overLimitAmount };
}

/**
 * 총 납입액·세액공제 신청 누적액·현재 평가금액으로부터 과세대상/비과세 구성을 역산한다.
 * 연금계좌 인출 시 세액공제받은 원금+운용수익은 과세대상, 공제받지 않은 원금은 비과세로 구분된다.
 * 평가금액이 납입액보다 낮은 경우(손실)에는 손실 비율만큼 두 금액을 비례 축소해
 * (비과세+과세대상 = 현재 평가금액)이 항상 성립하도록 한다.
 */
function deriveWithdrawalComposition({ totalContribution, creditClaimedAmount, currentValuation }) {
  const wasCreditCapped = creditClaimedAmount > totalContribution;
  const creditClaimedCapped = Math.min(Math.max(creditClaimedAmount, 0), totalContribution);
  const gains = Math.max(currentValuation - totalContribution, 0);
  const hasLoss = currentValuation < totalContribution;

  let taxFreeAmount = totalContribution - creditClaimedCapped;
  let taxableAmount = creditClaimedCapped + gains;

  if (hasLoss && totalContribution > 0) {
    const scale = currentValuation / totalContribution;
    taxFreeAmount *= scale;
    taxableAmount = creditClaimedCapped * scale;
  }

  return { taxFreeAmount, taxableAmount, gains, creditClaimedCapped, wasCreditCapped, hasLoss };
}

/** 중도인출 세금 계산 */
function calcWithdrawalTax({ reason, age, taxableAmount, taxFreeAmount }) {
  const reasonInfo = TAX_RULES.WITHDRAWAL_REASONS[reason];
  const rate = reasonInfo.taxType === 'other'
    ? TAX_RULES.OTHER_INCOME_TAX_RATE
    : getPensionIncomeTaxRate(age);
  const taxLabel = reasonInfo.taxType === 'other' ? '기타소득세' : '연금소득세';
  const tax = Math.round(taxableAmount * rate);
  const totalWithdrawal = taxableAmount + taxFreeAmount;
  const netAmount = totalWithdrawal - tax;
  return { rate, taxLabel, tax, totalWithdrawal, netAmount };
}

/** 연금수령 시나리오 시뮬레이션 (균등수령 가정) */
function simulatePensionPayout({ startAge, years, totalAsset }) {
  const grossAnnual = years > 0 ? totalAsset / years : 0;
  const rows = [];
  let totalGross = 0;
  let totalTax = 0;
  for (let i = 0; i < years; i++) {
    const age = startAge + i;
    const rate = getPensionIncomeTaxRate(age);
    const tax = grossAnnual * rate;
    const net = grossAnnual - tax;
    rows.push({ year: i + 1, age, rate, gross: grossAnnual, tax, net });
    totalGross += grossAnnual;
    totalTax += tax;
  }
  return { rows, totalGross, totalTax, totalNet: totalGross - totalTax };
}

/** 수령기간별 총 세후수령액 비교 */
function comparePayoutPeriods({ startAge, totalAsset, periods }) {
  return periods.map((years) => {
    const sim = simulatePensionPayout({ startAge, years, totalAsset });
    return { years, totalGross: sim.totalGross, totalTax: sim.totalTax, totalNet: sim.totalNet };
  });
}
