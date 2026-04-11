// app/terms/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const sections = [
  {
    title: "Using WatchWeek",
    body: [
      "By accessing or using WatchWeek, users agree to use the platform lawfully and in a way that does not harm the service, interfere with other users, or violate applicable rules or agreements.",
      "WatchWeek may update, improve, suspend, or discontinue parts of the platform over time as the product evolves.",
    ],
  },
  {
    title: "Accounts",
    body: [
      "Some features may require an account. Users are responsible for maintaining accurate account information and protecting account access credentials.",
      "WatchWeek may suspend or restrict access where necessary to protect the platform, comply with legal obligations, or address misuse.",
    ],
  },
  {
    title: "Subscriptions and billing",
    body: [
      "If paid plans, premium access, or subscriptions are introduced, additional billing terms may apply. Those terms should be reflected clearly in the product and updated here as monetization goes live.",
      "Pricing, features, availability, and plan structure may change over time.",
    ],
  },
  {
    title: "Content and availability information",
    body: [
      "WatchWeek is designed to help users track releases, timing, and platform availability. Availability information may change, and WatchWeek cannot guarantee that every title, date, provider listing, or release detail will always remain accurate or unchanged.",
      "Streaming platforms control their own catalogs, release timing, and access rules.",
    ],
  },
  {
    title: "Intellectual property",
    body: [
      "The WatchWeek platform, brand, product design, software, content structure, and related materials are protected by applicable intellectual property laws.",
      "Users may not copy, reproduce, distribute, reverse engineer, or misuse the service except as permitted by law or expressly allowed by WatchWeek.",
    ],
  },
  {
    title: "Disclaimers and limitation of liability",
    body: [
      "WatchWeek is provided on an as-available and as-evolving basis. To the extent permitted by law, the platform is provided without warranties of any kind, whether express or implied.",
      "To the extent permitted by law, WatchWeek is not liable for indirect, incidental, consequential, special, or similar damages arising from use of the platform or reliance on platform information.",
    ],
  },
  {
    title: "Changes to these terms",
    body: [
      "WatchWeek may revise these Terms from time to time. Continued use of the platform after updated Terms become effective may constitute acceptance of the revised Terms.",
    ],
  },
];

export default function TermsPage() {
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
                Terms of Service
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Clear terms make the product feel real, fair, and credible.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                These Terms of Service set the basic rules for using WatchWeek.
                This is a foundation version designed to support the product now,
                while leaving room to expand as accounts, subscriptions, and
                platform capabilities mature.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Privacy Policy
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

          <section className="mt-14 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Quick summary
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                WatchWeek is a live product, and these terms set the ground rules.
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  These terms are here to establish the basic user and platform
                  relationship: lawful use, account responsibility, evolving
                  features, and limits around guarantees and liability.
                </p>
                <p>
                  As the platform grows, especially around subscriptions and
                  premium access, this page should be updated to match the live
                  commercial model precisely.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6 md:p-8"
                >
                  <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {section.title}
                  </h2>

                  <div className="mt-4 space-y-4 text-sm leading-7 text-white/68 md:text-[15px]">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  Need clarification?
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Legal and support questions should still have a direct route.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  If you later add a dedicated legal or policy contact, this
                  page is already structured for that next step.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Contact WatchWeek
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