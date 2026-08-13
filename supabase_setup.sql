-- ============================================================
-- 연금 세제혜택·수령액 시뮬레이터 — Supabase 스키마 설정
-- Supabase 대시보드 → SQL Editor → New query 에 전체 붙여넣고 Run
-- ============================================================

-- 1) 세율·한도 값 (운영담당자가 Table Editor에서 직접 수정하는 단일 행 설정 테이블)
create table if not exists tax_rules (
  id int primary key default 1,
  pension_savings_limit bigint not null default 6000000,
  combined_limit bigint not null default 9000000,
  salary_threshold bigint not null default 55000000,
  business_income_threshold bigint not null default 45000000,
  deduction_rate_low numeric not null default 0.165,
  deduction_rate_high numeric not null default 0.132,
  other_income_tax_rate numeric not null default 0.165,
  pension_rate_under_70 numeric not null default 0.055,
  pension_rate_70_79 numeric not null default 0.044,
  pension_rate_80_plus numeric not null default 0.033,
  private_pension_comprehensive_threshold bigint not null default 15000000,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into tax_rules (id) values (1) on conflict (id) do nothing;

alter table tax_rules enable row level security;

drop policy if exists "public can read tax rules" on tax_rules;
create policy "public can read tax rules"
  on tax_rules for select
  to anon, authenticated
  using (true);
-- insert/update/delete 정책을 만들지 않음 -> 앱(anon key)에서는 수정 불가,
-- 운영담당자가 Supabase 대시보드 Table Editor에서만 값을 바꿀 수 있음

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tax_rules_updated_at on tax_rules;
create trigger tax_rules_updated_at
  before update on tax_rules
  for each row execute function set_updated_at();


-- 2) 상담 계산 이력 (익명 — 고객 식별정보 없음, 입력값+결과값만 기록)
create table if not exists consultation_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  calculator_type text not null check (calculator_type in ('credit', 'withdraw', 'pension')),
  input jsonb not null,
  result jsonb not null
);

alter table consultation_logs enable row level security;

drop policy if exists "anyone can insert a log" on consultation_logs;
create policy "anyone can insert a log"
  on consultation_logs for insert
  to anon, authenticated
  with check (true);
-- select 정책을 만들지 않음 -> 앱(anon key)에서는 남이 남긴 이력을 읽을 수 없음,
-- 운영담당자가 Supabase 대시보드 Table Editor에서만 조회 가능
