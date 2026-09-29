-- Public routes remain unavailable until the administrator explicitly activates the festival.
update public.events
set registration_status = 'paused', updated_at = now()
where slug = 'armson-festival-2026'
  and registration_status = 'open'
  and draw_status = 'active';
