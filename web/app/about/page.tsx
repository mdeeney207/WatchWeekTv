import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

const pillars = [
  {
    icon: "◷",
    title: "Track the real drop",
    body: "WatchWeek is built around when content actually lands. Not vague discovery. Not endless browsing. Real release timing, organized into a system you can actually use.",
  },
  {
    icon: "⬡",
    title: "Know where it streams",
    body: "Shows and movies do not live in one place anymore. WatchWeek sits above a fragmented streaming landscape and gives you one clearer view across services.",
  },
  {
    icon: "◈",
    title: "Turn chaos into a calendar",
    body: "The goal is simple: make streaming feel organized again with tonight, this week, upcoming drops, reminders, follow lists, and eventually major live events.",
  },
];

const principles = [
  "Readable, premium design over dim decorative styling",
  "Useful information over fake engagement",
  "Calendar-first thinking, not content spam",
  "Cross-service visibility instead of platform lock-in",
  "A real planning layer for streaming, not just another catalog",
];

const productMoments = [
  {
    label: "Tonight",
    title: "See what actually drops tonight",
    body: "Stop bouncing across apps to figure out what is new.",
    tone: "emerald",
  },
  {
    label: "This Week",
    title: "Plan your watch week clearly",
    body: "Know what is worth your attention before it slips by.",
    tone: "default",
  },
  {
    label: "Where to Watch",
    title: "Keep service sprawl under control",
    body: "Get a cleaner view across the platforms you already pay for.",
    tone: "default",
  },
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

function DashboardPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "emerald";
}) {
  const emerald = tone === "emerald";
  return (
    <div
      className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.02em]"
      style={{
        color: emerald ? "#d1fae5" : "rgba(255,255,255,0.84)",
        background: emerald ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.07)",
        border: emerald
          ? "1px solid rgba(52,211,153,0.30)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: emerald ? "0 0 20px -12px rgba(52,211,153,0.55)" : "none",
      }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <main
        className="min-h-screen pb-24 pt-10 text-white md:pt-14"
        style={{ background: "#080808" }}
      >
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(255,255,255,0.03),transparent)]" />
        <div
          className="pointer-events-none fixed left-0 top-0 h-[500px] w-[500px] rounded-full blur-3xl"
          style={{
            background: "rgba(52,211,153,0.04)",
            transform: "translate(-35%,-35%)",
          }}
        />

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

            <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-stretch">
              <div className="max-w-4xl py-2">
                <Eyebrow emerald>About WatchWeek</Eyebrow>

                <h1
                  className="mt-5 font-black leading-[0.94] tracking-[-0.055em] text-white"
                  style={{ fontSize: "clamp(2.4rem, 5.4vw, 5rem)" }}
                >
                  The streaming calendar that helps you know{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    what matters,
                  </span>{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    when it drops,
                  </span>{" "}
                  and{" "}
                  <span style={{ color: "rgba(255,255,255,0.72)" }}>
                    where to watch.
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-[58ch] text-[16px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  Streaming platforms are everywhere, but the experience is still
                  fragmented. WatchWeek sits above that ecosystem and gives you a
                  cleaner view of upcoming releases, timing, and availability so
                  you can stop searching, stop missing drops, and stay organized.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/tv"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                      boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                    }}
                  >
                    Explore TV
                  </Link>
                  <Link
                    href="/movies"
                    className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                    style={{
                      color: "rgba(255,255,255,0.94)",
                      border: "1px solid rgba(255,255,255,0.20)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    Explore Movies
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  <DashboardPill tone="emerald">Drops Tonight</DashboardPill>
                  <DashboardPill>This Week</DashboardPill>
                  <DashboardPill>Upcoming Releases</DashboardPill>
                  <DashboardPill>Provider Awareness</DashboardPill>
                </div>
              </div>

              <div className="relative">
                <div className="grid h-full gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <Card className="p-5 md:p-6" emerald>
                    <div className="flex items-center justify-between gap-4">
                      <Eyebrow emerald>Live view</Eyebrow>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{
                          color: "#d1fae5",
                          background: "rgba(52,211,153,0.14)",
                          border: "1px solid rgba(52,211,153,0.26)",
                        }}
                      >
                        Active
                      </span>
                    </div>

                    <h2
                      className="mt-4 font-black leading-tight tracking-[-0.04em] text-white"
                      style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
                    >
                      A clearer way to plan your watch week.
                    </h2>

                    <div className="mt-5 space-y-3">
                      {productMoments.map((item) => (
                        <div
                          key={item.title}
                          className="rounded-[16px] px-4 py-4"
                          style={{
                            background:
                              item.tone === "emerald"
                                ? "rgba(52,211,153,0.10)"
                                : "rgba(0,0,0,0.26)",
                            border:
                              item.tone === "emerald"
                                ? "1px solid rgba(52,211,153,0.22)"
                                : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className="text-[11px] font-black uppercase tracking-[0.20em]"
                              style={{
                                color:
                                  item.tone === "emerald"
                                    ? "#a7f3d0"
                                    : "rgba(255,255,255,0.62)",
                              }}
                            >
                              {item.label}
                            </span>
                            <span
                              className="inline-flex h-2 w-2 rounded-full"
                              style={{
                                background:
                                  item.tone === "emerald"
                                    ? "#34d399"
                                    : "rgba(255,255,255,0.24)",
                                boxShadow:
                                  item.tone === "emerald"
                                    ? "0 0 10px rgba(52,211,153,0.9)"
                                    : "none",
                              }}
                            />
                          </div>
                          <h3 className="mt-2 text-[16px] font-black leading-tight text-white">
                            {item.title}
                          </h3>
                          <p
                            className="mt-2 text-[14px] leading-[1.7]"
                            style={{ color: "rgba(255,255,255,0.78)" }}
                          >
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                    {[
                      { label: "Services", value: "8+" },
                      { label: "Focus", value: "Timing" },
                      { label: "Goal", value: "Clarity" },
                    ].map((item) => (
                      <Card key={item.label} className="p-4">
                        <p
                          className="text-[11px] font-black uppercase tracking-[0.22em]"
                          style={{ color: "rgba(255,255,255,0.64)" }}
                        >
                          {item.label}
                        </p>
                        <p
                          className="mt-3 text-[24px] font-black leading-none tracking-[-0.04em]"
                          style={{
                            color: "#ffffff",
                            textShadow: "0 0 24px rgba(255,255,255,0.04)",
                          }}
                        >
                          {item.value}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-6 md:p-8">
              <Eyebrow>Why WatchWeek exists</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2.3vw, 28px)" }}
              >
                Streaming became easier to access and harder to manage.
              </h2>

              <div
                className="mt-5 space-y-4 text-[15px] leading-[1.82]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                <p>
                  Every service wants to be your home screen. None of them are
                  built to be your universal planning layer.
                </p>
                <p>
                  You can open Netflix and see Netflix. You can open Max and see
                  Max. But most people now live across multiple services, release
                  calendars, recommendation loops, and event windows. The
                  ecosystem is fragmented, and the burden of keeping up has been
                  pushed onto the viewer.
                </p>
                <p>
                  WatchWeek is built to help fix that. It is not another
                  streaming service. It is not trying to replace the platforms.
                  It is being built to organize them with a calendar mindset,
                  cleaner prioritization, and a product experience that respects
                  your time.
                </p>
              </div>
            </Card>

            <Card emerald className="p-6 md:p-8">
              <Eyebrow emerald>Product principles</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                Five standards that guide the product.
              </h2>

              <ul className="mt-5 space-y-2.5">
                {principles.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-[16px] px-4 py-3.5"
                    style={{
                      background: "rgba(0,0,0,0.28)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <span
                      className="mt-0.5 shrink-0 text-[12px] font-black tabular-nums"
                      style={{ color: "#a7f3d0" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[14px] font-semibold leading-[1.6]"
                      style={{ color: "rgba(255,255,255,0.90)" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="mt-5">
            <div className="mb-6 max-w-3xl">
              <Eyebrow>What the product is built to do</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(24px, 2.8vw, 34px)" }}
              >
                Less browsing.{" "}
                <span style={{ color: "rgba(255,255,255,0.72)" }}>More signal.</span>
              </h2>
              <p
                className="mt-3 max-w-[60ch] text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                WatchWeek is being designed to help people spend less time
                hunting through apps and more time knowing what is actually worth
                their attention.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pillars.map((pillar) => (
                <Card
                  key={pillar.title}
                  className="group p-6 transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[14px] text-[20px]"
                    style={{
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.24)",
                      color: "#6ee7b7",
                      boxShadow: "0 0 24px -8px rgba(52,211,153,0.26)",
                    }}
                  >
                    {pillar.icon}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[24px]"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(52,211,153,0.54), rgba(52,211,153,0.14) 60%, transparent)",
                    }}
                  />

                  <h3 className="text-[18px] font-black leading-tight tracking-[-0.03em] text-white">
                    {pillar.title}
                  </h3>
                  <p
                    className="mt-3 text-[14px] leading-[1.75]"
                    style={{ color: "rgba(255,255,255,0.80)" }}
                  >
                    {pillar.body}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
                    style={{ boxShadow: "0 0 8px rgba(52,211,153,1)" }}
                  />
                </span>
                <Eyebrow emerald>Today</Eyebrow>
              </div>

              <h2
                className="font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                A release calendar built for modern streaming.
              </h2>
              <p
                className="mt-3 text-[14px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                Today, WatchWeek is focused on building a polished foundation:
                stronger release timing, sharper navigation, better watch
                planning, and a product surface that feels trustworthy instead of
                noisy.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {[
                  { label: "Streaming services", value: "8+" },
                  { label: "Release tracking", value: "Live" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-[16px] px-4 py-3.5"
                    style={{
                      background: "rgba(0,0,0,0.28)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p
                      className="text-[11px] font-black uppercase tracking-[0.22em]"
                      style={{ color: "rgba(255,255,255,0.68)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="mt-2 text-[22px] font-black tabular-nums leading-none tracking-[-0.04em]"
                      style={{
                        color: "#6ee7b7",
                        textShadow: "0 0 24px rgba(52,211,153,0.36)",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <Eyebrow>Tomorrow</Eyebrow>
              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(20px, 2vw, 24px)" }}
              >
                The long-term goal is bigger than simple content rails.
              </h2>
              <p
                className="mt-3 text-[14px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                The long-term vision is a unified planning layer for shows,
                movies, drop schedules, reminders, provider awareness, and major
                live events that people actually plan around.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  "Unified cross-service release calendar",
                  "Smart reminders and drop alerts",
                  "Live event scheduling and tracking",
                  "A cleaner control layer above streaming services",
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3"
                    style={{
                      background: "rgba(0,0,0,0.24)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      opacity: 1 - i * 0.08,
                    }}
                  >
                    <span
                      className="inline-flex h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: i === 0 ? "#34d399" : "rgba(255,255,255,0.32)",
                        boxShadow: i === 0 ? "0 0 6px rgba(52,211,153,0.8)" : "none",
                      }}
                    />
                    <span
                      className="text-[13px] font-semibold leading-[1.55]"
                      style={{
                        color:
                          i === 0
                            ? "rgba(255,255,255,0.92)"
                            : "rgba(255,255,255,0.76)",
                      }}
                    >
                      {item}
                    </span>
                    {i === 0 && (
                      <span
                        className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]"
                        style={{
                          background: "rgba(52,211,153,0.14)",
                          border: "1px solid rgba(52,211,153,0.28)",
                          color: "#6ee7b7",
                        }}
                      >
                        Now
                      </span>
                    )}
                  </div>
                ))}
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
                <Eyebrow>Get started</Eyebrow>
                <h2
                  className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(22px, 2.6vw, 30px)" }}
                >
                  WatchWeek is being built to help people stop missing what they
                  actually care about.
                </h2>
                <p
                  className="mt-3 text-[14px] leading-[1.8]"
                  style={{ color: "rgba(255,255,255,0.80)" }}
                >
                  Explore the platform, track upcoming releases, and follow the
                  content that matters to you across the streaming ecosystem.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href="/calendar"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-7 text-[14px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                    boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                  }}
                >
                  Open Calendar
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