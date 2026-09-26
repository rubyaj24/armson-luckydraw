-- Keep already-initialized environments aligned with the confirmed event dates.
update public.events
set
  name = 'Armson Homes presents CETalks Spotlight 2026',
  starts_on = date '2026-10-03',
  ends_on = date '2026-10-04',
  updated_at = now()
where slug = 'armson-festival-2026';
