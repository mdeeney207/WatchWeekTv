import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type NotificationState = {
  episodeDrops: boolean;
  tonightReminders: boolean;
  weeklyPlanning: boolean;
  followedShowUpdates: boolean;
};

type AvailableService = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type PortalState = {
  user: {
    id: string;
    email: string | null;
  };
  subscription: {
    hasBillingCustomer: boolean;
    status: string;
    planCode: string | null;
    planName: string | null;
    currentPeriodEnd: string | null;
    willCancelAtPeriodEnd: boolean;
    amountCents: number | null;
    currency: string | null;
    provider: string | null;
    productId: string | null;
  };
  notifications: NotificationState;
  availableServices: AvailableService[];
  selectedServiceIds: string[];
};

type BillingRow = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  plan_code?: string | null;
  plan_name?: string | null;
  current_period_end?: string | null;
  will_cancel_at_period_end?: boolean | null;
  amount_cents?: number | null;
  currency?: string | null;
  provider?: string | null;
  checkout_session_id?: string | null;
};

type EntitlementRow = {
  tier?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  provider?: string | null;
  product_id?: string | null;
  will_renew?: boolean | null;
};

type NotificationRow = {
  episode_drops?: boolean | null;
  tonight_reminders?: boolean | null;
  weekly_planning?: boolean | null;
  followed_show_updates?: boolean | null;
};

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean | null;
};

type UserServiceRow = {
  service_id: string;
};

const DEFAULT_NOTIFICATIONS: NotificationState = {
  episodeDrops: true,
  tonightReminders: true,
  weeklyPlanning: false,
  followedShowUpdates: true,
};

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return { url, anonKey };
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

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
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
        // No-op in this route. We are only reading/writing user-owned data.
      },
    },
  });
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoDate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function getExpandableId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
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

function normalizeServiceIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();

  for (const value of input) {
    if (typeof value !== "string") continue;

    const normalized = value.trim();
    if (!normalized) continue;
    if (normalized.length > 128) continue;

    seen.add(normalized);
  }

  return [...seen];
}

function normalizeNotifications(input: unknown): NotificationState {
  if (!input || typeof input !== "object") {
    return DEFAULT_NOTIFICATIONS;
  }

  const source = input as Partial<Record<keyof NotificationState, unknown>>;

  return {
    episodeDrops:
      typeof source.episodeDrops === "boolean"
        ? source.episodeDrops
        : DEFAULT_NOTIFICATIONS.episodeDrops,
    tonightReminders:
      typeof source.tonightReminders === "boolean"
        ? source.tonightReminders
        : DEFAULT_NOTIFICATIONS.tonightReminders,
    weeklyPlanning:
      typeof source.weeklyPlanning === "boolean"
        ? source.weeklyPlanning
        : DEFAULT_NOTIFICATIONS.weeklyPlanning,
    followedShowUpdates:
      typeof source.followedShowUpdates === "boolean"
        ? source.followedShowUpdates
        : DEFAULT_NOTIFICATIONS.followedShowUpdates,
  };
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return (
    code === "42P01" ||
    message.toLowerCase().includes("does not exist") ||
    message.toLowerCase().includes("relation") ||
    message.toLowerCase().includes("schema cache")
  );
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return (
    code === "42703" ||
    message.toLowerCase().includes("column") ||
    message.toLowerCase().includes("could not find the") ||
    message.toLowerCase().includes("schema cache")
  );
}

function isOptionalPortalDependencyError(error: unknown) {
  return isMissingRelationError(error) || isMissingColumnError(error);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { raw: String(error) };
    }
  }

  return { raw: String(error) };
}

function isEntitlementActive(
  entitlementRow: EntitlementRow | null | undefined
): boolean {
  if (!entitlementRow) return false;
  if (trimOrNull(entitlementRow.status) !== "active") return false;

  const currentPeriodEnd = trimOrNull(entitlementRow.current_period_end);
  if (!currentPeriodEnd) {
    return true;
  }

  const expiresAt = Date.parse(currentPeriodEnd);
  if (Number.isNaN(expiresAt)) return false;

  return expiresAt > Date.now();
}

