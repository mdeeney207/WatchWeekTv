import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getSafeNext(next: string | null): string {
  if (!next) return "/calendar";
  if (!next.startsWith("/")) return "/calendar";
  if (next.startsWith("//")) return "/calendar";
  return next;
}

function getRequestCookies(request: Request): Array<{ name: string; value: string }> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...rest] = part.split("=");
      return {
        name,
        value: rest.join("="),
      };
    })
    .filter((cookie) => Boolean(cookie.name));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNext(url.searchParams.get("next"));
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getRequestCookies(request);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options: CookieOptions;
            }) => {
              response.cookies.set(name, value, options);
            }
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      status: error.status,
      codeLength: code.length,
      next,
      origin,
    });

    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return response;
}