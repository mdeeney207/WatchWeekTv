// app/about/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const pillars = [
  {
    title: "Track the real drop",
    body: "WatchWeek is built around when content actually lands. Not vague discovery. Not endless browsing. Real release timing, organized into a system you can use.",
  },
  {
    title: "Know where it streams",
    body: "Shows and movies do not live in one place anymore. WatchWeek is designed to sit above the fragmented streaming landscape and give you one clear view across services.",
  },
  {
    title: "Turn chaos into a calendar",
    body: "The goal is simple: make streaming feel organized again. Tonight, this week, upcoming drops, reminders, follow lists, and eventually live events — all in one product layer.",
  },
];

const principles = [
  "Premium product feel over clutter",
  "Useful information over fake engagement",
  "Calendar-first thinking, not content spam",
  "Cross-service visibility instead of platform lock-in",
  "A real operating layer for streaming, not just another catalog",
];

export default function AboutPage() {
  return (
    <PageShell>
      <main className="pb-20 pt-10 md:pb-24 md:pt-14">
        <PageWrap>
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:px-10 md:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_32%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.10),transparent_26%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
            </div>

            <div className="relative z-10 max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                About WatchWeek
              </div>

                <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                The streaming calendar that shows you what’s worth watching —
                and exactly when it drops.
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                Streaming platforms are everywhere, but the experience is fragmented.
                WatchWeek sits above the ecosystem, giving you a single, clean view of
                upcoming releases, timing, and availability so you can stop searching
                and start knowing.
                </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/tv"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Explore TV
                </Link>
                <Link
                  href="/movies"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Explore Movies
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Why WatchWeek exists
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Streaming became easier to access — and harder to manage.
              </h2>

              <div className="mt-5 space-y-5 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  Every service wants to be your home screen. None of them are
                  built to be your universal control layer.
                </p>

                <p>
                  You can open Netflix and see Netflix. You can open Max and see
                  Max. But users increasingly live across multiple services,
                  release calendars, recommendation loops, and live event windows.
                  The ecosystem is fragmented, and the burden of keeping up has
                  been pushed onto the viewer.
                </p>

                <p>
                  WatchWeek is meant to fix that. It is not another streaming
                  service. It is not trying to replace the platforms. It is being
                  built to organize them — with a calendar mindset, clean
                  prioritization, and a premium product experience that respects
                  your time.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Product principles
              </p>

              <ul className="mt-5 space-y-3">
                {principles.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-white/72"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-14">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                What the product is built to do
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Less browsing. More signal.
              </h2>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6"
                >
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    {pillar.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Today
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                A premium release calendar for modern streaming.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                Today, WatchWeek is focused on building a polished foundation:
                cleaner discovery, stronger release timing, sharper navigation,
                and a product surface that feels trustworthy and premium instead
                of noisy and disposable.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Tomorrow
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                The long-term goal is bigger than TV rails.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                The long-term vision is a true streaming OS: a unified layer for
                shows, movies, drop schedules, reminders, provider awareness, and
                eventually major live events that people actually plan around. Not
                just content discovery — real scheduling utility.
              </p>
            </div>
          </section>

          <section className="mt-14 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Get started
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  WatchWeek is being built to help people stop missing what they
                  actually care about.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  Explore the platform, track upcoming releases, and follow the
                  content that matters to you across the streaming ecosystem.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/calendar"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Open Calendar
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Visit Support
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}