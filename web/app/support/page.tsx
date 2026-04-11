"use client";

// app/support/page.tsx
import Link from "next/link";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

// ─── Data ─────────────────────────────────────────────────────────────────────

const helpCards = [
  {
    title: "Getting Started",
    body: "Learn how WatchWeek works, from tracking upcoming releases to building a cleaner watch routine across the services you already use.",
    href: "/about",
    cta: "How WatchWeek Works",
    icon: "▶",
  },
  {
    title: "Account & Billing",
    body: "Get help with account access, subscription questions, billing issues, and premium-related support as the product expands.",
    href: "#contact",
    cta: "Contact Support",
    icon: "◎",
  },
  {
    title: "Supported Devices",
    body: "See where WatchWeek works today across web and mobile, plus how platform support is expected to grow over time.",
    href: "/devices",
    cta: "View Devices",
    icon: "⬡",
  },
  {
    title: "Accessibility",
    body: "Read how WatchWeek is approaching usability, readability, and product accessibility across the entire experience.",
    href: "/accessibility",
    cta: "Accessibility Info",
    icon: "◈",
  },
];

const quickAnswers = [
  {
    q: "What is WatchWeek?",
    a: "WatchWeek is a streaming calendar that helps you track what is coming out, when it drops, and where to watch it across streaming services.",
  },
  {
    q: "Does WatchWeek replace Netflix, Hulu, Max, or other services?",
    a: "No. WatchWeek is not a streaming service. It helps you stay organized across the services you already pay for and use.",
  },
  {
    q: "Can I track shows and movies I care about?",
    a: "Yes. WatchWeek is built around following releases, seeing what drops next, managing reminders, and keeping your watchlist more useful.",
  },
  {
    q: "Is WatchWeek available everywhere yet?",
    a: "Not fully. The platform is being built toward a polished cross-platform experience across web and mobile, with broader support over time.",
  },
  {
    q: "How do I get help if something is not working?",
    a: "Use the contact form on this page. Messages go directly to support@watchweektv.com and every request gets a response.",
  },
];

const supportTopics = [
  "Using the release calendar",
  "Following shows and movies",
  "Release timing questions",
  "Account access",
  "Billing and subscriptions",
  "Device compatibility",
  "Accessibility questions",
  "General product support",
];

