-- Replace registration milestones with one administrator-run draw per festival day.

alter table public.draws
add column if not exists draw_day date;

alter table public.draws
drop constraint if exists draws_check;

alter table public.draws
add constraint draws_kind_schedule_check check (
  (kind = 'automatic' and milestone is not null and draw_day is null) or
  (kind = 'manual' and milestone is null)
);

create unique index if not exists draws_event_day_unique
on public.draws(event_id, draw_day)
where draw_day is not null;

create or replace function public.register_participant(
  p_event_slug text,
  p_full_name text,
  p_age integer,
  p_city text,
  p_email text,
  p_phone text,
  p_submission_key uuid
)
returns table (
  participant_id uuid,
  lucky_draw_id text,
  registration_sequence bigint,
  draw_triggered boolean,
  draw_id uuid,
  was_existing boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event public.events;
  v_participant public.participants;
  v_email text := lower(trim(p_email));
  v_phone text := trim(p_phone);
  v_lucky_draw_id text;
begin
  select * into v_event
  from public.events
  where slug = p_event_slug
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'event_not_found';
  end if;

  select * into v_participant
  from public.participants
  where event_id = v_event.id and submission_key = p_submission_key;

  if found then
    return query select
      v_participant.id,
      v_participant.lucky_draw_id,
      v_participant.registration_sequence,
      false,
      null::uuid,
      true;
    return;
  end if;

  if v_event.registration_status <> 'open' or v_event.draw_status = 'closed' then
    raise exception using errcode = 'P0001', message = 'registration_closed';
  end if;

  if p_age < 18 or p_age > 120 then
    raise exception using errcode = 'P0001', message = 'invalid_age';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using errcode = 'P0001', message = 'invalid_email';
  end if;

  if v_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception using errcode = 'P0001', message = 'invalid_phone';
  end if;

  if exists (
    select 1 from public.participants where event_id = v_event.id and email = v_email
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_email';
  end if;

  if exists (
    select 1 from public.participants where event_id = v_event.id and phone = v_phone
  ) then
    raise exception using errcode = 'P0001', message = 'duplicate_phone';
  end if;

  v_event.valid_registration_count := v_event.valid_registration_count + 1;
  v_lucky_draw_id := v_event.code || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.participants (
    event_id, full_name, age, city, email, phone, lucky_draw_id,
    registration_sequence, submission_key
  ) values (
    v_event.id, trim(p_full_name), p_age, trim(p_city), v_email, v_phone,
    v_lucky_draw_id, v_event.valid_registration_count, p_submission_key
  ) returning * into v_participant;

  update public.events
  set valid_registration_count = v_event.valid_registration_count
  where id = v_event.id;

  return query select
    v_participant.id,
    v_participant.lucky_draw_id,
    v_participant.registration_sequence,
    false,
    null::uuid,
    false;
end;
$$;

create or replace function public.run_daily_draw(
  p_event_slug text,
  p_actor_id uuid,
  p_draw_day date,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_draw_id uuid;
  v_deadline timestamptz;
begin
  if char_length(trim(p_reason)) < 5 then
    raise exception using errcode = 'P0001', message = 'reason_required';
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'event_not_found';
  end if;

  if v_event.draw_status <> 'active' then
    raise exception using errcode = 'P0001', message = 'draw_closed';
  end if;

  if p_draw_day not in (v_event.starts_on, v_event.ends_on) then
    raise exception using errcode = 'P0001', message = 'invalid_draw_day';
  end if;

  if exists (
    select 1 from public.draws
    where event_id = v_event.id and draw_day = p_draw_day
  ) then
    raise exception using errcode = 'P0001', message = 'draw_day_completed';
  end if;

  v_draw_id := public.perform_draw_locked(v_event, 'manual', null, p_actor_id);

  update public.draws
  set draw_day = p_draw_day
  where id = v_draw_id;

  v_deadline := (
    p_draw_day + coalesce(v_event.helpdesk_close_time, time '23:59:59')
  ) at time zone v_event.timezone;

  update public.claims
  set claim_deadline = v_deadline
  where draw_id = v_draw_id;

  update public.audit_logs
  set
    action = 'daily_draw_completed',
    reason = trim(p_reason),
    new_values = coalesce(new_values, '{}'::jsonb) || jsonb_build_object('draw_day', p_draw_day)
  where entity_type = 'draw' and entity_id = v_draw_id::text;

  return v_draw_id;
end;
$$;

revoke execute on function public.run_manual_draw(text, uuid, text) from service_role;
revoke execute on function public.update_draw_settings(text, uuid, bigint, integer, text) from service_role;
revoke execute on function public.run_daily_draw(text, uuid, date, text) from public, anon, authenticated;
grant execute on function public.run_daily_draw(text, uuid, date, text) to service_role;

