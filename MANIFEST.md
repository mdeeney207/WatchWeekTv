# WatchWeek Manifest (Checkpoint)

## Architecture
- TMDB calls via Supabase Edge Function: tmdb_proxy (keys never in mobile)
- Weekly/tonight source of truth: v_week_episodes
- Release time model:
  - shows.release_time_local
  - shows.release_tz
  - view computes drop_ts_local

## Key Views
- v_week_episodes: includes user_id, show, service, real drop time, links, branding

## Mobile
- WeekScreen.tsx + TonightScreen.tsx updated
- Launch logic: DB-driven (deep link -> show page -> service website)
- Telemetry:
  - logOpenService
  - logWatched
- Watched hides optimistically

## Known Cleanup
- shows duplicates exist (ex: The Pitt) — need dedupe + unique constraint on tmdb_id
- streaming_services.logo_url not fully populated

## Next Planned Phases
1) Data hygiene: dedupe shows + unique constraint on shows.tmdb_id
2) Service polish: populate logo_url (+ optional deep links)
3) UX polish: empty states + microcopy + accents
4) Power: notifications from drop_ts_local, admin UI
