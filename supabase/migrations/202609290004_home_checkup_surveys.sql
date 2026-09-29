create table public.home_checkup_surveys (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  age smallint not null check (age between 18 and 120),
  study_year text not null check (char_length(study_year) between 1 and 40),
  address text not null check (char_length(address) between 5 and 500),
  department text not null check (char_length(department) between 2 and 100),
  home_ownership text not null check (home_ownership in ('owned', 'rented')),
  years_in_home numeric(4,1) not null check (years_in_home between 0 and 120),
  needs_checkup boolean not null,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index home_checkup_surveys_created_at_idx
  on public.home_checkup_surveys(created_at desc);

alter table public.home_checkup_surveys enable row level security;
revoke all on public.home_checkup_surveys from anon, authenticated;
