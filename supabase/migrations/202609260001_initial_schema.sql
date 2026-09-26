create extension if not exists pgcrypto;

create type public.registration_status as enum ('open', 'paused', 'closed');
create type public.draw_status as enum ('active', 'closed');
create type public.participant_status as enum ('eligible', 'winner', 'disqualified');
create type public.draw_kind as enum ('automatic', 'manual');
create type public.claim_status as enum ('pending', 'claimed', 'unclaimed', 'rejected');
create type public.notification_status as enum ('pending', 'sent', 'failed');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  code text not null check (code ~ '^[A-Z0-9]{2,10}$'),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  timezone text not null default 'Asia/Kolkata',
  registration_status public.registration_status not null default 'open',
  draw_status public.draw_status not null default 'active',
  valid_registration_count bigint not null default 0 check (valid_registration_count >= 0),
  next_auto_draw_at bigint not null default 100 check (next_auto_draw_at > 0),
  auto_draw_interval integer not null default 100 check (auto_draw_interval > 0),
  helpdesk_close_time time,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 2 and 100),
  age smallint not null check (age between 18 and 120),
  city text not null check (char_length(city) between 2 and 100),
  email text not null,
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  lucky_draw_id text not null,
  registration_sequence bigint not null check (registration_sequence > 0),
  status public.participant_status not null default 'eligible',
  submission_key uuid not null,
  consent_version text not null default '2026-09-26',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email),
  unique (event_id, phone),
  unique (event_id, lucky_draw_id),
  unique (event_id, registration_sequence),
  unique (event_id, submission_key)
);

create index participants_event_status_idx
  on public.participants(event_id, status, registration_sequence);
create index participants_event_created_idx
  on public.participants(event_id, created_at desc);

create table public.draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  kind public.draw_kind not null,
  milestone bigint,
  eligible_count integer not null check (eligible_count > 0),
  winner_participant_id uuid not null references public.participants(id) on delete restrict,
  random_seed_hex text not null check (char_length(random_seed_hex) = 64),
  initiated_by uuid,
  created_at timestamptz not null default now(),
  check (
    (kind = 'automatic' and milestone is not null) or
    (kind = 'manual' and milestone is null)
  ),
  unique (winner_participant_id)
);

create unique index draws_event_automatic_milestone_unique
  on public.draws(event_id, milestone)
  where kind = 'automatic';
create index draws_event_created_idx on public.draws(event_id, created_at desc);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null unique references public.draws(id) on delete restrict,
  participant_id uuid not null unique references public.participants(id) on delete restrict,
  status public.claim_status not null default 'pending',
  claim_deadline timestamptz not null,
  notes text,
  verified_at timestamptz,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null unique references public.draws(id) on delete restrict,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  last_error text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_outbox_pending_idx
  on public.notification_outbox(status, created_at)
  where status <> 'sent';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete restrict,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_event_created_idx on public.audit_logs(event_id, created_at desc);

create table public.registration_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger participants_set_updated_at before update on public.participants
for each row execute function public.set_updated_at();
create trigger claims_set_updated_at before update on public.claims
for each row execute function public.set_updated_at();
create trigger notification_outbox_set_updated_at before update on public.notification_outbox
for each row execute function public.set_updated_at();

