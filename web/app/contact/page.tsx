// app/contact/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const contactReasons = [
  {
    title: "Support",
    body: "Questions about using WatchWeek, product issues, account access, or anything that is not working as expected.",
  },
  {
    title: "Billing",
    body: "Subscription questions, payment issues, plan changes, or future premium access support.",
  },
  {
    title: "Partnerships",
    body: "Business inquiries, platform opportunities, media requests, or strategic conversations.",
  },
  {
    title: "Feedback",
    body: "Product ideas, feature requests, UX feedback, or anything that would make WatchWeek better.",
  },
];

const contactOptions = [
  {
    label: "General Support",
    value: "Support inquiries and product help",
  },
  {
    label: "Account & Billing",
    value: "Subscription and account questions",
  },
  {
    label: "Partnerships",
    value: "Business and media inquiries",
  },
  {
    label: "Product Feedback",
    value: "Ideas, suggestions, and improvements",
  },
];

export default function ContactPage() {
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
                Contact
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Reach out for support, billing, feedback, or business inquiries.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                WatchWeek is being built as a premium product experience, and the
                contact layer should feel the same way: clear, direct, and easy
                to use. This page gives users and partners a clean place to start.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Visit Support
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

          <section className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {contactReasons.map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6"
              >
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {card.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  {card.body}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Contact categories
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                What you can contact WatchWeek about.
              </h2>

              <div className="mt-6 space-y-3">
                {contactOptions.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-white">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm text-white/65">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Current contact path
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Direct contact details can plug in here cleanly.
              </h2>

              <div className="mt-5 space-y-5 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  Right now, this page is structured as the trust and routing
                  layer for contact. Once your final support email, form endpoint,
                  or business contact address is ready, this section can be
                  updated without redesigning the page.
                </p>

                <p>
                  Recommended next step is to insert a real contact email or a
                  lightweight contact form so users are not hitting a dead-end.
                </p>
              </div>

              <div className="mt-6 rounded-[20px] border border-dashed border-white/15 bg-white/[0.02] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                  Replace this block next
                </p>
                <div className="mt-3 space-y-2 text-sm text-white/72">
                  <p>Support email</p>
                  <p>Billing email or routing</p>
                  <p>Business / partnership contact</p>
                  <p>Optional contact form embed</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Product support
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Need help using WatchWeek?
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                Start with the support page for common questions, product
                direction, billing routing, and general help topics. This keeps
                the main support path clear and organized.
              </p>

              <div className="mt-6">
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Go to Support
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Business inquiries
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Partnerships and media should have a clear lane too.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                This page is also the right place for future partner outreach,
                press requests, platform discussions, and strategic inquiries as
                WatchWeek grows.
              </p>
            </div>
          </section>

          <section className="mt-14 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Next best action
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Build this page once, then swap in real contact details.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  The structure is now in place. The next upgrade is replacing the
                  placeholder contact block with a live support email or real form.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Support Center
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}