function hasRealStripeSubscription(
  billingRow: BillingRow | null | undefined
): boolean {
  if (!billingRow) return false;

  const provider = trimOrNull(billingRow.provider);
  const stripeSubscriptionId = trimOrNull(billingRow.stripe_subscription_id);
  const subscriptionStatus = trimOrNull(billingRow.subscription_status);

  if (provider !== "stripe") {
    return false;
  }

  return Boolean(stripeSubscriptionId || subscriptionStatus);
}

function hasCompletedStripeReconcile(
  billingRow: BillingRow | null | undefined
): boolean {
  return (
    hasRealStripeSubscription(billingRow) &&
    Boolean(trimOrNull(billingRow?.current_period_end))
  );
}

function shouldAttemptCheckoutReconcile(input: {
  checkoutState: string | null;
  requestedSessionId: string | null;
  billingRow: BillingRow | null | undefined;
}) {
  if (input.checkoutState !== "success") {
    return {
      shouldReconcile: false,
      checkoutSessionId: null as string | null,
    };
  }

  const storedSessionId = trimOrNull(input.billingRow?.checkout_session_id);
  const checkoutSessionId = input.requestedSessionId ?? storedSessionId;

  if (!checkoutSessionId) {
    return {
      shouldReconcile: false,
      checkoutSessionId: null as string | null,
    };
  }

  const completed = hasCompletedStripeReconcile(input.billingRow);

  if (input.requestedSessionId) {
    const isSameSuccessfulSession =
      input.requestedSessionId === storedSessionId && completed;

    return {
      shouldReconcile: !isSameSuccessfulSession,
      checkoutSessionId,
    };
  }

  return {
    shouldReconcile: !completed,
    checkoutSessionId,
  };
}

function derivePlanName(
  billingRow: BillingRow | null | undefined,
  entitlementRow: EntitlementRow | null | undefined,
  hasRealBilling: boolean
): string | null {
  if (hasRealBilling) {
    const billingPlanName = trimOrNull(billingRow?.plan_name);
    if (billingPlanName) {
      return billingPlanName;
    }

    const billingPlanCode = trimOrNull(billingRow?.plan_code);
    if (billingPlanCode) {
      const lower = billingPlanCode.toLowerCase();

      if (lower.includes("annual") || lower.includes("year")) {
        return "WatchWeek Premium Annual";
      }

      if (lower.includes("month")) {
        return "WatchWeek Premium Monthly";
      }

      return "WatchWeek Premium";
    }
  }

  const productId = trimOrNull(entitlementRow?.product_id);
  if (!productId) {
    return null;
  }

  const lower = productId.toLowerCase();

  if (lower.includes("annual") || lower.includes("year")) {
    return "WatchWeek Premium Annual";
  }

  if (lower.includes("month")) {
    return "WatchWeek Premium Monthly";
  }

  return "WatchWeek Premium";
}

function deriveProvider(
  billingRow: BillingRow | null | undefined,
  entitlementRow: EntitlementRow | null | undefined,
  entitlementActive: boolean,
  hasRealBilling: boolean
): string | null {
  if (entitlementActive) {
    return trimOrNull(entitlementRow?.provider);
  }

  if (hasRealBilling) {
    return trimOrNull(billingRow?.provider) ?? "stripe";
  }

  return null;
}

