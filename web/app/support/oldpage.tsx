// app/support/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const helpCards = [
  {
    title: "Getting Started",
    body: "Learn the basics of using WatchWeek, from browsing upcoming releases to tracking what you care about.",
    href: "/about",
    cta: "How WatchWeek Works",
  },
  {
    title: "Account & Billing",
    body: "Find answers about account access, subscription questions, billing details, and future premium features.",
    href: "/contact",
    cta: "Contact Support",
  },
  {
    title: "Supported Devices",
    body: "See where WatchWeek works best across web, mobile, and future platform support.",
    href: "/devices",
    cta: "View Devices",
  },
  {
    title: "Accessibility",
    body: "Read how WatchWeek is approaching usability, legibility, and product accessibility across experiences.",
    href: "/accessibility",
    cta: "Accessibility Info",
  },
];

const quickAnswers = [
  {
    q: "What is WatchWeek?",
    a: "WatchWeek is a streaming calendar built to help you track what is coming out, when it drops, and where to watch it across streaming platforms.",
  },
  {
    q: "Does WatchWeek replace Netflix, Hulu, Max, or other services?",
    a: "No. WatchWeek is not a streaming service. It helps you stay organized across the services you already use.",
  },
  {
    q: "Can I track shows and movies I care about?",
    a: "Yes. The product is being built around following releases, upcoming drops, reminders, and a cleaner way to manage what matters to you.",
  },
  {
    q: "Is WatchWeek available everywhere yet?",
    a: "Not fully. The platform is still being built out, with the goal of creating a polished cross-platform experience across web and mobile.",
  },
  {
    q: "How do I get help if something is not working?",
    a: "Use the contact page for direct support requests. Over time, this support center will expand into a fuller help system.",
  },
];

const supportTopics = [
  "Using the calendar",
  "Following shows and movies",
  "Release timing questions",
  "Account access",
  "Billing and subscriptions",
  "Device compatibility",
  "Accessibility questions",
  "General product support",
];

export default function SupportPage() {
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
                Support
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Help for using WatchWeek clearly, quickly, and without the mess.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                This is the foundation of the WatchWeek support layer. The goal
                is simple: make it easy to understand the product, solve common
                questions, and give users a clear path when they need help.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Contact Support
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
            {helpCards.map((card) => (
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
                <Link
                  href={card.href}
                  className="mt-5 inline-flex items-center text-sm font-medium text-white/78 transition hover:text-white"
                >
                  {card.cta}
                </Link>
              </article>
            ))}
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Support scope
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                What this support center is here to help with.
              </h2>

              <ul className="mt-6 grid gap-3">
                {supportTopics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-white/72"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Quick answers
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Common questions, answered clearly.
              </h2>

              <div className="mt-6 space-y-4">
                {quickAnswers.map((item) => (
                  <div
                    key={item.q}
                    className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4"
                  >
                    <h3 className="text-sm font-semibold text-white">
                      {item.q}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-white/65">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            id="billing"
            className="mt-14 grid gap-6 lg:grid-cols-2"
          >
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Account & billing
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Subscription and billing support should be simple.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                As WatchWeek evolves, this section will support account
                questions, subscription details, billing issues, plan changes,
                and premium access support. For now, direct contact is the clean
                path for anything account-related.
              </p>

              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  Get Billing Help
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Product direction
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                This support system will grow with the product.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 md:text-[15px]">
                Today, this page acts as a trust layer and a clean starting
                point. Over time, it can expand into a real help center with
                searchable articles, release timing guidance, feature walkthroughs,
                and account-level troubleshooting.
              </p>
            </div>
          </section>

          <section className="mt-14 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Still need help?
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Reach out directly and we’ll point you in the right direction.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  For support, product questions, billing help, or general
                  contact, use the contact page as the direct path.
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