import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const pressTopics = [
  "Company background",
  "Product overview",
  "Platform vision",
  "Media inquiries",
  "Partnership conversations",
];

export default function PressPage() {
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
                Press
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                WatchWeek press and media information.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                This page is the placeholder foundation for future press and media
                materials. As WatchWeek grows, this section can expand into a
                proper press hub with company facts, product details, screenshots,
                brand assets, and contact information.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Contact
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  About WatchWeek
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
                No formal press kit yet.
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  Right now, WatchWeek does not have a full public press kit,
                  newsroom, or media asset package.
                </p>
                <p>
                  This page exists so the product foundation stays complete and
                  the footer does not lead users to dead ends.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Future press kit
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                This page can expand later with:
              </h2>

              <ul className="mt-6 grid gap-3">
                {pressTopics.map((item) => (
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
                  Media inquiries
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  For now, contact is the correct route.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  Until a formal press contact or media kit exists, use the main
                  contact page for press-related outreach.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Open Contact
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Support
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}