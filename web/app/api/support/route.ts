// app/api/support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportPayload = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 4000);
}

// ─── Transporter ─────────────────────────────────────────────────────────────
//
// Works with any SMTP provider — Resend, SendGrid, Postmark, Gmail, etc.
// Set these env vars in your .env.local / Vercel dashboard:
//
//   SMTP_HOST      e.g. smtp.resend.com
//   SMTP_PORT      e.g. 465 (SSL) or 587 (TLS)
//   SMTP_SECURE    "true" for port 465, "false" for 587
//   SMTP_USER      your SMTP username / API key
//   SMTP_PASS      your SMTP password / API secret
//   SMTP_FROM      the From address, e.g. "WatchWeek <noreply@watchweektv.com>"
//
// If you use Resend specifically, set:
//   SMTP_HOST=smtp.resend.com
//   SMTP_PORT=465
//   SMTP_SECURE=true
//   SMTP_USER=resend
//   SMTP_PASS=re_YOUR_API_KEY
//   SMTP_FROM=WatchWeek <noreply@watchweektv.com>

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
  const secure = process.env.SMTP_SECURE !== "false"; // default true
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SupportPayload>;

    const name    = sanitize(body.name);
    const email   = sanitize(body.email);
    const topic   = sanitize(body.topic) || "General question";
    const message = sanitize(body.message);

    // Validate
    if (!name)                   return NextResponse.json({ error: "Name is required."    }, { status: 400 });
    if (!email)                  return NextResponse.json({ error: "Email is required."   }, { status: 400 });
    if (!isValidEmail(email))    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    if (!message)                return NextResponse.json({ error: "Message is required." }, { status: 400 });
    if (message.length < 10)     return NextResponse.json({ error: "Message is too short." }, { status: 400 });

    // Optionally capture the authenticated user ID for the log
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet) {
              try {
                const mutableStore = cookieStore as unknown as {
                  set: (name: string, value: string, options?: CookieOptions) => void;
                };
                cookiesToSet.forEach(({ name: n, value: v, options }) => mutableStore.set(n, v, options));
              } catch {}
            },
          },
        }
      );
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {}

    // Format timestamps
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Build the email
    const toAddress = "support@watchweektv.com";
    const fromAddress = process.env.SMTP_FROM ?? `WatchWeek Support <noreply@watchweektv.com>`;

    const subject = `[WatchWeek Support] ${topic} — from ${name}`;

    const textBody = [
      `New support message from watchweektv.com`,
      ``,
      `Name:     ${name}`,
      `Email:    ${email}`,
      `Topic:    ${topic}`,
      `User ID:  ${userId ?? "Not signed in"}`,
      `Time:     ${timestamp}`,
      ``,
      `─── Message ───────────────────────────────────────────`,
      ``,
      message,
      ``,
      `───────────────────────────────────────────────────────`,
      ``,
      `Reply directly to this email to respond to ${name}.`,
    ].join("\n");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; padding: 0; background: #080808; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .card { background: #161616; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(145deg, #1c1c1c, #111); padding: 28px 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: 0.3em; text-transform: uppercase; color: #34d399; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.04em; margin: 0; }
    .body { padding: 24px 28px; }
    .field { margin-bottom: 16px; }
    .label { font-size: 10px; font-weight: 900; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255,255,255,0.38); margin-bottom: 6px; }
    .value { font-size: 14px; color: rgba(255,255,255,0.88); font-weight: 600; }
    .message-box { background: rgba(0,0,0,0.30); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-top: 20px; }
    .message-label { font-size: 10px; font-weight: 900; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255,255,255,0.38); margin-bottom: 10px; }
    .message-text { font-size: 14px; color: rgba(255,255,255,0.80); line-height: 1.72; white-space: pre-wrap; }
    .footer { padding: 16px 28px 24px; border-top: 1px solid rgba(255,255,255,0.07); }
    .footer-text { font-size: 12px; color: rgba(255,255,255,0.36); line-height: 1.6; }
    .reply-chip { display: inline-block; margin-top: 10px; background: rgba(52,211,153,0.14); border: 1px solid rgba(52,211,153,0.30); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #6ee7b7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="eyebrow">WatchWeek Support</div>
        <h1 class="title">New support message</h1>
      </div>
      <div class="body">
        <div class="field">
          <div class="label">From</div>
          <div class="value">${escapeHtml(name)}</div>
        </div>
        <div class="field">
          <div class="label">Reply to</div>
          <div class="value"><a href="mailto:${escapeHtml(email)}" style="color:#6ee7b7;">${escapeHtml(email)}</a></div>
        </div>
        <div class="field">
          <div class="label">Topic</div>
          <div class="value">${escapeHtml(topic)}</div>
        </div>
        <div class="field">
          <div class="label">User ID</div>
          <div class="value" style="color:rgba(255,255,255,0.52);">${escapeHtml(userId ?? "Not signed in")}</div>
        </div>
        <div class="field">
          <div class="label">Submitted</div>
          <div class="value" style="color:rgba(255,255,255,0.52);">${escapeHtml(timestamp)}</div>
        </div>
        <div class="message-box">
          <div class="message-label">Message</div>
          <div class="message-text">${escapeHtml(message)}</div>
        </div>
      </div>
      <div class="footer">
        <div class="footer-text">
          Reply directly to this email to respond to ${escapeHtml(name)}.
        </div>
        <a class="reply-chip" href="mailto:${escapeHtml(email)}">Reply to ${escapeHtml(name)}</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send
    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      replyTo: `${name} <${email}>`,
      subject,
      text: textBody,
      html: htmlBody,
    });

    // Also send a confirmation to the user
    const confirmSubject = "We received your message — WatchWeek Support";
    const confirmText = [
      `Hi ${name},`,
      ``,
      `Thanks for reaching out. We received your message and will respond within one business day.`,
      ``,
      `Topic: ${topic}`,
      ``,
      `Your message:`,
      `──────────────────────────────────────`,
      message,
      `──────────────────────────────────────`,
      ``,
      `You can reach us at support@watchweektv.com if you have anything to add.`,
      ``,
      `— The WatchWeek Team`,
    ].join("\n");

    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: confirmSubject,
      text: confirmText,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[/api/support] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send message." },
      { status: 500 }
    );
  }
}

// ─── HTML escape ──────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}