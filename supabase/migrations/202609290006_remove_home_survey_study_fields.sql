alter table public.home_checkup_surveys
  drop column if exists study_year,
  drop column if exists department;
