// app/devices/page.tsx
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const availableNow = [
  {
    title: "Web",
    body: "WatchWeek is available through the web experience today, giving users a clean way to browse releases, explore what is streaming, and interact with the platform from desktop and mobile browsers.",
    status: "Available now",
  },
];

const plannedPlatforms = [
  {
    title: "iPhone",
    body: "Native iPhone support is part of the product direction so users can track releases, view calendars, and manage what they follow from a polished mobile experience.",
  },
  {
    title: "Android",
    body: "Android support is part of the broader cross-platform direction, bringing WatchWeek to users who want release tracking and streaming awareness on the go.",
  },
  {
    title: "Tablet",
    body: "Tablet layouts can support a richer planning and browsing experience, especially for users managing calendars, release windows, and follow lists.",
  },
  {
    title: "Connected TV",
    body: "Over time, WatchWeek can expand toward larger-screen environments where release awareness, upcoming drops, and watch planning become part of the living room experience.",
  },
];

const principles = [
  "Cross-platform access matters more than platform lock-in",
  "The experience should stay clean and familiar across devices",
  "Core utility should work before adding platform-specific complexity",
  "Availability pages should set expectations clearly and honestly",
];

const rolloutSignals = [
  { label: "Available now", value: "Web" },
  { label: "In progress", value: "Mobile" },
  { label: "Long-term", value: "Living room" },
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

export default function DevicesPage() {
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
                <Eyebrow emerald>Supported devices</Eyebrow>

                <h1
                  className="mt-5 font-black leading-[0.94] tracking-[-0.055em] text-white"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 4.7rem)" }}
                >
                  WatchWeek is being built to work where people actually{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    plan,
                  </span>{" "}
                  browse, and track{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    what to watch.
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-[58ch] text-[16px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  The goal is not to be locked to one screen. WatchWeek is being
                  designed as a streaming calendar and planning layer that can
                  extend across web, mobile, and eventually larger-screen
                  environments where release awareness and watch planning matter
                  most.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/pricing"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                      boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                    }}
                  >
                    View Pricing
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

              <Card emerald className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <Eyebrow emerald>Device view</Eyebrow>
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: "#d1fae5",
                      background: "rgba(52,211,153,0.14)",
                      border: "1px solid rgba(52,211,153,0.26)",
                    }}
                  >
                    Expanding
                  </span>
                </div>

                <h2
                  className="mt-4 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
                >
                  Clear device support matters because streaming is already fragmented.
                </h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {rolloutSignals.map((item, index) => (
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
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  The product should be honest about what works today, what is
                  planned next, and where users should expect the cleanest
                  experience right now.
                </p>
              </Card>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <Card className="p-6 md:p-8">
              <Eyebrow>Available now</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2.3vw, 28px)" }}
              >
                Current access
              </h2>

              <div className="mt-6 space-y-4">
                {availableNow.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[20px] border px-5 py-5"
                    style={{
                      borderColor: "rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-[18px] font-black tracking-tight text-white">
                        {item.title}
                      </h3>
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{
                          color: "#d1fae5",
                          background: "rgba(52,211,153,0.14)",
                          border: "1px solid rgba(52,211,153,0.26)",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p
                      className="mt-3 text-[14px] leading-[1.8]"
                      style={{ color: "rgba(255,255,255,0.82)" }}
                    >
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Planned platforms</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2.3vw, 28px)" }}
              >
                Where WatchWeek is headed next
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {plannedPlatforms.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[20px] border px-5 py-5"
                    style={{
                      borderColor: "rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <h3 className="text-[17px] font-black tracking-tight text-white">
                      {item.title}
                    </h3>
                    <p
                      className="mt-3 text-[14px] leading-[1.8]"
                      style={{ color: "rgba(255,255,255,0.80)" }}
                    >
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-8">
              <Eyebrow>Platform philosophy</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                The product should meet users where they already are.
              </h2>

              <div
                className="mt-5 space-y-4 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                <p>
                  WatchWeek is not trying to force people into one ecosystem. The
                  product is stronger when it acts as a clean layer above the
                  streaming platforms people already use.
                </p>
                <p>
                  That means device support should expand thoughtfully, with real
                  utility on each platform instead of shallow presence
                  everywhere at once.
                </p>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Design principles</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Expectations should stay clear, readable, and honest.
              </h2>

              <ul className="mt-5 space-y-3">
                {principles.map((item, index) => (
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
                <Eyebrow>Need help?</Eyebrow>
                <h2
                  className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(22px, 2.6vw, 30px)" }}
                >
                  Device availability should stay easy to understand.
                </h2>
                <p
                  className="mt-3 text-[14px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.80)" }}
                >
                  Visit support for setup help, compatibility questions, and any
                  updates around where WatchWeek works best today.
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
                  Contact
                </Link>
              </div>
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}