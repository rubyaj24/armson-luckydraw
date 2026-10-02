alter table public.home_checkup_surveys
  add column if not exists phone text;

alter table public.home_checkup_surveys
  add constraint home_checkup_surveys_phone_format
  check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$');
