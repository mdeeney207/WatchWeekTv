import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const hiringAreas = [
  "Product design",
  "Frontend engineering",
  "Backend platform work",
  "Data and release infrastructure",
  "Growth and partnerships",
];

export default function JobsPage() {
  return (
    <PageShell>
      <main className="pb-20 pt-10 md:pb-24 md:pt-14">
        <PageWrap>
          <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:px-10 md:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_30%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(59,130,246,0.10),transparent_24%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
            </div>

            <div className="relative z-10 max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">
                Jobs
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                WatchWeek is not actively posting roles yet.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                This page exists as part of the company foundation so the site
                feels complete and the footer stays clean. When hiring begins, this
                section can expand into a proper careers page with openings,
                hiring priorities, and company information.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  About WatchWeek
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Contact
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Current status
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                No open roles right now.
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  WatchWeek does not currently have public job postings or a formal
                  hiring pipeline listed on the site.
                </p>
                <p>
                  This page is here to keep the company layer complete and give
                  you a clean place to expand later.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Future hiring areas
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                When hiring begins, likely focus areas include:
              </h2>

              <ul className="mt-6 grid gap-3">
                {hiringAreas.map((item) => (
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

          <section className="mt-14 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Interested anyway?
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Contact is the fallback path for now.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  Until formal roles exist, any hiring or team-related outreach
                  should go through the main contact page.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Contact
                </Link>
                <Link
                  href="/press"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Press
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}