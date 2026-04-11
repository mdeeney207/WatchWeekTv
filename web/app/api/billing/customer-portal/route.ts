import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, anonKey };
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey);
}

function createSupabaseRouteClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // no-op
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient(request);
    const stripe = getStripeClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: billingRow, error: billingError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingError) {
      throw billingError;
    }

    if (!billingRow?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer is mapped to this account yet. Your checkout/webhook flow must write billing_customers first.",
        },
        { status: 400 }
      );
    }

    const baseSiteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      request.nextUrl.origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: billingRow.stripe_customer_id,
      return_url: `${baseSiteUrl}/portal`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create billing portal session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}