function toSubscription(
  billingRow: BillingRow | null | undefined,
  entitlementRow: EntitlementRow | null | undefined
): PortalState["subscription"] {
  const entitlementActive = isEntitlementActive(entitlementRow);
  const realStripeBilling = hasRealStripeSubscription(billingRow);

  const provider = deriveProvider(
    billingRow,
    entitlementRow,
    entitlementActive,
    realStripeBilling
  );

  const productId =
    (realStripeBilling ? trimOrNull(billingRow?.plan_code) : null) ??
    trimOrNull(entitlementRow?.product_id);

  const planCode = productId;

  const planName = derivePlanName(
    billingRow,
    entitlementRow,
    realStripeBilling
  );

  const currentPeriodEnd =
    trimOrNull(entitlementRow?.current_period_end) ??
    (realStripeBilling ? trimOrNull(billingRow?.current_period_end) : null);

  const willCancelAtPeriodEnd = entitlementActive
    ? entitlementRow?.will_renew === false ||
      billingRow?.will_cancel_at_period_end === true
    : realStripeBilling
      ? billingRow?.will_cancel_at_period_end === true
      : false;

  const status = entitlementActive
    ? "active"
    : trimOrNull(billingRow?.subscription_status) ??
      trimOrNull(entitlementRow?.status) ??
      "inactive";

  return {
    hasBillingCustomer: realStripeBilling,
    status,
    planCode,
    planName,
    currentPeriodEnd,
    willCancelAtPeriodEnd,
    amountCents: realStripeBilling ? billingRow?.amount_cents ?? null : null,
    currency: realStripeBilling ? billingRow?.currency ?? null : null,
    provider,
    productId,
  };
}

function toNotifications(
  notificationRow: NotificationRow | null | undefined
): NotificationState {
  return {
    episodeDrops:
      notificationRow?.episode_drops ?? DEFAULT_NOTIFICATIONS.episodeDrops,
    tonightReminders:
      notificationRow?.tonight_reminders ??
      DEFAULT_NOTIFICATIONS.tonightReminders,
    weeklyPlanning:
      notificationRow?.weekly_planning ??
      DEFAULT_NOTIFICATIONS.weeklyPlanning,
    followedShowUpdates:
      notificationRow?.followed_show_updates ??
      DEFAULT_NOTIFICATIONS.followedShowUpdates,
  };
}

function getSubscriptionCurrentPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const legacyTopLevelPeriodEnd =
    "current_period_end" in subscription &&
    typeof (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end === "number"
      ? (subscription as Stripe.Subscription & { current_period_end?: number })
          .current_period_end ?? null
      : null;

  if (legacyTopLevelPeriodEnd) {
    return toIsoDate(legacyTopLevelPeriodEnd);
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => {
      if (
        "current_period_end" in item &&
        typeof (
          item as Stripe.SubscriptionItem & { current_period_end?: number }
        ).current_period_end === "number"
      ) {
        return (
          item as Stripe.SubscriptionItem & { current_period_end?: number }
        ).current_period_end ?? null;
      }

      return null;
    })
    .filter((value): value is number => typeof value === "number" && value > 0);

  const effectiveCurrentPeriodEnd =
    itemPeriodEnds.length > 0 ? Math.min(...itemPeriodEnds) : null;

  return toIsoDate(effectiveCurrentPeriodEnd);
}

async function loadBillingRowSafely(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string
): Promise<BillingRow | null> {
  const { data, error } = await supabase
    .from("billing_customers")
    .select(
      "stripe_customer_id, stripe_subscription_id, subscription_status, plan_code, plan_name, current_period_end, will_cancel_at_period_end, amount_cents, currency, provider, checkout_session_id"
    )
    .eq("user_id", userId)
    .maybeSingle<BillingRow>();

  if (error) {
    if (isOptionalPortalDependencyError(error)) {
      return null;
    }

    throw error;
  }

  return data ?? null;
}

async function loadEntitlementRow(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string
): Promise<EntitlementRow | null> {
  const { data, error } = await supabase
    .from("entitlements")
    .select("tier, status, current_period_end, provider, product_id, will_renew")
    .eq("user_id", userId)
    .maybeSingle<EntitlementRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function loadSubscription(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string
): Promise<PortalState["subscription"]> {
  const [billingRow, entitlementRow] = await Promise.all([
    loadBillingRowSafely(supabase, userId),
    loadEntitlementRow(supabase, userId),
  ]);

  return toSubscription(billingRow, entitlementRow);
}

async function loadNotificationsSafely(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string
): Promise<NotificationState> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select(
      "episode_drops, tonight_reminders, weekly_planning, followed_show_updates"
    )
    .eq("user_id", userId)
    .maybeSingle<NotificationRow>();

  if (error) {
    if (isOptionalPortalDependencyError(error)) {
      return DEFAULT_NOTIFICATIONS;
    }

    throw error;
  }

  return toNotifications(data);
}

