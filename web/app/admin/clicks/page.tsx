// web/app/admin/clicks/page.tsx

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { tmdbGetTvDetails, tmdbPosterUrl } from "@/lib/tmdb";

type ClickRow = {
  id: string;
  user_id: string | null;
  tmdb_show_id: number | null;
  service_slug: string | null;
  country_code: string | null;
  clicked_at: string;
  source_surface: string | null;
  destination_type: string | null;
};

type TopProviderRow = {
  service_slug: string;
  clicks: number;
};

type TopSurfaceRow = {
  source_surface: string;
  clicks: number;
};

type TopShowRow = {
  tmdb_show_id: number;
  clicks: number;
  title: string;
  posterUrl: string | null;
  firstAirDate: string | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function slugToLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function groupCounts(
  rows: ClickRow[],
  key: (row: ClickRow) => string
): Array<{ key: string; clicks: number }> {
  const map = new Map<string, number>();

  for (const row of rows) {
    const k = key(row) || "unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([key, clicks]) => ({ key, clicks }))
    .sort((a, b) => b.clicks - a.clicks);
}

async function getTopShows(rows: ClickRow[]): Promise<TopShowRow[]> {
  const counts = new Map<number, number>();

  for (const row of rows) {
    if (!row.tmdb_show_id) continue;
    counts.set(row.tmdb_show_id, (counts.get(row.tmdb_show_id) ?? 0) + 1);
  }

  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const details = await Promise.all(
    topIds.map(async ([tmdb_show_id, clicks]) => {
      try {
        const show = await tmdbGetTvDetails(tmdb_show_id);
        return {
          tmdb_show_id,
          clicks,
          title: show?.name || `TMDB ${tmdb_show_id}`,
          posterUrl: tmdbPosterUrl(show?.poster_path, "w342"),
          firstAirDate: show?.first_air_date || null,
        } satisfies TopShowRow;
      } catch {
        return {
          tmdb_show_id,
          clicks,
          title: `TMDB ${tmdb_show_id}`,
          posterUrl: null,
          firstAirDate: null,
        } satisfies TopShowRow;
      }
    })
  );

  return details;
}

async function getAnalytics() {
  const supabase = createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: recentRows, error: recentError } = await supabase
    .from("watch_clicks")
    .select(
      "id, user_id, tmdb_show_id, service_slug, country_code, clicked_at, source_surface, destination_type"
    )
    .order("clicked_at", { ascending: false })
    .limit(50);

  if (recentError) {
    throw new Error(`Failed to load recent clicks: ${recentError.message}`);
  }

  const { data: windowRows, error: windowError } = await supabase
    .from("watch_clicks")
    .select(
      "id, user_id, tmdb_show_id, service_slug, country_code, clicked_at, source_surface, destination_type"
    )
    .gte("clicked_at", since.toISOString())
    .order("clicked_at", { ascending: false })
    .limit(5000);

  if (windowError) {
    throw new Error(`Failed to load 30-day clicks: ${windowError.message}`);
  }

  const rows = (windowRows ?? []) as ClickRow[];
  const recent = (recentRows ?? []) as ClickRow[];

  const totalClicks30d = rows.length;
  const uniqueShows30d = new Set(
    rows.map((r) => r.tmdb_show_id).filter(Boolean)
  ).size;
  const uniqueProviders30d = new Set(
    rows.map((r) => r.service_slug).filter(Boolean)
  ).size;

  const providerCounts = groupCounts(rows, (r) => r.service_slug ?? "unknown")
    .slice(0, 10)
    .map(
      (x) =>
        ({
          service_slug: x.key,
          clicks: x.clicks,
        }) satisfies TopProviderRow
    );

  const surfaceCounts = groupCounts(
    rows,
    (r) => r.source_surface ?? "unknown"
  )
    .slice(0, 10)
    .map(
      (x) =>
        ({
          source_surface: x.key,
          clicks: x.clicks,
        }) satisfies TopSurfaceRow
    );

  const destinationCounts = groupCounts(
    rows,
    (r) => r.destination_type ?? "unknown"
  ).slice(0, 10);

  const topShows = await getTopShows(rows);

  return {
    totalClicks30d,
    uniqueShows30d,
    uniqueProviders30d,
    providerCounts,
    surfaceCounts,
    destinationCounts,
    topShows,
    recent,
    since,
  };
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {sublabel ? (
        <div className="mt-2 text-xs text-white/45">{sublabel}</div>
      ) : null}
    </div>
  );
}

function TableCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function AdminClicksPage() {
  const {
    totalClicks30d,
    uniqueShows30d,
    uniqueProviders30d,
    providerCounts,
    surfaceCounts,
    destinationCounts,
    topShows,
    recent,
    since,
  } = await getAnalytics();

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-400/80">
              WatchWeek Admin
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Click Analytics Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-white/60 md:text-base">
              Provider traffic, top shows, source surfaces, and recent redirect
              activity for the last 30 days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              Window: {formatDateOnly(since.toISOString())} → Today
            </div>
            <Link
              href="/home"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Clicks"
            value={formatNumber(totalClicks30d)}
            sublabel="Last 30 days"
          />
          <StatCard
            label="Unique Shows"
            value={formatNumber(uniqueShows30d)}
            sublabel="Shows generating outbound traffic"
          />
          <StatCard
            label="Active Providers"
            value={formatNumber(uniqueProviders30d)}
            sublabel="Distinct provider slugs clicked"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <TableCard
            title="Top Providers"
            subtitle="Which streaming services are driving the most outbound traffic."
          >
            <div className="overflow-hidden rounded-2xl border border-white/8">
              <table className="min-w-full divide-y divide-white/8 text-sm">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">
                      Clicks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {providerCounts.length ? (
                    providerCounts.map((row) => (
                      <tr key={row.service_slug} className="bg-transparent">
                        <td className="px-4 py-3 text-white">
                          {slugToLabel(row.service_slug)}
                        </td>
                        <td className="px-4 py-3 text-right text-white/80">
                          {formatNumber(row.clicks)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-white/45"
                      >
                        No provider clicks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>

          <div className="grid gap-6">
            <TableCard
              title="Clicks by Surface"
              subtitle="Where users are clicking from inside WatchWeek."
            >
              <div className="overflow-hidden rounded-2xl border border-white/8">
                <table className="min-w-full divide-y divide-white/8 text-sm">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-white/60">
                        Surface
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-white/60">
                        Clicks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {surfaceCounts.length ? (
                      surfaceCounts.map((row) => (
                        <tr key={row.source_surface}>
                          <td className="px-4 py-3 text-white">
                            {slugToLabel(row.source_surface)}
                          </td>
                          <td className="px-4 py-3 text-right text-white/80">
                            {formatNumber(row.clicks)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-6 text-center text-white/45"
                        >
                          No surface data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TableCard>

            <TableCard
              title="Destination Types"
              subtitle="How redirects are being routed."
            >
              <div className="overflow-hidden rounded-2xl border border-white/8">
                <table className="min-w-full divide-y divide-white/8 text-sm">
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-white/60">
                        Destination
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-white/60">
                        Clicks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {destinationCounts.length ? (
                      destinationCounts.map((row) => (
                        <tr key={row.key}>
                          <td className="px-4 py-3 text-white">
                            {slugToLabel(row.key)}
                          </td>
                          <td className="px-4 py-3 text-right text-white/80">
                            {formatNumber(row.clicks)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-6 text-center text-white/45"
                        >
                          No destination data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TableCard>
          </div>
        </section>

        <section className="mt-6">
          <TableCard
            title="Top Shows"
            subtitle="Most-clicked shows based on provider redirect traffic."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {topShows.length ? (
                topShows.map((show) => (
                  <Link
                    key={show.tmdb_show_id}
                    href={`/tv/${show.tmdb_show_id}`}
                    className="group flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                  >
                    <div className="h-[120px] w-[82px] shrink-0 overflow-hidden rounded-2xl bg-white/[0.06]">
                      {show.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={show.posterUrl}
                          alt={show.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                          No Poster
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-base font-semibold text-white group-hover:text-emerald-300">
                        {show.title}
                      </div>
                      <div className="mt-2 text-sm text-white/55">
                        TMDB ID: {show.tmdb_show_id}
                      </div>
                      <div className="mt-1 text-sm text-white/55">
                        First Air Date: {formatDateOnly(show.firstAirDate)}
                      </div>
                      <div className="mt-4 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                        {formatNumber(show.clicks)} clicks
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-white/45">
                  No show click data yet.
                </div>
              )}
            </div>
          </TableCard>
        </section>

        <section className="mt-6">
          <TableCard
            title="Recent Clicks"
            subtitle="Latest provider redirect activity."
          >
            <div className="overflow-hidden rounded-2xl border border-white/8">
              <table className="min-w-full divide-y divide-white/8 text-sm">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Show
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Surface
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Destination
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-white/60">
                      Country
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {recent.length ? (
                    recent.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-white/80">
                          {formatDateTime(row.clicked_at)}
                        </td>
                        <td className="px-4 py-3 text-white">
                          {row.tmdb_show_id ? (
                            <Link
                              href={`/tv/${row.tmdb_show_id}`}
                              className="transition hover:text-emerald-300"
                            >
                              TMDB {row.tmdb_show_id}
                            </Link>
                          ) : (
                            "Unknown"
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {slugToLabel(row.service_slug)}
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {slugToLabel(row.source_surface)}
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {slugToLabel(row.destination_type)}
                        </td>
                        <td className="px-4 py-3 text-white/80">
                          {row.country_code || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-white/45"
                      >
                        No recent clicks found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </section>
      </div>
    </main>
  );
}