create or replace function public.consume_registration_rate_limit(
  p_key_hash text,
  p_max_requests integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if char_length(p_key_hash) <> 64 or p_max_requests < 1 then
    return false;
  end if;

  insert into public.registration_rate_limits (
    key_hash, window_started_at, request_count, updated_at
  ) values (
    p_key_hash, now(), 1, now()
  )
  on conflict (key_hash) do update
  set request_count = case
        when public.registration_rate_limits.window_started_at <= now() - interval '1 minute' then 1
        else public.registration_rate_limits.request_count + 1
      end,
      window_started_at = case
        when public.registration_rate_limits.window_started_at <= now() - interval '1 minute' then now()
        else public.registration_rate_limits.window_started_at
      end,
      updated_at = now()
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

create or replace function public.perform_draw_locked(
  p_event public.events,
  p_kind public.draw_kind,
  p_milestone bigint,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_seed bytea;
  v_winner_id uuid;
  v_eligible_count integer;
  v_draw_id uuid;
  v_deadline timestamptz;
begin
  select count(*)::integer
  into v_eligible_count
  from public.participants
  where event_id = p_event.id and status = 'eligible';

  if v_eligible_count = 0 then
    raise exception using errcode = 'P0001', message = 'no_eligible_participants';
  end if;

  v_seed := gen_random_bytes(32);

  select id
  into v_winner_id
  from public.participants
  where event_id = p_event.id and status = 'eligible'
  order by digest(id::text || encode(v_seed, 'hex'), 'sha256')
  limit 1;

  insert into public.draws (
    event_id, kind, milestone, eligible_count, winner_participant_id,
    random_seed_hex, initiated_by
  ) values (
    p_event.id, p_kind, p_milestone, v_eligible_count, v_winner_id,
    encode(v_seed, 'hex'), p_actor_id
  ) returning id into v_draw_id;

  update public.participants
  set status = 'winner'
  where id = v_winner_id and status = 'eligible';

  if not found then
    raise exception using errcode = 'P0001', message = 'winner_selection_conflict';
  end if;

  v_deadline := (
    timezone(p_event.timezone, now())::date +
    coalesce(p_event.helpdesk_close_time, time '23:59:59')
  ) at time zone p_event.timezone;

  insert into public.claims (draw_id, participant_id, claim_deadline)
  values (v_draw_id, v_winner_id, v_deadline);

  insert into public.notification_outbox (draw_id)
  values (v_draw_id);

  insert into public.audit_logs (
    event_id, actor_id, action, entity_type, entity_id, new_values
  ) values (
    p_event.id,
    p_actor_id,
    case when p_kind = 'automatic' then 'automatic_draw_completed' else 'manual_draw_completed' end,
    'draw',
    v_draw_id::text,
    jsonb_build_object(
      'kind', p_kind,
      'milestone', p_milestone,
      'eligible_count', v_eligible_count,
      'winner_participant_id', v_winner_id
    )
  );

  return v_draw_id;
end;
$$;

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
  v_draw_id uuid;
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

  if v_event.draw_status = 'active'
     and v_event.valid_registration_count = v_event.next_auto_draw_at then
    v_draw_id := public.perform_draw_locked(
      v_event,
      'automatic',
      v_event.next_auto_draw_at,
      null
    );

    update public.events
    set next_auto_draw_at = next_auto_draw_at + auto_draw_interval
    where id = v_event.id;
  end if;

  return query select
    v_participant.id,
    v_participant.lucky_draw_id,
    v_participant.registration_sequence,
    v_draw_id is not null,
    v_draw_id,
    false;
end;
$$;

create or replace function public.run_manual_draw(
  p_event_slug text,
  p_actor_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event public.events;
  v_draw_id uuid;
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

  v_draw_id := public.perform_draw_locked(v_event, 'manual', null, p_actor_id);

  update public.audit_logs
  set reason = trim(p_reason)
  where entity_type = 'draw' and entity_id = v_draw_id::text;

  return v_draw_id;
end;
$$;

create or replace function public.update_draw_settings(
  p_event_slug text,
  p_actor_id uuid,
  p_next_target bigint,
  p_interval integer,
  p_reason text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_old jsonb;
begin
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

  if p_next_target <= v_event.valid_registration_count then
    raise exception using errcode = 'P0001', message = 'target_must_be_in_future';
  end if;

  if p_interval < 1 or char_length(trim(p_reason)) < 5 then
    raise exception using errcode = 'P0001', message = 'invalid_settings';
  end if;

  v_old := jsonb_build_object(
    'next_auto_draw_at', v_event.next_auto_draw_at,
    'auto_draw_interval', v_event.auto_draw_interval
  );

  update public.events
  set next_auto_draw_at = p_next_target, auto_draw_interval = p_interval
  where id = v_event.id
  returning * into v_event;

  insert into public.audit_logs (
    event_id, actor_id, action, entity_type, entity_id, reason, old_values, new_values
  ) values (
    v_event.id, p_actor_id, 'draw_settings_updated', 'event', v_event.id::text,
    trim(p_reason), v_old,
    jsonb_build_object(
      'next_auto_draw_at', p_next_target,
      'auto_draw_interval', p_interval
    )
  );

  return v_event;
end;
$$;

create or replace function public.set_registration_status(
  p_event_slug text,
  p_actor_id uuid,
  p_status public.registration_status,
  p_reason text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_old_status public.registration_status;
begin
  if p_status not in ('open', 'paused') then
    raise exception using errcode = 'P0001', message = 'invalid_registration_status';
  end if;

  select * into v_event
  from public.events
  where slug = p_event_slug
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'event_not_found';
  end if;

  if v_event.draw_status = 'closed' or v_event.registration_status = 'closed' then
    raise exception using errcode = 'P0001', message = 'draw_closed';
  end if;

  if char_length(trim(p_reason)) < 5 then
    raise exception using errcode = 'P0001', message = 'reason_required';
  end if;

  v_old_status := v_event.registration_status;
  update public.events set registration_status = p_status
  where id = v_event.id returning * into v_event;

  insert into public.audit_logs (
    event_id, actor_id, action, entity_type, entity_id, reason, old_values, new_values
  ) values (
    v_event.id, p_actor_id, 'registration_status_updated', 'event', v_event.id::text,
    trim(p_reason), jsonb_build_object('registration_status', v_old_status),
    jsonb_build_object('registration_status', p_status)
  );

  return v_event;
end;
$$;

create or replace function public.close_lucky_draw(
  p_event_slug text,
  p_actor_id uuid,
  p_confirmation text,
  p_reason text
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
  v_pending_claims integer;
begin
  if p_confirmation <> 'CLOSE LUCKY DRAW' then
    raise exception using errcode = 'P0001', message = 'confirmation_mismatch';
  end if;

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

  if v_event.draw_status = 'closed' then
    return v_event;
  end if;

  select count(*)::integer into v_pending_claims
  from public.claims c
  join public.draws d on d.id = c.draw_id
  where d.event_id = v_event.id and c.status = 'pending';

  update public.events
  set registration_status = 'closed', draw_status = 'closed', closed_at = now()
  where id = v_event.id
  returning * into v_event;

  insert into public.audit_logs (
    event_id, actor_id, action, entity_type, entity_id, reason, old_values, new_values
  ) values (
    v_event.id, p_actor_id, 'lucky_draw_closed', 'event', v_event.id::text,
    trim(p_reason),
    jsonb_build_object('registration_status', 'open_or_paused', 'draw_status', 'active'),
    jsonb_build_object(
      'registration_status', 'closed',
      'draw_status', 'closed',
      'registration_count', v_event.valid_registration_count,
      'pending_claims', v_pending_claims
    )
  );

  return v_event;
end;
$$;

create or replace function public.update_claim_status(
  p_event_slug text,
  p_draw_id uuid,
  p_actor_id uuid,
  p_status public.claim_status,
  p_notes text
)
returns public.claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_claim public.claims;
  v_old_status public.claim_status;
begin
  select c.*
  into v_claim
  from public.claims c
  join public.draws d on d.id = c.draw_id
  join public.events e on e.id = d.event_id
  where c.draw_id = p_draw_id and e.slug = p_event_slug
  for update of c;

  if not found then
    raise exception using errcode = 'P0001', message = 'claim_not_found';
  end if;

  select event_id into v_event_id from public.draws where id = p_draw_id;

  v_old_status := v_claim.status;
  update public.claims
  set status = p_status,
      notes = nullif(trim(p_notes), ''),
      verified_at = case when p_status = 'claimed' then now() else verified_at end,
      updated_by = p_actor_id
  where id = v_claim.id
  returning * into v_claim;

  insert into public.audit_logs (
    event_id, actor_id, action, entity_type, entity_id, old_values, new_values
  ) values (
    v_event_id, p_actor_id, 'claim_status_updated', 'claim', v_claim.id::text,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status, 'notes', nullif(trim(p_notes), ''))
  );

  return v_claim;
end;
$$;

alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.draws enable row level security;
alter table public.claims enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_logs enable row level security;
alter table public.registration_rate_limits enable row level security;

revoke all on public.events from anon, authenticated;
revoke all on public.participants from anon, authenticated;
revoke all on public.draws from anon, authenticated;
revoke all on public.claims from anon, authenticated;
revoke all on public.notification_outbox from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.registration_rate_limits from anon, authenticated;

revoke execute on function public.perform_draw_locked(public.events, public.draw_kind, bigint, uuid) from public, anon, authenticated;
revoke execute on function public.register_participant(text, text, integer, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.run_manual_draw(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.update_draw_settings(text, uuid, bigint, integer, text) from public, anon, authenticated;
revoke execute on function public.set_registration_status(text, uuid, public.registration_status, text) from public, anon, authenticated;
revoke execute on function public.close_lucky_draw(text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.update_claim_status(text, uuid, uuid, public.claim_status, text) from public, anon, authenticated;
revoke execute on function public.consume_registration_rate_limit(text, integer) from public, anon, authenticated;

grant execute on function public.register_participant(text, text, integer, text, text, text, uuid) to service_role;
grant execute on function public.run_manual_draw(text, uuid, text) to service_role;
grant execute on function public.update_draw_settings(text, uuid, bigint, integer, text) to service_role;
grant execute on function public.set_registration_status(text, uuid, public.registration_status, text) to service_role;
grant execute on function public.close_lucky_draw(text, uuid, text, text) to service_role;
grant execute on function public.update_claim_status(text, uuid, uuid, public.claim_status, text) to service_role;
grant execute on function public.consume_registration_rate_limit(text, integer) to service_role;

insert into public.events (
  slug, name, code, starts_on, ends_on, timezone,
  registration_status, draw_status, next_auto_draw_at, auto_draw_interval
) values (
  'armson-festival-2026',
  'Armson Homes presents CETalks Spotlight 2026',
  'ARM',
  date '2026-10-03',
  date '2026-10-04',
  'Asia/Kolkata',
  'open',
  'active',
  100,
  100
) on conflict (slug) do nothing;
