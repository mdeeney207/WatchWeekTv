// app/accessibility/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const principles = [
  {
    title: "Readable by default",
    body: "WatchWeek should prioritize legible typography, clean spacing, strong visual hierarchy, and layouts that do not force users to fight the interface.",
  },
  {
    title: "Clear interaction patterns",
    body: "Navigation, actions, and content structure should feel predictable across the product so users can move through the experience with confidence.",
  },
  {
    title: "Accessible across devices",
    body: "Accessibility is not limited to one screen size. The product should remain usable across desktop, tablet, and mobile environments.",
  },
  {
    title: "Improvement over time",
    body: "Accessibility is an ongoing product standard, not a one-time checkbox. The platform should improve as the experience matures.",
  },
];

const currentFocus = [
  "Readable typography and restrained visual density",
  "Consistent navigation and content structure",
  "Support for keyboard-friendly interaction patterns",
  "Improved contrast awareness across dark UI surfaces",
  "Clear labeling for important product sections and actions",
];

const futureAreas = [
  "Expanded keyboard navigation validation",
  "Better assistive technology testing",
  "More explicit focus state refinement",
  "Improved motion sensitivity controls where needed",
  "Broader accessibility guidance across new features",
];

const commitmentSignals = [
  { label: "Priority", value: "Readability" },
  { label: "Focus", value: "Clarity" },
  { label: "Standard", value: "Ongoing" },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Eyebrow({
  children,
  emerald,
}: {
  children: React.ReactNode;
  emerald?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-flex h-[6px] w-[6px] shrink-0 rounded-full"
        style={{
          background: emerald ? "#34d399" : "rgba(255,255,255,0.62)",
          boxShadow: emerald ? "0 0 10px rgba(52,211,153,0.9)" : "none",
        }}
      />
      <div
        className="h-px w-6 rounded-full"
        style={{
          background: emerald
            ? "linear-gradient(90deg, rgba(52,211,153,0.72), rgba(255,255,255,0.12))"
            : "linear-gradient(90deg, rgba(255,255,255,0.34), rgba(255,255,255,0.08))",
        }}
      />
      <p
        className="text-[11px] font-black uppercase tracking-[0.28em]"
        style={{
          color: emerald ? "rgba(110,231,183,0.96)" : "rgba(255,255,255,0.70)",
        }}
      >
        {children}
      </p>
    </div>
  );
}

function Card({
  children,
  className,
  emerald,
}: {
  children: React.ReactNode;
  className?: string;
  emerald?: boolean;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[24px]", className)}
      style={{
        background: emerald
          ? "linear-gradient(145deg, rgba(52,211,153,0.08) 0%, rgba(16,16,16,0.98) 100%)"
          : "linear-gradient(145deg, rgba(26,26,26,0.98) 0%, rgba(12,12,12,0.98) 100%)",
        border: emerald
          ? "1px solid rgba(52,211,153,0.28)"
          : "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "0 24px 64px -36px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: emerald
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.60) 30%, rgba(52,211,153,0.60) 70%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.34) 30%, rgba(255,255,255,0.34) 70%, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl"
        style={{
          background: emerald ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.025)",
          transform: "translate(25%,-25%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function AccessibilityPage() {
  return (
    <PageShell>
      <main className="pb-20 pt-10 md:pb-24 md:pt-14">
        <PageWrap>
          <section
            className="relative overflow-hidden rounded-[30px] px-6 py-8 md:px-10 md:py-12 xl:px-12"
            style={{
              background:
                "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.04) inset, 0 48px 120px -48px rgba(0,0,0,1)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.40) 25%, rgba(255,255,255,0.40) 75%, transparent 95%)",
              }}
            />
            <div
              className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full blur-3xl"
              style={{
                background: "rgba(52,211,153,0.09)",
                transform: "translate(-30%,-30%)",
              }}
            />
            <div
              className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full blur-3xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                transform: "translate(16%,-16%)",
              }}
            />

            <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:items-stretch">
              <div className="max-w-4xl py-2">
                <Eyebrow emerald>Accessibility</Eyebrow>

                <h1
                  className="mt-5 font-black leading-[0.94] tracking-[-0.055em] text-white"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 4.7rem)" }}
                >
                  WatchWeek should be{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    clear,
                  </span>{" "}
                  usable, and{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    readable
                  </span>{" "}
                  for more people by default.
                </h1>

                <p
                  className="mt-6 max-w-[58ch] text-[16px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.84)" }}
                >
                  Accessibility is part of product quality, not an afterthought.
                  WatchWeek is being built with the goal of making streaming
                  discovery, release tracking, and calendar planning easier to
                  use across devices, screen sizes, and interaction styles.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/support"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                      boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                    }}
                  >
                    Visit Support
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                    style={{
                      color: "rgba(255,255,255,0.94)",
                      border: "1px solid rgba(255,255,255,0.20)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    Contact WatchWeek
                  </Link>
                </div>
              </div>

              <Card emerald className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <Eyebrow emerald>Accessibility view</Eyebrow>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: "#d1fae5",
                      background: "rgba(52,211,153,0.14)",
                      border: "1px solid rgba(52,211,153,0.26)",
                    }}
                  >
                    Active work
                  </span>
                </div>

                <h2
                  className="mt-4 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
                >
                  Premium design only works if people can actually use it.
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {commitmentSignals.map((item, index) => (
                    <div
                      key={item.label}
                      className="rounded-[16px] px-4 py-4"
                      style={{
                        background:
                          index === 0 ? "rgba(52,211,153,0.10)" : "rgba(0,0,0,0.26)",
                        border:
                          index === 0
                            ? "1px solid rgba(52,211,153,0.22)"
                            : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="text-[11px] font-black uppercase tracking-[0.20em]"
                        style={{
                          color:
                            index === 0 ? "#a7f3d0" : "rgba(255,255,255,0.62)",
                        }}
                      >
                        {item.label}
                      </div>
                      <div className="mt-2 text-[18px] font-black leading-tight text-white">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  className="mt-5 text-[14px] leading-[1.75]"
                  style={{ color: "rgba(255,255,255,0.84)" }}
                >
                  Better contrast, cleaner hierarchy, clearer navigation, and
                  more predictable interaction patterns all make the product more
                  useful for everyone, not just a small group of users.
                </p>
              </Card>
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {principles.map((item, index) => (
              <Card
                key={item.title}
                className="p-6"
                emerald={index === 0}
              >
                <h2 className="text-[18px] font-black tracking-tight text-white">
                  {item.title}
                </h2>
                <p
                  className="mt-3 text-[14px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  {item.body}
                </p>
              </Card>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="p-6 md:p-8">
              <Eyebrow>Current focus</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2.3vw, 28px)" }}
              >
                What WatchWeek is aiming to get right now
              </h2>

              <ul className="mt-6 grid gap-3">
                {currentFocus.map((item, index) => (
                  <li
                    key={item}
                    className="rounded-[16px] px-4 py-3.5"
                    style={{
                      background:
                        index === 0 ? "rgba(52,211,153,0.10)" : "rgba(0,0,0,0.26)",
                      border:
                        index === 0
                          ? "1px solid rgba(52,211,153,0.22)"
                          : "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.90)",
                    }}
                  >
                    <span className="text-[14px] font-semibold leading-[1.65]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Future improvements</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2.3vw, 28px)" }}
              >
                Accessibility should improve as the platform grows
              </h2>

              <ul className="mt-6 grid gap-3">
                {futureAreas.map((item) => (
                  <li
                    key={item}
                    className="rounded-[16px] px-4 py-3.5"
                    style={{
                      background: "rgba(0,0,0,0.26)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.90)",
                    }}
                  >
                    <span className="text-[14px] font-semibold leading-[1.65]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-8">
              <Eyebrow>Product standard</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Accessibility is part of trust, not decoration.
              </h2>

              <div
                className="mt-5 space-y-4 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                <p>
                  A premium product should not only look sharp. It should also
                  be understandable, navigable, and less frustrating to use.
                  That means accessibility decisions belong inside the product
                  system, not outside it.
                </p>
                <p>
                  WatchWeek’s dark interface, calendar structure, and content
                  density make clarity especially important. Readability and
                  interaction quality should stay central as the product expands.
                </p>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Feedback path</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Accessibility feedback should have a direct route.
              </h2>

              <div
                className="mt-5 space-y-4 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                <p>
                  If you encounter an accessibility issue, need assistance, or
                  want to report a usability problem, the contact and support
                  pages should be the direct path.
                </p>
                <p>
                  As WatchWeek matures, this page can expand with more specific
                  standards, compatibility notes, and accessibility support
                  details.
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                  style={{
                    color: "rgba(255,255,255,0.94)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Report an issue
                </Link>
              </div>
            </Card>
          </section>

          <section
            className="relative mt-5 overflow-hidden rounded-[28px] px-6 py-10 md:px-10 md:py-12"
            style={{
              background:
                "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.36) 30%, rgba(255,255,255,0.36) 70%, transparent)",
              }}
            />
            <div
              className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full blur-3xl"
              style={{
                background: "rgba(52,211,153,0.06)",
                transform: "translate(20%,-20%)",
              }}
            />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>Keep improving</Eyebrow>
                <h2
                  className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(22px, 2.6vw, 30px)" }}
                >
                  Better accessibility makes the whole product better.
                </h2>
                <p
                  className="mt-3 text-[14px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  The goal is a product that feels premium without becoming hard
                  to use. Accessibility work supports that directly.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/support"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                    boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                  }}
                >
                  Support Center
                </Link>
                <Link
                  href="/about"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                  style={{
                    color: "rgba(255,255,255,0.94)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  About WatchWeek
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}