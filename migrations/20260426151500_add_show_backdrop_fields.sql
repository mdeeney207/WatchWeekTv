-- Add durable TMDB landscape artwork fields for WatchWeek show hero surfaces.
-- These columns are used by the home hero and future show/card artwork pipelines.

alter table public.shows
add column if not exists backdrop_path text;

alter table public.shows
add column if not exists backdrop_url text;

create index if not exists idx_shows_backdrop_url
on public.shows (backdrop_url)
where backdrop_url is not null;
