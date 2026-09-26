-- TESTING ONLY: clear all operational data for the Spotlight 2026 event.
-- This preserves the event configuration, database schema, and Supabase admin user.

begin;

do $$
begin
  if not exists (
    select 1 from public.events where slug = 'armson-festival-2026'
  ) then
    raise exception 'Event armson-festival-2026 was not found; nothing was deleted.';
  end if;
end;
$$;

delete from public.notification_outbox
where draw_id in (
  select d.id
  from public.draws d
  join public.events e on e.id = d.event_id
  where e.slug = 'armson-festival-2026'
);

delete from public.claims
where draw_id in (
  select d.id
  from public.draws d
  join public.events e on e.id = d.event_id
  where e.slug = 'armson-festival-2026'
);

delete from public.audit_logs
where event_id = (
  select id from public.events where slug = 'armson-festival-2026'
);

delete from public.draws
where event_id = (
  select id from public.events where slug = 'armson-festival-2026'
);

delete from public.participants
where event_id = (
  select id from public.events where slug = 'armson-festival-2026'
);

-- Rate-limit records are temporary and are not tied to an event.
delete from public.registration_rate_limits;

update public.events
set
  registration_status = 'open',
  draw_status = 'active',
  valid_registration_count = 0,
  next_auto_draw_at = 100,
  auto_draw_interval = 100,
  closed_at = null
where slug = 'armson-festival-2026';

commit;

-- Expected result: one clean, open event and no operational records.
select
  e.slug,
  e.registration_status,
  e.draw_status,
  e.valid_registration_count,
  (select count(*) from public.participants p where p.event_id = e.id) as participants,
  (select count(*) from public.draws d where d.event_id = e.id) as draws
from public.events e
where e.slug = 'armson-festival-2026';
