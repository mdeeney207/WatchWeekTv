"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type NotificationKey =
  | "episodeDrops"
  | "tonightReminders"
  | "weeklyPlanning"
  | "followedShowUpdates";

type NotificationState = Record<NotificationKey, boolean>;

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
  };
  notifications: NotificationState;
  services: string[];
};

type ServiceOption = {
  id: string;
  name: string;
  blurb: string;
};

const focusAreas = [
  "Membership and billing",
  "Notifications and reminders",
  "Streaming services",
  "Devices and account access",
];

const serviceOptions: ServiceOption[] = [
  {
    id: "netflix",
    name: "Netflix",
    blurb: "Original series, global drops, and daily release volume.",
  },
  {
    id: "hulu",
    name: "Hulu",
    blurb: "Next-day TV, originals, and strong weekly cadence.",
  },
  {
    id: "max",
    name: "Max",
    blurb: "Prestige series, HBO drops, and premium catalog depth.",
  },
  {
    id: "prime-video",
    name: "Prime Video",
    blurb: "Originals, movies, and wide studio distribution.",
  },
  {
    id: "disney-plus",
    name: "Disney+",
    blurb: "Franchise drops, family programming, and marquee releases.",
  },
  {
    id: "apple-tv-plus",
    name: "Apple TV+",
    blurb: "Prestige originals and tightly curated premium releases.",
  },
  {
    id: "peacock",
    name: "Peacock",
    blurb: "NBCUniversal releases and a strong TV catalog.",
  },
  {
    id: "paramount-plus",
    name: "Paramount+",
    blurb: "CBS and Paramount releases with franchise support.",
  },
];

const defaultNotifications: NotificationState = {
  episodeDrops: true,
  tonightReminders: true,
  weeklyPlanning: false,
  followedShowUpdates: true,
};

const notificationOptions: Array<{
  key: NotificationKey;
  title: string;
  description: string;
}> = [
  {
    key: "episodeDrops",
    title: "Episode drop alerts",
    description: "Get notified when a followed episode becomes available.",
  },
  {
    key: "tonightReminders",
    title: "Tonight reminders",
    description: "Surface what matters tonight before prime viewing hours.",
  },
  {
    key: "weeklyPlanning",
    title: "This week planning",
    description: "Get a weekly pulse on what is dropping across your services.",
  },
  {
    key: "followedShowUpdates",
    title: "Followed show updates",
    description: "Stay current on release changes for shows you track.",
  },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatSubscriptionStatus(status: string) {
  switch (status) {
    case "trialing":
      return "Trialing";
    case "active":
      return "Active";
    case "past_due":
      return "Past Due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "incomplete":
      return "Incomplete";
    default:
      return "Inactive";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amountCents: number | null, currency: string | null) {
  if (amountCents == null || !currency) return null;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function ActionButton({
  children,
  primary = false,
  className,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "bg-white text-black hover:bg-zinc-200"
          : "border border-white/12 bg-white/[0.05] text-white hover:bg-white/[0.09]",
        className
      )}
    >
      {children}
    </button>
  );
}

function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_20px_80px_rgba(0,0,0,0.42)] backdrop-blur-sm",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_36%)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
      {children}
    </p>
  );
}

function StatPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium",
        tone === "positive" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        tone === "warning" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-200",
        tone === "neutral" &&
          "border-white/12 bg-white/[0.04] text-zinc-300"
      )}
    >
      {children}
    </span>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-black/25 p-4 text-left transition hover:bg-white/[0.04]"
    >
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
      </div>

      <div
        className={cn(
          "relative h-7 w-12 rounded-full border transition",
          checked
            ? "border-white/20 bg-white"
            : "border-white/12 bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full transition",
            checked ? "left-6 bg-black" : "left-1 bg-white"
          )}
        />
      </div>
    </button>
  );
}

function ProviderTile({
  service,
  selected,
  onToggle,
}: {
  service: ServiceOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-[24px] border p-4 text-left transition",
        selected
          ? "border-white/20 bg-white/[0.09] shadow-[0_10px_40px_rgba(255,255,255,0.06)]"
          : "border-white/8 bg-black/25 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{service.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {service.blurb}
          </p>
        </div>

        <div
          className={cn(
            "mt-1 flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[11px] font-semibold",
            selected
              ? "border-white/20 bg-white text-black"
              : "border-white/12 bg-white/[0.04] text-zinc-300"
          )}
        >
          {selected ? "On" : "Off"}
        </div>
      </div>
    </button>
  );
}

