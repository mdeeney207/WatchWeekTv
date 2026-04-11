import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function getOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  return ALLOWED_TYPES.includes(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

function getSafeNext(next: string | null, type: EmailOtpType | null) {
  const fallback = type === "recovery" ? "/reset-password" : "/calendar";

  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;

  return next;
}

function getFailureError(next: string, type: EmailOtpType | null) {
  return type === "recovery" || next === "/reset-password"
    ? "reset_link_invalid"
    : "auth_callback_failed";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = getOtpType(url.searchParams.get("type"));
  const next = getSafeNext(url.searchParams.get("next"), type);
  const origin = url.origin;

  const failureError = getFailureError(next, type);

  const response = NextResponse.redirect(`${origin}${next}`);
  response.headers.set("Cache-Control", "private, no-store");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // PKCE / SSR callback flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${failureError}`);
    }

    return response;
  }

  // Token-hash callback flow
  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=${failureError}`);
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${failureError}`);
  }

  return response;
}