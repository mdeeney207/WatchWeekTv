import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const freeFeatures = [
  "Browse TV shows and movies across platforms",
  "See what drops tonight and this week",
  "Basic release tracking and discovery",
  "Clean, readable, ad-light product experience",
];

const premiumFeatures = [
  "Advanced tracking and follow lists",
  "Smart reminders for upcoming drops",
  "Personalized recommendations",
  "Deeper calendar controls and filtering",
  "Cross-platform watch management",
];

const principles = [
  "Useful free experience first",
  "Premium adds control, not confusion",
  "No forced friction just to create upgrades",
  "Organization and timing are the core value",
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

function FeatureRow({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "emerald";
}) {
  const emerald = tone === "emerald";
  return (
    <li
      className="flex items-start gap-3 rounded-[16px] px-4 py-3.5"
      style={{
        background: emerald ? "rgba(52,211,153,0.10)" : "rgba(0,0,0,0.26)",
        border: emerald
          ? "1px solid rgba(52,211,153,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span
        className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full"
        style={{
          background: emerald ? "#34d399" : "rgba(255,255,255,0.34)",
          boxShadow: emerald ? "0 0 8px rgba(52,211,153,0.85)" : "none",
        }}
      />
      <span
        className="text-[14px] font-semibold leading-[1.65]"
        style={{ color: "rgba(255,255,255,0.88)" }}
      >
        {children}
      </span>
    </li>
  );
}

export default function PricingPage() {
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
                <Eyebrow emerald>Plans & pricing</Eyebrow>

                <h1
                  className="mt-5 font-black leading-[0.94] tracking-[-0.055em] text-white"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 4.7rem)" }}
                >
                  Start free. Upgrade when WatchWeek gives you{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    deeper control,
                  </span>{" "}
                  better timing, and{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    stronger planning.
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-[58ch] text-[16px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  WatchWeek is being built to be genuinely useful first. The free
                  experience should stand on its own. Premium should add more
                  power, organization, and personalization for people who want a
                  deeper layer of control.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                      boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                    }}
                  >
                    Start Exploring
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
                    How WatchWeek Works
                  </Link>
                </div>
              </div>

              <Card emerald className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <Eyebrow emerald>Pricing view</Eyebrow>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: "#d1fae5",
                      background: "rgba(52,211,153,0.14)",
                      border: "1px solid rgba(52,211,153,0.26)",
                    }}
                  >
                    Simple
                  </span>
                </div>

                <h2
                  className="mt-4 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
                >
                  Free should be useful. Premium should feel earned.
                </h2>

                <div className="mt-5 space-y-3">
                  {principles.map((item, index) => (
                    <div
                      key={item}
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
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[11px] font-black uppercase tracking-[0.20em]"
                          style={{
                            color: index === 0 ? "#a7f3d0" : "rgba(255,255,255,0.62)",
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="text-[14px] font-semibold leading-[1.65]"
                          style={{ color: "rgba(255,255,255,0.88)" }}
                        >
                          {item}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow>Free</Eyebrow>
                  <h2
                    className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                    style={{ fontSize: "clamp(24px, 2.5vw, 32px)" }}
                  >
                    $0
                  </h2>
                  <p
                    className="mt-3 text-[15px] leading-[1.75]"
                    style={{ color: "rgba(255,255,255,0.80)" }}
                  >
                    A clean starting point for browsing, discovery, and release
                    timing.
                  </p>
                </div>

                <span
                  className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    color: "rgba(255,255,255,0.80)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  Available now
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {freeFeatures.map((feature, index) => (
                  <FeatureRow key={feature} tone={index === 1 ? "emerald" : "default"}>
                    {feature}
                  </FeatureRow>
                ))}
              </ul>

              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex h-11 w-full items-center justify-center rounded-[14px] px-6 text-[14px] font-black text-black transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                    boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                  }}
                >
                  Use Free
                </Link>
              </div>
            </Card>

            <Card emerald className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow emerald>Premium</Eyebrow>
                  <h2
                    className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                    style={{ fontSize: "clamp(24px, 2.5vw, 32px)" }}
                  >
                    Planned
                  </h2>
                  <p
                    className="mt-3 text-[15px] leading-[1.75]"
                    style={{ color: "rgba(255,255,255,0.84)" }}
                  >
                    More control, reminders, filters, and personalization for
                    people who want a deeper WatchWeek experience.
                  </p>
                </div>

                <span
                  className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{
                    color: "#d1fae5",
                    background: "rgba(52,211,153,0.14)",
                    border: "1px solid rgba(52,211,153,0.26)",
                  }}
                >
                  Coming soon
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {premiumFeatures.map((feature, index) => (
                  <FeatureRow key={feature} tone={index === 0 ? "emerald" : "default"}>
                    {feature}
                  </FeatureRow>
                ))}
              </ul>

              <div className="mt-6">
                <button
                  disabled
                  className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-[14px] px-6 text-[14px] font-black"
                  style={{
                    color: "rgba(255,255,255,0.60)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  Not yet available
                </button>
              </div>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-8">
              <Eyebrow>Philosophy</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Build value first. Charge second.
              </h2>
              <p
                className="mt-4 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                WatchWeek should not lock basic usefulness behind aggressive
                paywalls too early. The product should earn upgrades by being
                genuinely helpful before asking people to pay for more depth.
              </p>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Direction</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Premium should feel optional, not forced.
              </h2>
              <p
                className="mt-4 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                As WatchWeek grows, premium should focus on stronger control,
                better organization, smarter reminders, and deeper tracking, not
                by stripping away the core value of the free experience.
              </p>
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
                <Eyebrow>Get started</Eyebrow>
                <h2
                  className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(22px, 2.6vw, 30px)" }}
                >
                  Start using WatchWeek today.
                </h2>
                <p
                  className="mt-3 text-[14px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.80)" }}
                >
                  Explore what is streaming, track upcoming releases, and build a
                  cleaner personal calendar around what you actually care about.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                    boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                  }}
                >
                  Open WatchWeek
                </Link>
                <Link
                  href="/support"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                  style={{
                    color: "rgba(255,255,255,0.94)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.06)",
                  }}
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