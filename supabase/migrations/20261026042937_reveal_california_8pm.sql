-- Reveal on October 26, 2026 at 8:00 PM California time (PDT, UTC-07:00).
-- Keep database timestamps in UTC and retain the existing server-side access rules.
alter table public.cottage_event
  alter column reveal_at set default '2026-10-27T03:00:00Z',
  alter column timezone set default 'America/Los_Angeles';

update public.cottage_event
set reveal_at = '2026-10-27T03:00:00Z',
    timezone = 'America/Los_Angeles'
where id = true;