const topicOptions = [
  "General question",
  "Account & billing",
  "Bug report",
  "Feature request",
  "Release timing",
  "Device compatibility",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({
  children,
  className,
  emerald = false,
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
          ? "linear-gradient(145deg, rgba(38,38,38,0.98) 0%, rgba(12,12,12,0.98) 100%)"
          : "linear-gradient(145deg, rgba(26,26,26,0.98) 0%, rgba(10,10,10,0.98) 100%)",
        border: emerald
          ? "1px solid rgba(52,211,153,0.24)"
          : "1px solid rgba(255,255,255,0.14)",
        boxShadow:
          "0 30px 80px -40px rgba(0,0,0,0.98), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: emerald
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.55) 30%, rgba(52,211,153,0.55) 70%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.30) 30%, rgba(255,255,255,0.30) 70%, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full blur-3xl"
        style={{
          background: emerald
            ? "rgba(52,211,153,0.08)"
            : "rgba(255,255,255,0.03)",
          transform: "translate(25%, -25%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function Eyebrow({
  children,
  emerald = false,
}: {
  children: React.ReactNode;
  emerald?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-flex h-[6px] w-[6px] shrink-0 rounded-full"
        style={{
          background: emerald ? "#34d399" : "rgba(255,255,255,0.58)",
          boxShadow: emerald ? "0 0 10px rgba(52,211,153,0.95)" : "none",
        }}
      />
      <p
        className="text-[11px] font-black uppercase tracking-[0.30em]"
        style={{
          color: emerald
            ? "rgba(110,231,183,0.90)"
            : "rgba(255,255,255,0.60)",
        }}
      >
        {children}
      </p>
    </div>
  );
}

function getInputStyle(focused: boolean): React.CSSProperties {
  return {
    background: focused ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.34)",
    border: focused
      ? "1px solid rgba(255,255,255,0.26)"
      : "1px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
    outline: "none",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.04)" : "none",
  };
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-[18px] transition-all duration-200"
      style={{
        background: open ? "rgba(52,211,153,0.06)" : "rgba(0,0,0,0.28)",
        border: open
          ? "1px solid rgba(52,211,153,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="text-[15px] font-black leading-snug tracking-[-0.02em] text-white">
          {q}
        </span>
        <span
          className="shrink-0 text-[20px] font-black transition-transform duration-200"
          style={{
            color: open ? "#6ee7b7" : "rgba(255,255,255,0.50)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          +
        </span>
      </button>

      {open && (
        <div
          className="px-5 pb-5 text-[14px] leading-[1.75] sm:px-6 sm:pb-6"
          style={{ color: "rgba(255,255,255,0.76)" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Contact form ─────────────────────────────────────────────────────────────

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(topicOptions[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string }).error || "Failed to send message."
        );
      }

      setStatus("success");
      setName("");
      setEmail("");
      setTopic(topicOptions[0]);
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-emerald-400"
          style={{
            background: "rgba(52,211,153,0.14)",
            border: "1px solid rgba(52,211,153,0.34)",
            boxShadow: "0 0 32px rgba(52,211,153,0.22)",
          }}
        >
          ✓
        </div>

        <h3
          className="mt-5 font-black leading-tight tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(22px, 2.1vw, 28px)" }}
        >
          Message sent.
        </h3>

        <p
          className="mt-3 max-w-[36ch] text-[14px] leading-[1.72]"
          style={{ color: "rgba(255,255,255,0.78)" }}
        >
          We received your message and will reply to{" "}
          <span style={{ color: "#ffffff" }}>{email}</span> within one business
          day.
        </p>

        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[13px] font-semibold underline underline-offset-4 transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            placeholder="Jane Smith"
            required
            className="h-12 w-full rounded-[15px] px-4 text-[15px] placeholder:text-zinc-500"
            style={getInputStyle(focused === "name")}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            placeholder="you@example.com"
            required
            className="h-12 w-full rounded-[15px] px-4 text-[15px] placeholder:text-zinc-500"
            style={getInputStyle(focused === "email")}
          />
        </div>
      </div>

      <div>
        <label
          className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          Topic
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onFocus={() => setFocused("topic")}
          onBlur={() => setFocused(null)}
          className="h-12 w-full cursor-pointer rounded-[15px] px-4 text-[15px]"
          style={getInputStyle(focused === "topic")}
        >
          {topicOptions.map((t) => (
            <option key={t} value={t} style={{ background: "#161616" }}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setFocused("message")}
          onBlur={() => setFocused(null)}
          placeholder="Describe what you need help with…"
          required
          rows={6}
          className="w-full resize-none rounded-[15px] px-4 py-3 text-[15px] leading-relaxed placeholder:text-zinc-500"
          style={getInputStyle(focused === "message")}
        />
      </div>

      {status === "error" && (
        <p
          className="rounded-[14px] px-4 py-3 text-[13px] font-semibold"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.24)",
            color: "#fca5a5",
          }}
        >
          {errorMsg}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
          Sends directly to{" "}
          <span style={{ color: "#ffffff" }}>support@watchweektv.com</span>
        </p>

        <button
          type="submit"
          disabled={
            status === "sending" || !name.trim() || !email.trim() || !message.trim()
          }
          className="inline-flex h-12 items-center justify-center rounded-[15px] px-7 text-[15px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
            boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
          }}
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <PageShell>
      <main
        className="relative min-h-screen overflow-hidden pb-24 pt-8 md:pt-10"
        style={{ background: "#070707" }}
      >
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(255,255,255,0.035),transparent)]" />
        <div
          className="pointer-events-none fixed left-0 top-0 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{
            background: "rgba(52,211,153,0.045)",
            transform: "translate(-34%, -34%)",
          }}
        />
        <div
          className="pointer-events-none fixed right-0 top-[18%] h-[420px] w-[420px] rounded-full blur-3xl"
          style={{
            background: "rgba(255,255,255,0.025)",
            transform: "translate(26%, -18%)",
          }}
        />

        <PageWrap>
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section
            className="relative overflow-hidden rounded-[30px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12"
            style={{
              background:
                "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03) inset, 0 48px 120px -52px rgba(0,0,0,1)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.38) 24%, rgba(255,255,255,0.38) 76%, transparent 95%)",
              }}
            />
            <div
              className="pointer-events-none absolute left-0 top-0 h-[360px] w-[360px] rounded-full blur-3xl"
              style={{
                background: "rgba(52,211,153,0.08)",
                transform: "translate(-30%, -30%)",
              }}
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-end">
              <div className="relative max-w-3xl">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span
                      className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
                      style={{ boxShadow: "0 0 10px rgba(52,211,153,1)" }}
                    />
                  </span>
                  <span
                    className="text-[11px] font-black uppercase tracking-[0.30em]"
                    style={{ color: "rgba(255,255,255,0.66)" }}
                  >
                    WatchWeek Support
                  </span>
                </div>

                <h1
                  className="mt-5 font-black leading-[0.94] tracking-[-0.06em] text-white"
                  style={{ fontSize: "clamp(2.2rem, 5vw, 4.4rem)" }}
                >
                  Real help.
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.56)" }}>
                    Clear answers.
                  </span>
                </h1>

                <p
                  className="mt-5 max-w-[56ch] text-[16px] leading-[1.78] sm:text-[17px]"
                  style={{ color: "rgba(255,255,255,0.84)" }}
                >
                  Find answers fast, browse support topics, or send us a message
                  directly. WatchWeek support is built to be readable, direct,
                  and easy to use when something needs attention.
                </p>

                <p
                  className="mt-4 max-w-[56ch] text-[14px] leading-[1.78] sm:text-[15px]"
                  style={{ color: "rgba(255,255,255,0.66)" }}
                >
                  Every support request goes to{" "}
                  <span style={{ color: "#ffffff" }}>support@watchweektv.com</span>{" "}
                  and every message gets a response.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#contact"
                    className="inline-flex h-12 items-center justify-center rounded-[15px] px-6 text-[15px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                      boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                    }}
                  >
                    Contact Support
                  </a>

                  <Link
                    href="/about"
                    className="inline-flex h-12 items-center justify-center rounded-[15px] px-6 text-[15px] font-semibold transition-all hover:bg-white/[0.08]"
                    style={{
                      color: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(255,255,255,0.20)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    About WatchWeek
                  </Link>
                </div>
              </div>

              <div
                className="relative rounded-[24px] p-5 sm:p-6"
                style={{
                  background: "rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div className="space-y-3">
                  {[
                    { label: "Support email", value: "support@watchweektv.com" },
                    { label: "Response target", value: "Within 1 business day" },
                    { label: "Coverage", value: "Accounts, devices, releases, billing" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[16px] px-4 py-4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p
                        className="text-[11px] font-black uppercase tracking-[0.22em]"
                        style={{ color: "rgba(255,255,255,0.54)" }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="mt-2 text-[15px] font-semibold leading-snug"
                        style={{ color: "#ffffff" }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Help cards ──────────────────────────────────────────────── */}
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {helpCards.map((card) => (
              <Card key={card.title} className="p-6">
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] text-[15px]"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(255,255,255,0.70)",
                  }}
                >
                  {card.icon}
                </div>

                <h2 className="text-[17px] font-black leading-tight tracking-[-0.03em] text-white">
                  {card.title}
                </h2>

                <p
                  className="mt-3 text-[14px] leading-[1.75]"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  {card.body}
                </p>

                <Link
                  href={card.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold transition hover:text-white"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  {card.cta}
                  <span style={{ color: "rgba(255,255,255,0.42)" }}>→</span>
                </Link>
              </Card>
            ))}
          </section>

          {/* ── Topics + FAQ ─────────────────────────────────────────────── */}
          <section className="mt-5 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <Card className="p-6 md:p-7 lg:p-8">
              <Eyebrow>Support scope</Eyebrow>

              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2vw, 28px)" }}
              >
                What this support center covers.
              </h2>

              <p
                className="mt-3 max-w-[52ch] text-[15px] leading-[1.78]"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                Use this page for product questions, account issues, release
                timing questions, compatibility concerns, and general help using
                WatchWeek.
              </p>

              <ul className="mt-6 space-y-2.5">
                {supportTopics.map((topic) => (
                  <li
                    key={topic}
                    className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                    style={{
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: "#34d399",
                        boxShadow: "0 0 8px rgba(52,211,153,0.9)",
                      }}
                    />
                    <span
                      className="text-[14px] font-semibold leading-snug"
                      style={{ color: "rgba(255,255,255,0.88)" }}
                    >
                      {topic}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 md:p-7 lg:p-8">
              <Eyebrow>Quick answers</Eyebrow>

              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(22px, 2vw, 28px)" }}
              >
                Common questions, answered clearly.
              </h2>

              <p
                className="mt-3 max-w-[58ch] text-[15px] leading-[1.78]"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                The goal is simple: fewer vague answers, less buried information,
                and a support page that is actually easy to scan.
              </p>

              <div className="mt-6 space-y-3">
                {quickAnswers.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </Card>
          </section>

          {/* ── Billing + Product direction ─────────────────────────────── */}
          <section id="billing" className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="p-6 md:p-7 lg:p-8">
              <Eyebrow>Account &amp; billing</Eyebrow>

              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(21px, 2vw, 26px)" }}
              >
                Subscription support should feel straightforward.
              </h2>

              <p
                className="mt-3 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                As WatchWeek grows, this section will support billing issues,
                subscription questions, plan changes, and premium access help
                with a more complete knowledge base behind it.
              </p>

              <p
                className="mt-3 text-[14px] leading-[1.78]"
                style={{ color: "rgba(255,255,255,0.66)" }}
              >
                Right now, direct support is the cleanest and fastest path.
              </p>

              <div className="mt-6">
                <a
                  href="#contact"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-[14px] font-semibold transition-all hover:bg-white/[0.08]"
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Get billing help →
                </a>
              </div>
            </Card>

            <Card className="p-6 md:p-7 lg:p-8">
              <Eyebrow>Product direction</Eyebrow>

              <h2
                className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                style={{ fontSize: "clamp(21px, 2vw, 26px)" }}
              >
                This support page grows with the product.
              </h2>

              <p
                className="mt-3 text-[15px] leading-[1.8]"
                style={{ color: "rgba(255,255,255,0.80)" }}
              >
                Today, this page is a clean support layer and trust surface.
                Over time, it should become a fuller help center with searchable
                articles, feature walkthroughs, release timing guidance, and
                account troubleshooting.
              </p>

              <p
                className="mt-3 text-[14px] leading-[1.78]"
                style={{ color: "rgba(255,255,255,0.66)" }}
              >
                The design direction stays the same: premium, readable, and easy
                to use under pressure.
              </p>
            </Card>
          </section>

          {/* ── Contact form ─────────────────────────────────────────────── */}
          <section id="contact" className="mt-5 scroll-mt-6">
            <Card emerald className="p-6 md:p-8 lg:p-10">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
                <div>
                  <Eyebrow emerald>Contact support</Eyebrow>

                  <h2
                    className="mt-3 font-black leading-tight tracking-[-0.055em] text-white"
                    style={{ fontSize: "clamp(24px, 2.8vw, 36px)" }}
                  >
                    Reach out.
                    <br />
                    We read every message.
                  </h2>

                  <p
                    className="mt-4 text-[15px] leading-[1.8]"
                    style={{ color: "rgba(255,255,255,0.84)" }}
                  >
                    Fill out the form and your message goes directly to{" "}
                    <span style={{ color: "#ffffff" }}>
                      support@watchweektv.com
                    </span>
                    .
                  </p>

                  <p
                    className="mt-3 text-[14px] leading-[1.78]"
                    style={{ color: "rgba(255,255,255,0.68)" }}
                  >
                    We respond to every request, typically within one business
                    day.
                  </p>

                  <div className="mt-7 space-y-3">
                    {[
                      {
                        label: "Email",
                        value: "support@watchweektv.com",
                      },
                      {
                        label: "Response time",
                        value: "Within 1 business day",
                      },
                      {
                        label: "Hours",
                        value: "Mon – Fri, 9am – 6pm ET",
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 rounded-[15px] px-4 py-3.5"
                        style={{
                          background: "rgba(0,0,0,0.34)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <span
                          className="text-[11px] font-black uppercase tracking-[0.20em]"
                          style={{ color: "rgba(255,255,255,0.52)" }}
                        >
                          {label}
                        </span>
                        <span
                          className="text-right text-[14px] font-semibold leading-snug"
                          style={{ color: "#ffffff" }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="rounded-[22px] p-5 sm:p-6"
                  style={{
                    background: "rgba(0,0,0,0.30)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <ContactForm />
                </div>
              </div>
            </Card>
          </section>

          {/* ── Footer CTA ──────────────────────────────────────────────── */}
          <section
            className="relative mt-5 overflow-hidden rounded-[24px] p-7 md:p-9"
            style={{
              background:
                "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(10,10,10,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 30%, rgba(255,255,255,0.28) 70%, transparent)",
              }}
            />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <Eyebrow>Still need help?</Eyebrow>

                <h2
                  className="mt-3 font-black leading-tight tracking-[-0.04em] text-white"
                  style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}
                >
                  Reach out and we’ll point you in the right direction.
                </h2>

                <p
                  className="mt-3 text-[15px] leading-[1.78]"
                  style={{ color: "rgba(255,255,255,0.76)" }}
                >
                  For support, product questions, billing help, or general
                  contact, the form above is the fastest path.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#contact"
                  className="inline-flex h-12 items-center justify-center rounded-[15px] px-6 text-[15px] font-black text-black transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                    boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
                  }}
                >
                  Open contact form
                </a>

                <Link
                  href="/privacy"
                  className="inline-flex h-12 items-center justify-center rounded-[15px] px-6 text-[15px] font-semibold transition-all hover:bg-white/[0.08]"
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                  }}
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