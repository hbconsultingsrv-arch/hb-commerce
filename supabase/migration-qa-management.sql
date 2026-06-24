-- Module QA — exigences, plan de test, exécutions, rapports
-- Exécuter après schema.sql principal

create table if not exists public.qa_requirements (
  id uuid default gen_random_uuid() primary key,
  req_id text not null unique,
  name text not null,
  description text default '',
  priority text not null default 'Moyenne' check (priority in ('Critique', 'Haute', 'Moyenne', 'Basse')),
  category text not null default 'Fonctionnel',
  dev_status text not null default 'non_commence' check (
    dev_status in ('non_commence', 'en_cours', 'developpe', 'valide')
  ),
  owner text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.qa_test_cases (
  id uuid default gen_random_uuid() primary key,
  test_id text not null unique,
  requirement_id uuid references public.qa_requirements(id) on delete set null,
  req_ref text,
  title text not null,
  description text default '',
  preconditions text default '',
  steps text default '',
  expected_result text default '',
  test_type text not null default 'manuel' check (test_type in ('manuel', 'automatique')),
  priority text not null default 'Moyenne' check (priority in ('Critique', 'Haute', 'Moyenne', 'Basse')),
  status text not null default 'non_execute' check (
    status in ('non_execute', 'succes', 'echec', 'bloque')
  ),
  playwright_file text,
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.qa_test_runs (
  id uuid default gen_random_uuid() primary key,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'cancelled')),
  total_tests int default 0,
  passed_tests int default 0,
  failed_tests int default 0,
  skipped_tests int default 0,
  duration_ms int default 0,
  success_rate numeric(5,2) default 0,
  triggered_by uuid references auth.users(id) on delete set null,
  report_json jsonb default '{}'::jsonb
);

create table if not exists public.qa_test_executions (
  id uuid default gen_random_uuid() primary key,
  run_id uuid references public.qa_test_runs(id) on delete cascade,
  test_case_id uuid references public.qa_test_cases(id) on delete set null,
  test_id text,
  status text not null check (status in ('succes', 'echec', 'bloque', 'skipped')),
  duration_ms int default 0,
  error_message text,
  executed_at timestamptz default now()
);

create index if not exists idx_qa_tests_requirement on public.qa_test_cases(requirement_id);
create index if not exists idx_qa_tests_req_ref on public.qa_test_cases(req_ref);
create index if not exists idx_qa_executions_run on public.qa_test_executions(run_id);

alter table public.qa_requirements enable row level security;
alter table public.qa_test_cases enable row level security;
alter table public.qa_test_runs enable row level security;
alter table public.qa_test_executions enable row level security;

-- Lecture : backoffice
create policy "qa_requirements_select_backoffice" on public.qa_requirements
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

create policy "qa_requirements_write_admin" on public.qa_requirements
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root')
    )
  );

create policy "qa_test_cases_select_backoffice" on public.qa_test_cases
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

create policy "qa_test_cases_write_admin" on public.qa_test_cases
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root')
    )
  );

create policy "qa_test_runs_select_backoffice" on public.qa_test_runs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

create policy "qa_test_runs_write_admin" on public.qa_test_runs
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root')
    )
  );

create policy "qa_test_executions_select_backoffice" on public.qa_test_executions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root', 'agent_commercial')
    )
  );

create policy "qa_test_executions_write_admin" on public.qa_test_executions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_root')
    )
  );

create or replace function public.qa_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists qa_requirements_updated on public.qa_requirements;
create trigger qa_requirements_updated
  before update on public.qa_requirements
  for each row execute function public.qa_touch_updated_at();

drop trigger if exists qa_test_cases_updated on public.qa_test_cases;
create trigger qa_test_cases_updated
  before update on public.qa_test_cases
  for each row execute function public.qa_touch_updated_at();
