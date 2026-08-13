'use strict';

/**
 * Supabase 연동 (프로젝트: pension-tax-simulator)
 * anon/publishable key는 클라이언트에 노출되는 것이 설계상 정상이며,
 * 실제 접근 제어는 Supabase의 Row Level Security 정책으로 관리한다.
 * - tax_rules: anon 읽기만 허용 (수정은 대시보드 Table Editor에서만)
 * - consultation_logs: anon 쓰기(insert)만 허용, 조회는 대시보드에서만
 */
const SUPABASE_URL = 'https://cesimcvsmjebnrwieyca.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_nytzRIeZ1AFkUKrpZIkfLg_Ox4OEy-3';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * 세율·한도 값을 tax_rules 테이블에서 불러와 TAX_RULES에 덮어쓴다.
 * 운영담당자가 대시보드에서 값을 바꾸면 재배포 없이 다음 새로고침부터 반영된다.
 * 조회에 실패하면(오프라인 등) taxRules.js의 기본값을 그대로 사용한다.
 */
async function loadTaxRulesFromSupabase() {
  try {
    const { data, error } = await supabaseClient.from('tax_rules').select('*').eq('id', 1).single();
    if (error || !data) return;

    TAX_RULES.PENSION_SAVINGS_LIMIT = data.pension_savings_limit;
    TAX_RULES.COMBINED_LIMIT = data.combined_limit;
    TAX_RULES.SALARY_THRESHOLD = data.salary_threshold;
    TAX_RULES.BUSINESS_INCOME_THRESHOLD = data.business_income_threshold;
    TAX_RULES.DEDUCTION_RATE_LOW = data.deduction_rate_low;
    TAX_RULES.DEDUCTION_RATE_HIGH = data.deduction_rate_high;
    TAX_RULES.OTHER_INCOME_TAX_RATE = data.other_income_tax_rate;
    TAX_RULES.PRIVATE_PENSION_COMPREHENSIVE_THRESHOLD = data.private_pension_comprehensive_threshold;
    TAX_RULES.PENSION_INCOME_TAX_BRACKETS = [
      { minAge: 80, rate: data.pension_rate_80_plus },
      { minAge: 70, rate: data.pension_rate_70_79 },
      { minAge: 0, rate: data.pension_rate_under_70 },
    ];
  } catch (err) {
    console.warn('세율 정보를 Supabase에서 불러오지 못해 기본값을 사용합니다.', err);
  }
}

/**
 * 계산 결과를 상담 이력으로 남긴다 (익명 — 고객 식별정보는 담지 않는다).
 * 기록에 실패해도 계산기 사용에는 영향을 주지 않는다 (fire-and-forget).
 */
function logConsultation(calculatorType, input, result) {
  supabaseClient
    .from('consultation_logs')
    .insert({ calculator_type: calculatorType, input, result })
    .then(({ error }) => {
      if (error) console.warn('상담 이력 기록 실패:', error.message);
    });
}

loadTaxRulesFromSupabase();
