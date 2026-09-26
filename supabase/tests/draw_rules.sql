begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.events (
  slug, name, code, starts_on, ends_on, timezone,
  next_auto_draw_at, auto_draw_interval, helpdesk_close_time
) values (
  'automated-test-event', 'Automated Test Event', 'TEST',
  current_date, current_date + 2, 'Asia/Kolkata', 100, 100, time '23:59:59'
);

do $$
begin
  for i in 1..100 loop
    perform public.register_participant(
      'automated-test-event',
      'Participant ' || i,
      18 + (i % 50),
      'Test City',
      'participant' || i || '@example.com',
      '+91900000' || lpad(i::text, 4, '0'),
      gen_random_uuid()
    );
  end loop;
end;
$$;

select is(
  (select valid_registration_count from public.events where slug = 'automated-test-event'),
  100::bigint,
  'registration count is permanent and cumulative'
);
select is(
  (select count(*)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'automated-test-event'),
  1,
  'exactly one automatic draw occurs at 100'
);
select is(
  (select count(*)::integer from public.participants p join public.events e on e.id = p.event_id where e.slug = 'automated-test-event' and p.status = 'winner'),
  1,
  'automatic draw marks exactly one winner'
);
select is(
  (select next_auto_draw_at from public.events where slug = 'automated-test-event'),
  200::bigint,
  'automatic draw advances the target by its interval'
);

select lives_ok(
  $$ select public.run_manual_draw('automated-test-event', gen_random_uuid(), 'End-of-session manual draw') $$,
  'manual draw succeeds with eligible participants'
);
select is(
  (select next_auto_draw_at from public.events where slug = 'automated-test-event'),
  200::bigint,
  'manual draw does not change the automatic target'
);
select is(
  (select count(distinct winner_participant_id)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'automated-test-event'),
  2,
  'a previous winner cannot win again'
);

select lives_ok(
  $$ select public.update_draw_settings('automated-test-event', gen_random_uuid(), 150, 25, 'Testing future milestone') $$,
  'admin can change a future target and interval'
);
select throws_ok(
  $$ select public.update_draw_settings('automated-test-event', gen_random_uuid(), 100, 25, 'Invalid past milestone') $$,
  'P0001',
  'target_must_be_in_future',
  'admin cannot configure a completed or current milestone'
);

select lives_ok(
  $$ select public.close_lucky_draw('automated-test-event', gen_random_uuid(), 'CLOSE LUCKY DRAW', 'Festival operations completed') $$,
  'admin can permanently close the lucky draw'
);
select is(
  (select registration_status::text || '/' || draw_status::text from public.events where slug = 'automated-test-event'),
  'closed/closed',
  'closure atomically closes registrations and draws'
);
select throws_ok(
  $$ select public.register_participant('automated-test-event', 'Late Person', 30, 'Test City', 'late@example.com', '+919999999999', gen_random_uuid()) $$,
  'P0001',
  'registration_closed',
  'registration is rejected after permanent closure'
);

select * from finish();
rollback;