async function loadAvailableServices(
  supabase: ReturnType<typeof createSupabaseRouteClient>
): Promise<AvailableService[]> {
  const { data, error } = await supabase
    .from("streaming_services")
    .select("id, name, slug, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ServiceRow[]).map((service) => ({
    id: service.id,
    name: service.name,
    slug: service.slug,
    active: Boolean(service.active),
  }));
}

async function loadSelectedServiceIds(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_services")
    .select("service_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserServiceRow[])
    .map((row) => row.service_id)
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0
    );
}

async function buildPortalState(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string,
  email: string | null
): Promise<PortalState> {
  const [subscription, notifications, availableServices, selectedServiceIds] =
    await Promise.all([
      loadSubscription(supabase, userId),
      loadNotificationsSafely(supabase, userId),
      loadAvailableServices(supabase),
      loadSelectedServiceIds(supabase, userId),
    ]);

  return {
    user: {
      id: userId,
      email,
    },
    subscription,
    notifications,
    availableServices,
    selectedServiceIds,
  };
}

async function saveNotificationsSafely(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string,
  notifications: NotificationState
) {
  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert(
      {
        user_id: userId,
        episode_drops: notifications.episodeDrops,
        tonight_reminders: notifications.tonightReminders,
        weekly_planning: notifications.weeklyPlanning,
        followed_show_updates: notifications.followedShowUpdates,
      },
      { onConflict: "user_id" }
    );

  if (error && !isOptionalPortalDependencyError(error)) {
    throw error;
  }
}

async function saveSelectedServices(
  supabase: ReturnType<typeof createSupabaseRouteClient>,
  userId: string,
  selectedServiceIds: string[]
) {
  if (selectedServiceIds.length > 0) {
    const { data: validServices, error: validServicesError } = await supabase
      .from("streaming_services")
      .select("id")
      .eq("active", true)
      .in("id", selectedServiceIds);

    if (validServicesError) {
      throw validServicesError;
    }

    const validIds = new Set(
      ((validServices ?? []) as Array<{ id: string }>).map((row) => row.id)
    );
    const filteredIds = selectedServiceIds.filter((id) => validIds.has(id));

    const { error: deleteError } = await supabase
      .from("user_services")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      throw deleteError;
    }

    if (filteredIds.length > 0) {
      const rows = filteredIds.map((serviceId) => ({
        user_id: userId,
        service_id: serviceId,
      }));

      const { error: insertError } = await supabase
        .from("user_services")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    return;
  }

  const { error: deleteError } = await supabase
    .from("user_services")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }
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

  const { data: existing, error: existingError } = await supabase
    .from("billing_customers")
    .select(
      "stripe_customer_id, stripe_subscription_id, subscription_status, plan_code, plan_name, current_period_end, will_cancel_at_period_end, amount_cents, currency, checkout_session_id"
    )
    .eq("user_id", input.userId)
    .maybeSingle<BillingRow>();

  if (existingError) {
    throw existingError;
  }

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
      input.planCode !== undefined ? input.planCode : existing?.plan_code ?? null,
    plan_name:
      input.planName !== undefined ? input.planName : existing?.plan_name ?? null,
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
      input.currency !== undefined ? input.currency : existing?.currency ?? null,
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

