begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into public.events (
  slug, name, code, starts_on, ends_on, timezone, helpdesk_close_time
) values (
  'daily-test-event', 'Daily Test Event', 'TEST',
  current_date, current_date + 1, 'Asia/Kolkata', time '22:00:00'
);

do $$
begin
  for i in 1..100 loop
    perform public.register_participant(
      'daily-test-event',
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
  (select valid_registration_count from public.events where slug = 'daily-test-event'),
  100::bigint,
  'registration count is permanent and cumulative'
);
select is(
  (select count(*)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'daily-test-event'),
  0,
  'registrations do not trigger a draw'
);

select lives_ok(
  $$ select public.run_daily_draw('daily-test-event', gen_random_uuid(), current_date, 'Day one finale') $$,
  'day-one draw succeeds with eligible participants'
);
select is(
  (select count(*)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'daily-test-event' and d.draw_day = current_date),
  1,
  'exactly one draw is stored for day one'
);
select is(
  (select count(*)::integer from public.participants p join public.events e on e.id = p.event_id where e.slug = 'daily-test-event' and p.status = 'winner'),
  1,
  'day-one draw marks exactly one winner'
);
select throws_ok(
  $$ select public.run_daily_draw('daily-test-event', gen_random_uuid(), current_date, 'Duplicate day one finale') $$,
  'P0001',
  'draw_day_completed',
  'a completed festival day cannot be drawn again'
);

select lives_ok(
  $$ select public.run_daily_draw('daily-test-event', gen_random_uuid(), current_date + 1, 'Day two finale') $$,
  'day-two draw succeeds'
);
select is(
  (select count(distinct winner_participant_id)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'daily-test-event'),
  2,
  'the day-one winner cannot win again'
);
select is(
  (select count(*)::integer from public.draws d join public.events e on e.id = d.event_id where e.slug = 'daily-test-event'),
  2,
  'the event has exactly two daily draws'
);
select throws_ok(
  $$ select public.run_daily_draw('daily-test-event', gen_random_uuid(), current_date + 2, 'Invalid third day') $$,
  'P0001',
  'invalid_draw_day',
  'a date outside the two festival days is rejected'
);

select lives_ok(
  $$ select public.close_lucky_draw('daily-test-event', gen_random_uuid(), 'CLOSE LUCKY DRAW', 'Festival operations completed') $$,
  'admin can permanently close the lucky draw'
);
select throws_ok(
  $$ select public.register_participant('daily-test-event', 'Late Person', 30, 'Test City', 'late@example.com', '+919999999999', gen_random_uuid()) $$,
  'P0001',
  'registration_closed',
  'registration is rejected after permanent closure'
);

select * from finish();
rollback;
