import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
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

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  return webhookSecret;
}

function toIsoDate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function subscriptionGrantsAccess(
  status: Stripe.Subscription.Status | null | undefined
) {
  return status === "active" || status === "trialing" || status === "past_due";
}

function inferWillRenew(subscription: Stripe.Subscription) {
  if (subscription.cancel_at_period_end) return false;

  return (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due"
  );
}

function getPlanDetails(planOrPriceId: string | null | undefined) {
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;

  if (
    planOrPriceId === monthlyPriceId ||
    planOrPriceId === "watchweek_premium_monthly"
  ) {
    return {
      planCode: "watchweek_premium_monthly",
      planName: "WatchWeek Premium Monthly",
    };
  }

  if (
    planOrPriceId === annualPriceId ||
    planOrPriceId === "watchweek_premium_annual"
  ) {
    return {
      planCode: "watchweek_premium_annual",
      planName: "WatchWeek Premium Annual",
    };
  }

  return {
    planCode: "watchweek_premium",
    planName: "WatchWeek Premium",
  };
}

function getObjectUserId(
  obj:
    | { metadata?: Record<string, string | null | undefined> | null }
    | null
    | undefined
) {
  const userId = obj?.metadata?.user_id;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function getExpandableId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function logWebhook(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[stripe-webhook] ${message}`, details);
    return;
  }

  console.log(`[stripe-webhook] ${message}`);
}

type ExistingBillingCustomerRow = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan_code: string | null;
  plan_name: string | null;
  current_period_end: string | null;
  will_cancel_at_period_end: boolean | null;
  amount_cents: number | null;
  currency: string | null;
  provider: string | null;
  checkout_session_id: string | null;
};

async function findUserIdByStripeRefs(params: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const supabase = getSupabaseAdmin();

  if (params.stripeSubscriptionId) {
    const { data, error } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_subscription_id", params.stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.user_id) {
      return data.user_id as string;
    }
  }

  if (params.stripeCustomerId) {
    const { data, error } = await supabase
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", params.stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.user_id) {
      return data.user_id as string;
    }
  }

  return null;
}

async function getExistingBillingCustomerRow(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("billing_customers")
    .select(
      `
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      plan_code,
      plan_name,
      current_period_end,
      will_cancel_at_period_end,
      amount_cents,
      currency,
      provider,
      checkout_session_id
    `
    )
    .eq("user_id", userId)
    .maybeSingle<ExistingBillingCustomerRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertBillingCustomerRow(input: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  planCode?: string | null;
  planName?: string | null;
  currentPeriodEnd?: string | null;
  willCancelAtPeriodEnd?: boolean | null;
  amountCents?: number | null;
  currency?: string | null;
  checkoutSessionId?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const existing = await getExistingBillingCustomerRow(input.userId);

  const payload = {
    user_id: input.userId,
    stripe_customer_id:
      input.stripeCustomerId !== undefined
        ? input.stripeCustomerId
        : existing?.stripe_customer_id ?? null,
    stripe_subscription_id:
      input.stripeSubscriptionId !== undefined
        ? input.stripeSubscriptionId
        : existing?.stripe_subscription_id ?? null,
    subscription_status:
      input.subscriptionStatus !== undefined
        ? input.subscriptionStatus
        : existing?.subscription_status ?? null,
    plan_code:
      input.planCode !== undefined
        ? input.planCode
        : existing?.plan_code ?? null,
    plan_name:
      input.planName !== undefined
        ? input.planName
        : existing?.plan_name ?? null,
    current_period_end:
      input.currentPeriodEnd !== undefined
        ? input.currentPeriodEnd
        : existing?.current_period_end ?? null,
    will_cancel_at_period_end:
      input.willCancelAtPeriodEnd !== undefined
        ? input.willCancelAtPeriodEnd
        : existing?.will_cancel_at_period_end ?? null,
    amount_cents:
      input.amountCents !== undefined
        ? input.amountCents
        : existing?.amount_cents ?? null,
    currency:
      input.currency !== undefined
        ? input.currency
        : existing?.currency ?? null,
    provider: "stripe",
    checkout_session_id:
      input.checkoutSessionId !== undefined
        ? input.checkoutSessionId
        : existing?.checkout_session_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("billing_customers")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    throw error;
  }
}

async function applyEntitlementState(input: {
  userId: string;
  isActive: boolean;
  planCode: string;
  currentPeriodEnd: string | null;
  willRenew: boolean | null;
}) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc(
    "billing_apply_watchweek_premium_state",
    {
      p_user_id: input.userId,
      p_is_active: input.isActive,
      p_provider: "stripe",
      p_product_id: input.planCode,
      p_current_period_end: input.currentPeriodEnd,
      p_will_renew: input.willRenew,
    }
  );

  if (error) {
    throw error;
  }
}

async function retrieveCheckoutSessionTruth(sessionId: string) {
  const stripe = getStripe();

  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });
}

async function retrieveSubscriptionTruth(subscriptionId: string) {
  const stripe = getStripe();

  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer"],
  });
}

async function syncSubscriptionById(
  subscriptionId: string,
  forcedUserId?: string | null,
  context?: Record<string, unknown>
) {
  const subscription = await retrieveSubscriptionTruth(subscriptionId);
  await syncSubscription(subscription, forcedUserId, context);
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  forcedUserId?: string | null,
  context?: Record<string, unknown>
) {
  const stripeCustomerId = getExpandableId(subscription.customer);

  const userId =
    forcedUserId ??
    getObjectUserId(subscription) ??
    (await findUserIdByStripeRefs({
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
    }));

  if (!userId) {
    logWebhook("subscription sync could not resolve WatchWeek user", {
      subscriptionId: subscription.id,
      stripeCustomerId,
      status: subscription.status,
      ...context,
    });
    return;
  }

  const primaryItem = subscription.items.data[0] ?? null;
  const primaryPrice = primaryItem?.price ?? null;
  const fallbackPlanFromMetadata = subscription.metadata?.plan_code ?? null;

  const plan = getPlanDetails(primaryPrice?.id ?? fallbackPlanFromMetadata);
  const currentPeriodEnd = toIsoDate(subscription.current_period_end);
  const grantsAccess = subscriptionGrantsAccess(subscription.status);
  const willRenew = inferWillRenew(subscription);

  logWebhook("syncing subscription to WatchWeek", {
    subscriptionId: subscription.id,
    stripeCustomerId,
    userId,
    status: subscription.status,
    planCode: plan.planCode,
    currentPeriodEnd,
    ...context,
  });

  await upsertBillingCustomerRow({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planCode: plan.planCode,
    planName: plan.planName,
    currentPeriodEnd,
    willCancelAtPeriodEnd: subscription.cancel_at_period_end,
    amountCents: primaryPrice?.unit_amount ?? null,
    currency: primaryPrice?.currency ?? null,
  });

  await applyEntitlementState({
    userId,
    isActive: grantsAccess,
    planCode: plan.planCode,
    currentPeriodEnd,
    willRenew,
  });

  logWebhook("subscription sync complete", {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status,
    planCode: plan.planCode,
    ...context,
  });
}

async function syncCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    logWebhook("ignoring non-subscription checkout session", {
      sessionId: session.id,
      mode: session.mode,
    });
    return;
  }

  const freshSession = await retrieveCheckoutSessionTruth(session.id);

  const userId =
    (typeof freshSession.client_reference_id === "string" &&
    freshSession.client_reference_id.length > 0
      ? freshSession.client_reference_id
      : null) ??
    getObjectUserId(freshSession) ??
    (typeof session.client_reference_id === "string" &&
    session.client_reference_id.length > 0
      ? session.client_reference_id
      : null) ??
    getObjectUserId(session);

  const stripeCustomerId =
    getExpandableId(freshSession.customer) ?? getExpandableId(session.customer);

  const stripeSubscriptionId =
    getExpandableId(freshSession.subscription) ??
    getExpandableId(session.subscription);

  logWebhook("checkout.session.completed received", {
    sessionId: session.id,
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    mode: freshSession.mode,
  });

  if (!userId) {
    logWebhook("checkout.session.completed missing user_id", {
      sessionId: session.id,
      stripeCustomerId,
      stripeSubscriptionId,
    });
    return;
  }

  await upsertBillingCustomerRow({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    checkoutSessionId: session.id,
  });

  if (!stripeSubscriptionId) {
    logWebhook("checkout.session.completed missing subscription after re-fetch", {
      sessionId: session.id,
      userId,
      stripeCustomerId,
    });
    return;
  }

  await syncSubscriptionById(stripeSubscriptionId, userId, {
    sourceEvent: "checkout.session.completed",
    sessionId: session.id,
  });
}

async function syncInvoice(invoice: Stripe.Invoice) {
  const stripeCustomerId = getExpandableId(invoice.customer);
  const stripeSubscriptionId = getExpandableId(invoice.subscription);
  const userId =
    getObjectUserId(invoice) ??
    (await findUserIdByStripeRefs({
      stripeCustomerId,
      stripeSubscriptionId,
    }));

  logWebhook("invoice event received", {
    invoiceId: invoice.id,
    stripeCustomerId,
    stripeSubscriptionId,
    userId,
    billingReason: invoice.billing_reason,
    status: invoice.status,
  });

  if (!stripeSubscriptionId) {
    logWebhook("invoice event missing subscription id", {
      invoiceId: invoice.id,
      stripeCustomerId,
      userId,
    });
    return;
  }

  await syncSubscriptionById(stripeSubscriptionId, userId, {
    sourceEvent: "invoice",
    invoiceId: invoice.id,
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature header" },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed", error);

      const message =
        error instanceof Error ? error.message : "Invalid Stripe webhook";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    logWebhook("event received", {
      eventId: event.id,
      eventType: event.type,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription, null, {
          sourceEvent: event.type,
          eventId: event.id,
        });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await syncInvoice(invoice);
        break;
      }

      default: {
        logWebhook("ignoring unhandled event", {
          eventId: event.id,
          eventType: event.type,
        });
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("POST /api/stripe/webhook failed", error);

    const message =
      error instanceof Error ? error.message : "Unexpected webhook error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}