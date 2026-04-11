import Image from "next/image";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";
import Rail from "@/components/Rail";
import {
  tmdbBackdropUrl,
  tmdbDiscoverMoviesByProvider,
  tmdbGetTrendingMovies,
  tmdbGetUpcomingMovies,
  tmdbPosterUrl,
  type TmdbMovieResult,
  type TmdbTrendingMovieResult,
} from "@/lib/tmdb";

type MovieCardItem = {
  id: number;
  title: string;
  overview?: string;
  posterSrc?: string | null;
  backdropSrc?: string | null;
};

function toCardItem(
  movie: TmdbMovieResult | TmdbTrendingMovieResult | null | undefined
): MovieCardItem | null {
  if (!movie || !Number.isFinite(movie.id)) return null;

  const title =
    "title" in movie && typeof movie.title === "string"
      ? movie.title.trim()
      : "";

  if (!title) return null;

  const posterSrc =
    "posterUrl" in movie
      ? movie.posterUrl ?? null
      : tmdbPosterUrl(movie.poster_path, "w342");

  const backdropSrc =
    "backdropUrl" in movie
      ? movie.backdropUrl ?? null
      : tmdbBackdropUrl(movie.backdrop_path, "w1280");

  return {
    id: movie.id,
    title,
    overview: movie.overview ?? undefined,
    posterSrc,
    backdropSrc,
  };
}

function MovieCard({ movie }: { movie: MovieCardItem }) {
  return (
    <article className="group w-[154px] shrink-0 sm:w-[166px] lg:w-[180px]">
      <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03] shadow-[0_14px_36px_rgba(0,0,0,0.26)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-white/16 group-hover:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[20px]">
          {movie.posterSrc ? (
            <Image
              src={movie.posterSrc}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 154px, (max-width: 1024px) 166px, 180px"
              className="object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex h-full items-end bg-white/[0.03] p-4">
              <div className="text-sm font-medium leading-5 text-white/75">
                {movie.title}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/18 to-transparent" />
        </div>
      </div>

      <div className="px-0.5">
        <h3 className="mt-3 line-clamp-2 min-h-[2.9rem] text-[12.5px] font-medium leading-[1.35] text-white/88">
          {movie.title}
        </h3>
      </div>
    </article>
  );
}

function MovieRail({
  title,
  subtitle,
  items,
  className,
  prefix,
}: {
  title: string;
  subtitle: string;
  items: MovieCardItem[];
  className?: string;
  prefix: string;
}) {
  if (!items.length) return null;

  return (
    <section
      className={[
        "relative rounded-[28px] border border-white/8 bg-white/[0.02] px-4 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:px-5 sm:py-6 lg:px-6",
        className ?? "",
      ].join(" ")}
    >
      <Rail
        title={title}
        subtitle={subtitle}
        contentClassName="pb-1"
        fadeEdges
      >
        {items.map((movie) => (
          <MovieCard key={`${prefix}-${movie.id}`} movie={movie} />
        ))}
      </Rail>
    </section>
  );
}

export default async function MoviesPage() {
  const [
    netflixRaw,
    primeRaw,
    appleRaw,
    maxRaw,
    trendingRaw,
    upcomingRaw,
  ] = await Promise.all([
    tmdbDiscoverMoviesByProvider("netflix", "US", 12),
    tmdbDiscoverMoviesByProvider("prime-video", "US", 12),
    tmdbDiscoverMoviesByProvider("apple-tv-plus", "US", 12),
    tmdbDiscoverMoviesByProvider("max", "US", 12),
    tmdbGetTrendingMovies(12, "week"),
    tmdbGetUpcomingMovies(12),
  ]);

  const netflix = netflixRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];
  const prime = primeRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];
  const apple = appleRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];
  const maxItems = maxRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];
  const trending = trendingRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];
  const upcoming = upcomingRaw.map(toCardItem).filter(Boolean) as MovieCardItem[];

  const hero =
    trending[0] ??
    netflix[0] ??
    prime[0] ??
    apple[0] ??
    maxItems[0] ??
    upcoming[0] ??
    null;

  const hasAnyRows =
    netflix.length ||
    prime.length ||
    apple.length ||
    maxItems.length ||
    trending.length ||
    upcoming.length;

  return (
    <PageShell>
      <main className="pb-20 pt-10 md:pb-24 md:pt-14">
        <PageWrap>
          <section className="relative mb-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
            {hero?.backdropSrc ? (
              <Image
                src={hero.backdropSrc}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-30"
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

            <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_320px] lg:items-end lg:px-10 lg:py-12">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-white/72">
                  WATCHWEEK • MOVIES
                </div>

                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  See what’s streaming now, what’s trending, and what’s coming next.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                  WatchWeek brings major movie destinations into one clean view so
                  you can scan what is available on top streaming services, check
                  what is trending right now, and keep upcoming releases on your
                  radar.
                </p>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/72">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Netflix
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Prime Video
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Apple TV+
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Max
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Trending
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                    Coming Soon
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5 backdrop-blur-md">
                <div className="text-[11px] font-medium tracking-[0.18em] text-white/45">
                  FEATURED NOW
                </div>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {hero?.title ?? "Movies"}
                </h2>

                {hero?.overview ? (
                  <p className="mt-3 line-clamp-5 text-sm leading-6 text-white/70">
                    {hero.overview}
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    Explore what is available across major streaming platforms,
                    what is trending now, and what is coming soon.
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-8 sm:space-y-10 lg:space-y-12">
            <MovieRail
              title="On Netflix"
              subtitle="Popular movies currently available on Netflix"
              items={netflix}
              prefix="netflix"
            />

            <MovieRail
              title="On Prime Video"
              subtitle="Popular movies currently available on Prime Video"
              items={prime}
              prefix="prime"
            />

            <MovieRail
              title="On Apple TV+"
              subtitle="Popular movies currently available on Apple TV+"
              items={apple}
              prefix="apple"
            />

            <MovieRail
              title="On Max"
              subtitle="Popular movies currently available on Max"
              items={maxItems}
              prefix="max"
            />

            <MovieRail
              title="Trending Now"
              subtitle="Popular movies people are paying attention to right now"
              items={trending}
              prefix="trending"
            />

            <MovieRail
              title="Coming Soon"
              subtitle="Upcoming movie releases to keep on your radar"
              items={upcoming}
              prefix="upcoming"
            />
          </div>

          {!hasAnyRows ? (
            <section className="mt-12 rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
              <h2 className="text-xl font-semibold text-white">
                Movies are loading into place
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/65">
                No movie rows are available right now from the current TMDB pipeline.
                Once the upstream data responds, this page will populate with
                provider, trending, and upcoming movie rails.
              </p>
            </section>
          ) : null}
        </PageWrap>
      </main>
    </PageShell>
  );
}