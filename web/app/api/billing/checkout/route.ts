import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

type CheckoutPlan = "monthly" | "annual";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  }

  return siteUrl.replace(/\/+$/, "");
}

function normalizePlan(value: unknown): CheckoutPlan | null {
  if (value === "monthly" || value === "annual") return value;
  return null;
}

function getPlanConfig(plan: CheckoutPlan) {
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;

  if (plan === "monthly") {
    if (!monthlyPriceId) {
      throw new Error("Missing STRIPE_MONTHLY_PRICE_ID");
    }

    return {
      priceId: monthlyPriceId,
      planCode: "watchweek_premium_monthly",
      planName: "WatchWeek Premium Monthly",
      interval: "monthly" as const,
    };
  }

  if (!annualPriceId) {
    throw new Error("Missing STRIPE_ANNUAL_PRICE_ID");
  }

  return {
    priceId: annualPriceId,
    planCode: "watchweek_premium_annual",
    planName: "WatchWeek Premium Annual",
    interval: "annual" as const,
  };
}

function isPremiumLikeStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing" || status === "past_due";
}

function isStripeManagedStatus(status: string | null | undefined) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "incomplete"
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const admin = getSupabaseAdmin();
    const stripe = getStripe();
    const siteUrl = getSiteUrl();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const plan = normalizePlan(
      typeof body === "object" && body !== null && "plan" in body
        ? (body as { plan?: unknown }).plan
        : undefined
    );

    if (!plan) {
      return NextResponse.json(
        { error: "Plan must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    const planConfig = getPlanConfig(plan);

    const [billingRowResult, entitlementResult] = await Promise.all([
      admin
        .from("billing_customers")
        .select(
          `
          user_id,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_status,
          provider,
          plan_code,
          plan_name,
          current_period_end,
          will_cancel_at_period_end,
          amount_cents,
          currency,
          checkout_session_id
        `
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("entitlements")
        .select(
          `
          user_id,
          provider,
          product_id,
          status,
          current_period_end,
          will_renew
        `
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (billingRowResult.error) {
      console.error("billing_customers lookup failed", billingRowResult.error);
      return NextResponse.json(
        { error: "Failed to read billing state." },
        { status: 500 }
      );
    }

    if (entitlementResult.error) {
      console.error("entitlements lookup failed", entitlementResult.error);
      return NextResponse.json(
        { error: "Failed to read entitlement state." },
        { status: 500 }
      );
    }

    const billingRow = billingRowResult.data;
    const entitlementRow = entitlementResult.data;

    if (
      entitlementRow &&
      isPremiumLikeStatus(entitlementRow.status) &&
      (entitlementRow.provider === "apple" ||
        entitlementRow.provider === "google")
    ) {
      return NextResponse.json(
        {
          error:
            entitlementRow.provider === "apple"
              ? "Your WatchWeek Premium subscription is managed by Apple. Manage billing in the App Store."
              : "Your WatchWeek Premium subscription is managed by Google Play. Manage billing in Google Play.",
          storeManaged: true,
          provider: entitlementRow.provider,
        },
        { status: 409 }
      );
    }

    if (
      billingRow?.provider === "stripe" &&
      billingRow.stripe_customer_id &&
      isStripeManagedStatus(billingRow.subscription_status)
    ) {
      return NextResponse.json(
        {
          error: "Stripe billing already exists for this account.",
          stripeManaged: true,
        },
        { status: 409 }
      );
    }

    let stripeCustomerId = billingRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: `${siteUrl}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal?checkout=canceled`,
      allow_promotion_codes: true,
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_code: planConfig.planCode,
        plan_interval: planConfig.interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_code: planConfig.planCode,
          plan_interval: planConfig.interval,
        },
      },
    });

    const { error: upsertError } = await admin
      .from("billing_customers")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          provider: "stripe",
          checkout_session_id: session.id,
          plan_code: planConfig.planCode,
          plan_name: planConfig.planName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("billing_customers upsert failed", upsertError);
      return NextResponse.json(
        { error: "Failed to save checkout state." },
        { status: 500 }
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("POST /api/billing/checkout failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected checkout error.",
      },
      { status: 500 }
    );
  }
}