export default function PortalPage() {
  const [portalState, setPortalState] = useState<PortalState | null>(null);
  const [servicesDraft, setServicesDraft] = useState<string[]>([]);
  const [notificationsDraft, setNotificationsDraft] =
    useState<NotificationState>(defaultNotifications);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingServices, setIsSavingServices] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [pageError, setPageError] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<string>("");

  useEffect(() => {
    void loadPortalState();
  }, []);

  async function loadPortalState() {
    try {
      setIsLoading(true);
      setPageError("");

      const response = await fetch("/api/portal", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to load portal."
        );
      }

      setPortalState(payload);
      setServicesDraft(payload.services);
      setNotificationsDraft(payload.notifications);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load portal."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function saveServices() {
    try {
      setIsSavingServices(true);
      setSaveMessage("");
      setPageError("");

      const response = await fetch("/api/portal", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          services: servicesDraft,
        }),
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to save services."
        );
      }

      setPortalState(payload);
      setServicesDraft(payload.services);
      setSaveMessage("Streaming services saved.");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to save services."
      );
    } finally {
      setIsSavingServices(false);
    }
  }

  async function saveNotifications() {
    try {
      setIsSavingNotifications(true);
      setSaveMessage("");
      setPageError("");

      const response = await fetch("/api/portal", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifications: notificationsDraft,
        }),
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to save notifications."
        );
      }

      setPortalState(payload);
      setNotificationsDraft(payload.notifications);
      setSaveMessage("Notification preferences saved.");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to save notifications."
      );
    } finally {
      setIsSavingNotifications(false);
    }
  }

  async function openBillingPortal() {
    try {
      setIsOpeningBilling(true);
      setPageError("");

      const response = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error || "Failed to open billing portal."
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to open billing portal."
      );
    } finally {
      setIsOpeningBilling(false);
    }
  }

  function toggleService(id: string) {
    setServicesDraft((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function toggleNotification(key: NotificationKey) {
    setNotificationsDraft((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function selectAllServices() {
    setServicesDraft(serviceOptions.map((service) => service.id));
  }

  function clearAllServices() {
    setServicesDraft([]);
  }

  function enableAllNotifications() {
    setNotificationsDraft({
      episodeDrops: true,
      tonightReminders: true,
      weeklyPlanning: true,
      followedShowUpdates: true,
    });
  }

  function disableAllNotifications() {
    setNotificationsDraft({
      episodeDrops: false,
      tonightReminders: false,
      weeklyPlanning: false,
      followedShowUpdates: false,
    });
  }

  const servicesDirty = useMemo(() => {
    if (!portalState) return false;

    const current = [...portalState.services].sort();
    const draft = [...servicesDraft].sort();

    return JSON.stringify(current) !== JSON.stringify(draft);
  }, [portalState, servicesDraft]);

  const notificationsDirty = useMemo(() => {
    if (!portalState) return false;

    return (
      JSON.stringify(portalState.notifications) !==
      JSON.stringify(notificationsDraft)
    );
  }, [portalState, notificationsDraft]);

  const enabledNotificationCount = useMemo(() => {
    return Object.values(notificationsDraft).filter(Boolean).length;
  }, [notificationsDraft]);

  const selectedServiceNames = useMemo(() => {
    return serviceOptions
      .filter((service) => servicesDraft.includes(service.id))
      .map((service) => service.name);
  }, [servicesDraft]);

  const subscriptionTone =
    portalState?.subscription.status === "active" ||
    portalState?.subscription.status === "trialing"
      ? "positive"
      : portalState?.subscription.status === "past_due"
      ? "warning"
      : "neutral";

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,90,255,0.24),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),transparent_16%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_28%,rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Surface className="p-6 sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:gap-8">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black">
                  WW
                </div>
                <div>
                  <Eyebrow>WatchWeek Portal</Eyebrow>
                  <p className="text-sm font-medium text-white">
                    Membership, billing, reminders, and streaming setup
                  </p>
                </div>
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Your WatchWeek control center.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                The portal now reads and writes shared account data so the web
                experience can stay aligned with the app.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {focusAreas.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <StatPill tone={subscriptionTone}>
                  {portalState
                    ? formatSubscriptionStatus(portalState.subscription.status)
                    : "Loading subscription…"}
                </StatPill>
                <StatPill tone="positive">
                  {servicesDraft.length} services selected
                </StatPill>
                <StatPill tone="positive">
                  {enabledNotificationCount} reminders enabled
                </StatPill>
              </div>

              {saveMessage ? (
                <p className="mt-5 text-sm text-emerald-300">{saveMessage}</p>
              ) : null}

              {pageError ? (
                <p className="mt-5 text-sm text-rose-300">{pageError}</p>
              ) : null}
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-white/10 bg-black/30 p-5">
                <Eyebrow>Account</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {isLoading
                    ? "Loading account…"
                    : portalState?.user.email || "Signed in"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Shared account settings are now intended to live in Supabase so
                  the portal and mobile app can use the same source of truth.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/30 p-5">
                <Eyebrow>Subscription snapshot</Eyebrow>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <span className="text-sm text-zinc-300">Plan</span>
                    <span className="text-sm font-medium text-white">
                      {portalState?.subscription.planName || "No active plan"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <span className="text-sm text-zinc-300">Current period end</span>
                    <span className="text-sm font-medium text-white">
                      {formatDate(portalState?.subscription.currentPeriodEnd ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <span className="text-sm text-zinc-300">Amount</span>
                    <span className="text-sm font-medium text-white">
                      {formatMoney(
                        portalState?.subscription.amountCents ?? null,
                        portalState?.subscription.currency ?? null
                      ) || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <Surface className="xl:col-span-7">
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Subscription / Billing</Eyebrow>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Billing is server-side and DB-backed.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    The portal opens Stripe server-side, but the subscription
                    state displayed here comes from Supabase so web and app can
                    stay in sync.
                  </p>
                </div>

                <ActionButton
                  primary
                  onClick={openBillingPortal}
                  disabled={isOpeningBilling || !portalState?.subscription.hasBillingCustomer}
                >
                  {isOpeningBilling ? "Opening…" : "Manage billing"}
                </ActionButton>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <h3 className="text-sm font-semibold text-white">Status</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {portalState
                      ? formatSubscriptionStatus(portalState.subscription.status)
                      : "Loading…"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Plan details
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {portalState?.subscription.planName || "No active plan"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <h3 className="text-sm font-semibold text-white">
                    Renewal / end
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {formatDate(portalState?.subscription.currentPeriodEnd ?? null)}
                  </p>
                </div>
              </div>

              {portalState?.subscription.willCancelAtPeriodEnd ? (
                <p className="mt-5 text-sm text-amber-300">
                  This subscription is currently set to cancel at period end.
                </p>
              ) : null}

              {!portalState?.subscription.hasBillingCustomer && !isLoading ? (
                <p className="mt-5 text-sm text-zinc-400">
                  No Stripe customer mapping was found for this account yet.
                  Your checkout webhook should write billing_customers for this
                  user before billing management can open.
                </p>
              ) : null}
            </div>
          </Surface>

          <Surface className="xl:col-span-5">
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Notifications / Reminders</Eyebrow>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Reminder controls sync through the DB.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    These settings are meant to be read by both the portal and
                    the app, not stored per browser.
                  </p>
                </div>

                <ActionButton
                  primary
                  onClick={saveNotifications}
                  disabled={isSavingNotifications || !notificationsDirty}
                >
                  {isSavingNotifications ? "Saving…" : "Save reminders"}
                </ActionButton>
              </div>

              <div className="mt-6 space-y-3">
                {notificationOptions.map((option) => (
                  <ToggleRow
                    key={option.key}
                    title={option.title}
                    description={option.description}
                    checked={notificationsDraft[option.key]}
                    onToggle={() => toggleNotification(option.key)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton onClick={enableAllNotifications}>
                  Enable all
                </ActionButton>
                <ActionButton onClick={disableAllNotifications}>
                  Disable all
                </ActionButton>
              </div>
            </div>
          </Surface>

          <Surface className="xl:col-span-7">
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Streaming Services</Eyebrow>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Service selection now belongs in shared account data.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    Pick the services you actually use and keep that preference
                    aligned across web and mobile.
                  </p>
                </div>

                <ActionButton
                  primary
                  onClick={saveServices}
                  disabled={isSavingServices || !servicesDirty}
                >
                  {isSavingServices ? "Saving…" : "Save services"}
                </ActionButton>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {serviceOptions.map((service) => (
                  <ProviderTile
                    key={service.id}
                    service={service}
                    selected={servicesDraft.includes(service.id)}
                    onToggle={() => toggleService(service.id)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton onClick={selectAllServices}>Select all</ActionButton>
                <ActionButton onClick={clearAllServices}>Clear all</ActionButton>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/8 bg-black/25 p-4">
                <p className="text-sm font-semibold text-white">
                  Selected services
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {selectedServiceNames.length > 0
                    ? selectedServiceNames.join(" • ")
                    : "Nothing selected yet."}
                </p>
              </div>
            </div>
          </Surface>

          <Surface className="xl:col-span-5">
            <div className="p-6 sm:p-7">
              <Eyebrow>Devices / Connected Access</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Device visibility is the next shared-account step.
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                After billing, notifications, and service preferences are locked
                to DB state, the next clean upgrade is exposing real session or
                device records for the account.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-zinc-200">
                  Connected sessions
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-zinc-200">
                  Account access review
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-zinc-200">
                  Sign-in and security control
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </main>
  );
}