async function reconcileCheckoutSessionForUser(params: {
  userId: string;
  checkoutSessionId: string;
  knownStripeCustomerId?: string | null;
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(
    params.checkoutSessionId,
    {
      expand: ["customer", "subscription"],
    }
  );

  if (session.mode !== "subscription") {
    throw new Error(
      `Checkout session ${session.id} is not a subscription session.`
    );
  }

  const sessionUserId =
    (typeof session.client_reference_id === "string" &&
    session.client_reference_id.length > 0
      ? session.client_reference_id
      : null) ?? getObjectUserId(session);

  const stripeCustomerId = getExpandableId(session.customer);
  const stripeSubscriptionId = getExpandableId(session.subscription);

  if (sessionUserId && sessionUserId !== params.userId) {
    throw new Error("Checkout session does not belong to the current user.");
  }

  if (
    !sessionUserId &&
    params.knownStripeCustomerId &&
    stripeCustomerId &&
    params.knownStripeCustomerId !== stripeCustomerId
  ) {
    throw new Error("Checkout session customer does not match current user.");
  }

  await upsertBillingCustomerRow({
    userId: params.userId,
    stripeCustomerId,
    stripeSubscriptionId,
    checkoutSessionId: session.id,
  });

  if (!stripeSubscriptionId) {
    console.log("[api/portal] checkout success reconcile found no subscription", {
      userId: params.userId,
      checkoutSessionId: session.id,
      stripeCustomerId,
    });
    return;
  }

  const subscription =
    typeof session.subscription === "object" &&
    session.subscription !== null &&
    "object" in session.subscription &&
    session.subscription.object === "subscription"
      ? (session.subscription as Stripe.Subscription)
      : await stripe.subscriptions.retrieve(stripeSubscriptionId, {
          expand: ["customer"],
        });

  const primaryItem = subscription.items.data[0] ?? null;
  const primaryPrice = primaryItem?.price ?? null;
  const fallbackPlanFromMetadata = subscription.metadata?.plan_code ?? null;
  const plan = getPlanDetails(primaryPrice?.id ?? fallbackPlanFromMetadata);
  const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);
  const willRenew = inferWillRenew(subscription);
  const isActive = subscriptionGrantsAccess(subscription.status);

  await upsertBillingCustomerRow({
    userId: params.userId,
    stripeCustomerId:
      getExpandableId(subscription.customer) ?? stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planCode: plan.planCode,
    planName: plan.planName,
    currentPeriodEnd,
    willCancelAtPeriodEnd: subscription.cancel_at_period_end,
    amountCents: primaryPrice?.unit_amount ?? null,
    currency: primaryPrice?.currency ?? null,
    checkoutSessionId: session.id,
  });

  await applyEntitlementState({
    userId: params.userId,
    isActive,
    planCode: plan.planCode,
    currentPeriodEnd,
    willRenew,
  });

  console.log("[api/portal] checkout success reconcile complete", {
    userId: params.userId,
    checkoutSessionId: session.id,
    stripeCustomerId: getExpandableId(subscription.customer) ?? stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    planCode: plan.planCode,
    currentPeriodEnd,
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient(request);
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

    const checkoutState = trimOrNull(
      request.nextUrl.searchParams.get("checkout")
    );
    const requestedSessionId = trimOrNull(
      request.nextUrl.searchParams.get("session_id")
    );

    const currentBillingRow = await loadBillingRowSafely(supabase, user.id);

    const reconcileDecision = shouldAttemptCheckoutReconcile({
      checkoutState,
      requestedSessionId,
      billingRow: currentBillingRow,
    });

    if (reconcileDecision.shouldReconcile && reconcileDecision.checkoutSessionId) {
      try {
        await reconcileCheckoutSessionForUser({
          userId: user.id,
          checkoutSessionId: reconcileDecision.checkoutSessionId,
          knownStripeCustomerId: trimOrNull(
            currentBillingRow?.stripe_customer_id
          ),
        });
      } catch (reconcileError) {
        console.error("[api/portal] Stripe checkout reconcile failed", {
          userId: user.id,
          checkoutSessionId: reconcileDecision.checkoutSessionId,
          error: serializeError(reconcileError),
        });
      }
    }

    const state = await buildPortalState(supabase, user.id, user.email ?? null);
    const response = NextResponse.json(state, { status: 200 });
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load portal state.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient(request);
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

    const body = (await request.json()) as {
      notifications?: unknown;
      selectedServiceIds?: unknown;
    };

    if (body.notifications !== undefined) {
      const notifications = normalizeNotifications(body.notifications);
      await saveNotificationsSafely(supabase, user.id, notifications);
    }

    if (body.selectedServiceIds !== undefined) {
      const selectedServiceIds = normalizeServiceIds(body.selectedServiceIds);
      await saveSelectedServices(supabase, user.id, selectedServiceIds);
    }

    const state = await buildPortalState(supabase, user.id, user.email ?? null);
    const response = NextResponse.json(state, { status: 200 });
    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save portal state.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}