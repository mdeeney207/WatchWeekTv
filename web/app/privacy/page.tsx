// app/privacy/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const sections = [
  {
    title: "Information WatchWeek may collect",
    body: [
      "WatchWeek may collect information you provide directly, such as account details, contact information, support requests, preferences, saved items, and other information submitted through the product.",
      "WatchWeek may also collect usage data related to how the platform is used, including interactions with pages, features, device/browser details, and general analytics needed to improve product performance and reliability.",
    ],
  },
  {
    title: "How information may be used",
    body: [
      "Information may be used to operate, maintain, improve, secure, and support the WatchWeek platform.",
      "That includes powering core features, improving release tracking and product experience, responding to support requests, communicating service updates, and understanding how the platform is being used.",
    ],
  },
  {
    title: "Sharing and disclosure",
    body: [
      "WatchWeek does not position itself as a data resale business. Information may be shared only as needed to operate the product, comply with law, protect users, or work with service providers that help run the platform.",
      "Examples may include hosting, analytics, authentication, communications, payment processing, and customer support infrastructure.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "Information may be retained for as long as reasonably necessary to operate the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security and business records.",
      "Retention periods may vary depending on the type of information and the purpose for which it was collected.",
    ],
  },
  {
    title: "Security",
    body: [
      "WatchWeek aims to use reasonable administrative, technical, and organizational measures to protect information. No system can promise absolute security, but protecting user trust is part of the product standard.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "Users may have the ability to update account information, adjust preferences, and contact WatchWeek regarding support or privacy-related questions.",
      "As the product evolves, this section can expand to include more specific rights, controls, and jurisdiction-specific disclosures.",
    ],
  },
];

export default function PrivacyPage() {
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
                Privacy Policy
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Privacy should be clear, readable, and grounded in trust.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-7 text-white/68 md:text-lg md:leading-8">
                This Privacy Policy explains, at a high level, how WatchWeek may
                collect, use, store, and protect information in connection with
                the platform. This page is intended to provide a clean legal and
                trust foundation and can be expanded as the product and data
                flows mature.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/terms"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Terms of Service
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
                The goal is to collect only what is needed to run the product well.
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-7 text-white/68 md:text-[15px]">
                <p>
                  WatchWeek is being built as a product users can trust. That
                  means clarity about data use, restraint around collection, and
                  a platform approach that respects the user relationship instead
                  of exploiting it.
                </p>
                <p>
                  This document is a foundation version. As authentication,
                  billing, communications, analytics, and personalization evolve,
                  the policy should be updated to reflect the live system
                  accurately.
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
                  Questions
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Privacy questions should have a direct path.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65 md:text-[15px]">
                  If you want to add a privacy contact email later, this page is
                  already structured for it.
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