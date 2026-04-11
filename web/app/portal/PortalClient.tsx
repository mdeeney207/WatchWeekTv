"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";
import type { ServiceCategory } from "@/lib/services/catalog";
import {
  mapStreamingServicesToCanonicalOptions,
  matchCuratedService,
  normalizeText,
  type AvailableServiceLike,
} from "@/lib/services/normalize";

type NotificationState = {
  episodeDrops: boolean;
  tonightReminders: boolean;
  weeklyPlanning: boolean;
  followedShowUpdates: boolean;
};

type AvailableService = AvailableServiceLike;

type SubscriptionState = {
  hasBillingCustomer: boolean;
  status: string;
  planCode: string | null;
  planName: string | null;
  currentPeriodEnd: string | null;
  willCancelAtPeriodEnd: boolean;
  amountCents: number | null;
  currency: string | null;
  provider?: string | null;
  productId?: string | null;
};

type PortalState = {
  user: {
    id: string;
    email: string | null;
  };
  subscription: SubscriptionState;
  notifications: NotificationState;
  availableServices: AvailableService[];
  selectedServiceIds: string[];
};

type CanonicalServiceOption = {
  key: string;
  label: string;
  category: ServiceCategory;
};

type ServiceGroup = CanonicalServiceOption & {
  description: string;
  representativeId: string;
  representativeSlug: string;
  services: AvailableService[];
  selected: boolean;
};

type CheckoutPlan = "monthly" | "annual";

const DEFAULT_NOTIFICATIONS: NotificationState = {
  episodeDrops: true,
  tonightReminders: true,
  weeklyPlanning: false,
  followedShowUpdates: true,
};

const CATEGORY_ORDER: ServiceCategory[] = [
  "core",
  "live",
  "free",
  "specialty",
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function pluralize(
  count: number,
  forms: {
    one: string;
    other: string;
  }
) {
  return count === 1 ? forms.one : forms.other;
}

function formatCount(
  count: number,
  forms: {
    one: string;
    other: string;
  },
  suffix?: string
) {
  return `${count} ${pluralize(count, forms)}${suffix ? ` ${suffix}` : ""}`;
}

function groupServices(
  availableServices: AvailableService[],
  selectedServiceIds: string[]
): ServiceGroup[] {
  const selectedSet = new Set(selectedServiceIds);
  const buckets = new Map<
    string,
    {
      option: CanonicalServiceOption;
      description: string;
      preferredSlugs: string[];
      services: AvailableService[];
    }
  >();

  for (const service of availableServices) {
    if (!service.active) continue;

    const curated = matchCuratedService(service);
    if (!curated) continue;

    const bucket = buckets.get(curated.key) ?? {
      option: {
        key: curated.key,
        label: curated.label,
        category: curated.category,
      },
      description: curated.description,
      preferredSlugs: curated.preferredSlugs,
      services: [],
    };

    bucket.services.push(service);
    buckets.set(curated.key, bucket);
  }

  const groups: ServiceGroup[] = [...buckets.values()].map((bucket) => {
    const services = [...bucket.services].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    let representative = services[0];

    for (const preferredSlug of bucket.preferredSlugs) {
      const found = services.find(
        (service) => normalizeText(service.slug) === normalizeText(preferredSlug)
      );
      if (found) {
        representative = found;
        break;
      }
    }

    const selected = services.some((service) => selectedSet.has(service.id));

    return {
      ...bucket.option,
      description: bucket.description,
      representativeId: representative.id,
      representativeSlug: representative.slug,
      services,
      selected,
    };
  });

  const categoryRank: Record<ServiceCategory, number> = {
    core: 0,
    live: 1,
    free: 2,
    specialty: 3,
  };

  return groups.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    if (categoryRank[a.category] !== categoryRank[b.category]) {
      return categoryRank[a.category] - categoryRank[b.category];
    }
    return a.label.localeCompare(b.label);
  });
}

function Toggle({
  checked,
  onClick,
  disabled,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        "group relative inline-flex h-8 w-[58px] shrink-0 items-center rounded-full border transition-all duration-200",
        checked
          ? "border-emerald-400/35 bg-emerald-400/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(16,185,129,0.06)]"
          : "border-white/10 bg-white/[0.04]",
        disabled && "cursor-not-allowed opacity-55",
        !disabled && "hover:border-white/20 hover:bg-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "absolute left-1 inline-block h-6 w-6 rounded-full border transition-all duration-200",
          checked
            ? "translate-x-[26px] border-white/20 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.32)]"
            : "translate-x-0 border-white/10 bg-zinc-200 shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
        )}
      />
    </button>
  );
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
        tone === "success"
          ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200"
          : tone === "warning"
            ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-200"
            : "border-white/10 bg-white/[0.04] text-white/75"
      )}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-white/42">
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-sm",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
      <div className="relative mb-5">
        <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/42">
          {eyebrow}
        </div>
        <h2 className="text-3xl font-semibold leading-tight text-white">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
          {description}
        </p>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function ServiceCard({
  group,
  onToggle,
  categoryLabel,
  variantsLabel,
  inLineupLabel,
  addLabel,
  selectedDescription,
  unselectedDescription,
  tapToRemoveLabel,
  tapToAddLabel,
}: {
  group: ServiceGroup;
  onToggle: () => void;
  categoryLabel: string;
  variantsLabel: string;
  inLineupLabel: string;
  addLabel: string;
  selectedDescription: string;
  unselectedDescription: string;
  tapToRemoveLabel: string;
  tapToAddLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        group.selected
          ? "border-emerald-400/26 bg-[linear-gradient(180deg,rgba(16,185,129,0.09),rgba(255,255,255,0.02))] hover:border-emerald-400/34 hover:bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.025))]"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.042),rgba(255,255,255,0.024))]"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">
              {categoryLabel}
            </span>
            {group.services.length > 1 ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
                {group.services.length} {variantsLabel}
              </span>
            ) : null}
          </div>

          <div className="text-[22px] font-semibold leading-tight text-white">
            {group.label}
          </div>

          <div className="mt-2 text-sm leading-6 text-white/56">
            {group.selected ? selectedDescription : unselectedDescription}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]",
            group.selected
              ? "border-emerald-400/28 bg-emerald-400/[0.08] text-emerald-200"
              : "border-white/10 bg-white/[0.04] text-white/45"
          )}
        >
          {group.selected ? inLineupLabel : addLabel}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/8 pt-4">
        <div className="text-xs leading-6 text-white/38">
          {group.selected ? selectedDescription : unselectedDescription}
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/28 transition group-hover:text-white/40">
          {group.selected ? tapToRemoveLabel : tapToAddLabel}
        </div>
      </div>
    </button>
  );
}

function SettingRow({
  title,
  body,
  enabled,
  onToggle,
  disabled,
  onLabel,
  offLabel,
}: {
  title: string;
  body: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.038),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-white">{title}</div>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                enabled
                  ? "border-emerald-400/22 bg-emerald-400/[0.08] text-emerald-200"
                  : "border-white/10 bg-white/[0.035] text-white/45"
              )}
            >
              {enabled ? onLabel : offLabel}
            </span>
          </div>
          <p className="mt-1 text-sm leading-7 text-white/56">{body}</p>
        </div>

        <Toggle checked={enabled} onClick={onToggle} disabled={disabled} />
      </div>
    </div>
  );
}

function PlanSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="text-sm text-white/52">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
    >
      {children}
    </button>
  );
}

export default function PortalClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();

  const common = messages.common;
  const portal = messages.portal;
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const [state, setState] = useState<PortalState | null>(null);
  const [notificationDraft, setNotificationDraft] =
    useState<NotificationState>(DEFAULT_NOTIFICATIONS);
  const [serviceDraftIds, setServiceDraftIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [openingBilling, setOpeningBilling] = useState(false);
  const [startingCheckoutPlan, setStartingCheckoutPlan] =
    useState<CheckoutPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categoryMeta = useMemo<
    Record<ServiceCategory, { title: string; subtitle: string }>
  >(
    () => ({
      core: {
        title: portal.services.categories.core.title,
        subtitle: portal.services.categories.core.subtitle,
      },
      live: {
        title: portal.services.categories.live.title,
        subtitle: portal.services.categories.live.subtitle,
      },
      free: {
        title: portal.services.categories.free.title,
        subtitle: portal.services.categories.free.subtitle,
      },
      specialty: {
        title: portal.services.categories.specialty.title,
        subtitle: portal.services.categories.specialty.subtitle,
      },
    }),
    [portal]
  );

  const portalQueryString = useMemo(() => {
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }, [searchParams]);

  const formatMoney = useCallback(
    (amountCents: number | null, currency: string | null) => {
      if (amountCents == null || !currency) return common.notAvailable;

      try {
        return new Intl.NumberFormat(intlLocale, {
          style: "currency",
          currency: currency.toUpperCase(),
        }).format(amountCents / 100);
      } catch {
        return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
      }
    },
    [common.notAvailable, intlLocale]
  );

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return common.notAvailable;

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return common.notAvailable;

      return new Intl.DateTimeFormat(intlLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [common.notAvailable, intlLocale]
  );

  const formatSubscriptionStatus = useCallback(
    (status: string) => {
      switch (status) {
        case "trialing":
          return portal.statuses.trialing;
        case "active":
          return portal.statuses.active;
        case "past_due":
          return portal.statuses.past_due;
        case "canceled":
          return portal.statuses.canceled;
        case "unpaid":
          return portal.statuses.unpaid;
        case "incomplete":
        case "incomplete_expired":
          return portal.statuses.incomplete;
        default:
          return portal.statuses.inactive;
      }
    },
    [portal.statuses]
  );

  const formatServiceCategory = useCallback(
    (category: ServiceCategory) => {
      switch (category) {
        case "core":
          return portal.services.categoryPills.core;
        case "live":
          return portal.services.categoryPills.live;
        case "free":
          return portal.services.categoryPills.free;
        case "specialty":
          return portal.services.categoryPills.specialty;
        default:
          return portal.services.categoryPills.service;
      }
    },
    [portal.services.categoryPills]
  );

  const formatBillingProvider = useCallback(
    (provider: string | null | undefined, hasBillingCustomer: boolean) => {
      if (provider === "stripe") return portal.billingProviders.stripe;
      if (provider === "apple") return portal.billingProviders.apple;
      if (provider === "google") return portal.billingProviders.google;
      if (provider === "admin") return portal.billingProviders.admin;
      if (hasBillingCustomer) return portal.billingProviders.stripe;
      return portal.billingProviders.notConnected;
    },
    [portal.billingProviders]
  );

  const clearCheckoutParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hadCheckoutParams =
      params.has("checkout") || params.has("session_id");

    if (!hadCheckoutParams) {
      return;
    }

    params.delete("checkout");
    params.delete("session_id");

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal${portalQueryString}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error(portal.messages.portalLoadFailed);
      }

      setState(payload);
      setNotificationDraft(payload.notifications);
      setServiceDraftIds(payload.selectedServiceIds);

      const cameFromCheckoutSuccess = searchParams.get("checkout") === "success";
      const subscriptionIsActive =
        payload.subscription.status === "active" ||
        payload.subscription.status === "trialing" ||
        payload.subscription.status === "past_due";

      if (cameFromCheckoutSuccess && subscriptionIsActive) {
        setSaveMessage(portal.hero.premiumActive);
        clearCheckoutParams();
      }
    } catch {
      setError(portal.messages.portalLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [
    clearCheckoutParams,
    portal.hero.premiumActive,
    portal.messages.portalLoadFailed,
    portalQueryString,
    searchParams,
  ]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const serviceGroups = useMemo(() => {
    if (!state) return [];
    return groupServices(state.availableServices, serviceDraftIds);
  }, [state, serviceDraftIds]);

  const filteredGroups = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return serviceGroups;

    return serviceGroups.filter((group) => {
      const haystack = normalizeText(
        `${group.label} ${group.description} ${group.representativeSlug}`
      );
      return haystack.includes(query);
    });
  }, [search, serviceGroups]);

  const groupedByCategory = useMemo(() => {
    return {
      core: filteredGroups.filter((group) => group.category === "core"),
      live: filteredGroups.filter((group) => group.category === "live"),
      free: filteredGroups.filter((group) => group.category === "free"),
      specialty: filteredGroups.filter(
        (group) => group.category === "specialty"
      ),
    };
  }, [filteredGroups]);

  const selectedGroups = useMemo(
    () => serviceGroups.filter((group) => group.selected),
    [serviceGroups]
  );

  const selectedCount = selectedGroups.length;
  const remindersOn = Object.values(notificationDraft).filter(Boolean).length;

  const persistedRepresentativeIds = useMemo(() => {
    if (!state) return [];

    return groupServices(state.availableServices, state.selectedServiceIds)
      .filter((group) => group.selected)
      .map((group) => group.representativeId)
      .sort();
  }, [state]);

  const draftRepresentativeIds = useMemo(() => {
    if (!state) return [];

    return groupServices(state.availableServices, serviceDraftIds)
      .filter((group) => group.selected)
      .map((group) => group.representativeId)
      .sort();
  }, [state, serviceDraftIds]);

  const hasUnsavedServices =
    JSON.stringify(draftRepresentativeIds) !==
    JSON.stringify(persistedRepresentativeIds);

  const hasUnsavedNotifications =
    JSON.stringify(notificationDraft) !==
    JSON.stringify(state?.notifications ?? DEFAULT_NOTIFICATIONS);

  const selectedCanonicalOptions = useMemo(() => {
    if (!state) return [];
    return mapStreamingServicesToCanonicalOptions(
      state.availableServices,
      new Set(serviceDraftIds)
    );
  }, [state, serviceDraftIds]);

  const notificationItems = useMemo(
    () => [
      {
        key: "episodeDrops" as const,
        title: portal.notifications.items.episodeDrops.title,
        body: portal.notifications.items.episodeDrops.body,
      },
      {
        key: "tonightReminders" as const,
        title: portal.notifications.items.tonightReminders.title,
        body: portal.notifications.items.tonightReminders.body,
      },
      {
        key: "weeklyPlanning" as const,
        title: portal.notifications.items.weeklyPlanning.title,
        body: portal.notifications.items.weeklyPlanning.body,
      },
      {
        key: "followedShowUpdates" as const,
        title: portal.notifications.items.followedShowUpdates.title,
        body: portal.notifications.items.followedShowUpdates.body,
      },
    ],
    [portal.notifications.items]
  );

  function updateStateFromResponse(payload: PortalState) {
    setState(payload);
    setNotificationDraft(payload.notifications);
    setServiceDraftIds(payload.selectedServiceIds);
  }

  function toggleNotification(key: keyof NotificationState) {
    setNotificationDraft((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function toggleServiceGroup(group: ServiceGroup) {
    setServiceDraftIds((current) => {
      const currentSet = new Set(current);
      const isSelected = group.services.some((service) =>
        currentSet.has(service.id)
      );

      for (const service of group.services) {
        currentSet.delete(service.id);
      }

      if (!isSelected) {
        currentSet.add(group.representativeId);
      }

      return [...currentSet];
    });
  }

  function selectAllVisible() {
    const next = new Set(serviceDraftIds);

    for (const group of filteredGroups) {
      for (const service of group.services) {
        next.delete(service.id);
      }
      next.add(group.representativeId);
    }

    setServiceDraftIds([...next]);
  }

  function clearAllServices() {
    setServiceDraftIds([]);
  }

  async function saveNotifications() {
    setSavingNotifications(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/portal", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifications: notificationDraft,
        }),
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error();
      }

      updateStateFromResponse(payload);
      setSaveMessage(portal.notifications.saved);
    } catch {
      setError(portal.messages.portalLoadFailed);
    } finally {
      setSavingNotifications(false);
    }
  }

  async function saveServices() {
    setSavingServices(true);
    setError(null);
    setSaveMessage(null);

    try {
      const selectedRepresentativeIds = groupServices(
        state?.availableServices ?? [],
        serviceDraftIds
      )
        .filter((group) => group.selected)
        .map((group) => group.representativeId);

      const response = await fetch("/api/portal", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedServiceIds: selectedRepresentativeIds,
        }),
      });

      const payload = (await response.json()) as PortalState | { error?: string };

      if (!response.ok || !("user" in payload)) {
        throw new Error();
      }

      updateStateFromResponse(payload);
      setSaveMessage(portal.messages.saveServices);
    } catch {
      setError(portal.messages.portalLoadFailed);
    } finally {
      setSavingServices(false);
    }
  }

  async function openBillingPortal() {
    try {
      setOpeningBilling(true);
      setError(null);
      setSaveMessage(null);

      const response = await fetch("/api/billing/customer-portal", {
        method: "POST",
        credentials: "include",
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error();
      }

      window.location.href = payload.url;
    } catch {
      setError(portal.messages.openBillingFailed);
    } finally {
      setOpeningBilling(false);
    }
  }

  async function startCheckout(plan: CheckoutPlan) {
    try {
      setStartingCheckoutPlan(plan);
      setError(null);
      setSaveMessage(null);

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
        stripeManaged?: boolean;
        storeManaged?: boolean;
        provider?: string;
      };

      if (!response.ok || !payload.url) {
        if (response.status === 409 && payload.stripeManaged) {
          await openBillingPortal();
          return;
        }

        throw new Error();
      }

      window.location.href = payload.url;
    } catch {
      setError(portal.messages.startCheckoutFailed);
    } finally {
      setStartingCheckoutPlan(null);
    }
  }

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070707] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="pointer-events-none absolute left-[-140px] top-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1300px] px-6 pb-20 pt-10">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              {portal.loading.eyebrow}
            </div>
            <div className="mt-4 text-3xl font-semibold">
              {portal.loading.title}
            </div>
            <div className="mt-4 text-sm text-white/60">
              {portal.loading.description}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#070707] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="pointer-events-none absolute left-[-140px] top-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-[1300px] px-6 pb-20 pt-10">
          <div className="rounded-[30px] border border-rose-400/20 bg-rose-500/10 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <div className="text-[11px] uppercase tracking-[0.32em] text-rose-200/80">
              {portal.error.eyebrow}
            </div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {portal.error.title}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              {error ?? portal.error.description}
            </p>
            <button
              type="button"
              onClick={() => void loadPortal()}
              className="mt-6 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {portal.error.retry}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const subscriptionTone =
    state.subscription.status === "active" ||
    state.subscription.status === "trialing"
      ? "success"
      : state.subscription.status === "past_due"
        ? "warning"
        : "default";

  const billingProvider =
    state.subscription.provider ??
    (state.subscription.hasBillingCustomer ? "stripe" : null);

  const billingProviderLabel = formatBillingProvider(
    billingProvider,
    state.subscription.hasBillingCustomer
  );

  const isStoreManaged =
    billingProvider === "apple" || billingProvider === "google";

  const hasWebBilling =
    state.subscription.hasBillingCustomer || billingProvider === "stripe";

  const hasPremiumAccess =
    state.subscription.status === "active" ||
    state.subscription.status === "trialing" ||
    state.subscription.status === "past_due";

  const canStartWebCheckout =
    !hasPremiumAccess && !hasWebBilling && !isStoreManaged;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070707] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.065),transparent_60%)]" />
      <div className="pointer-events-none absolute left-[-140px] top-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />

      <div className="relative mx-auto max-w-[1300px] px-6 pb-20 pt-10">
        <div className="space-y-5">
          <SectionCard
            eyebrow={portal.hero.eyebrow}
            title={portal.hero.title}
            description={portal.hero.description}
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_340px]">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={subscriptionTone}>
                    {formatSubscriptionStatus(state.subscription.status)}
                  </StatusPill>
                  <StatusPill tone="success">
                    {formatCount(
                      selectedCount,
                      portal.nouns.service,
                      portal.hero.inLineupSuffix
                    )}
                  </StatusPill>
                  <StatusPill tone="success">
                    {formatCount(
                      remindersOn,
                      portal.nouns.reminder,
                      portal.hero.onSuffix
                    )}
                  </StatusPill>
                </div>

                <div className="max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-tight text-white">
                  {portal.hero.controlCenter}
                </div>

                <p className="max-w-2xl text-base leading-8 text-white/65">
                  {portal.hero.supporting}
                </p>

                {saveMessage ? (
                  <div className="rounded-[18px] border border-emerald-400/18 bg-emerald-500/[0.09] px-4 py-3 text-sm text-emerald-200">
                    {saveMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    label={portal.metrics.plan}
                    value={state.subscription.planName ?? portal.account.noActivePlan}
                  />
                  <MetricCard
                    label={portal.metrics.periodEnd}
                    value={formatDate(state.subscription.currentPeriodEnd)}
                  />
                  <MetricCard
                    label={portal.metrics.amount}
                    value={formatMoney(
                      state.subscription.amountCents,
                      state.subscription.currency
                    )}
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/42">
                  {portal.account.eyebrow}
                </div>
                <div className="mt-4 text-xl font-semibold text-white">
                  {state.user.email ?? portal.account.signedIn}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/58">
                  {portal.account.description}
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                      {portal.account.planTitle}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {state.subscription.planName ?? portal.account.noActivePlan}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                      {portal.account.servicesTitle}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatCount(selectedCount, portal.nouns.brand)}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                      {portal.account.remindersTitle}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatCount(
                        remindersOn,
                        portal.nouns.reminder,
                        portal.notifications.summarySuffix
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <SectionCard
              eyebrow={portal.services.eyebrow}
              title={portal.services.title}
              description={portal.services.description}
            >
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-wrap gap-2">
                  <StatusPill>
                    {serviceGroups.length} {portal.services.approvedBrands}
                  </StatusPill>
                  <StatusPill tone="success">
                    {selectedCount} {portal.services.selected}
                  </StatusPill>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={portal.services.searchPlaceholder}
                    className="h-11 min-w-[220px] rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={saveServices}
                    disabled={savingServices || !hasUnsavedServices}
                    className={cn(
                      "h-11 rounded-full px-5 text-sm font-semibold transition",
                      savingServices || !hasUnsavedServices
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                        : "border border-white/15 bg-white text-black hover:opacity-90"
                    )}
                  >
                    {savingServices ? portal.services.saving : portal.services.save}
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                <SecondaryButton onClick={selectAllVisible}>
                  {portal.services.selectVisible}
                </SecondaryButton>
                <SecondaryButton onClick={clearAllServices}>
                  {portal.services.clearAll}
                </SecondaryButton>
              </div>

              <div className="mb-6 rounded-[22px] border border-sky-400/16 bg-sky-400/[0.06] p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-sky-200/75">
                  {portal.services.importantTitle}
                </div>
                <div className="mt-2 text-sm leading-7 text-sky-50/88">
                  {portal.services.importantBody}
                </div>
              </div>

              <div className="space-y-8">
                {CATEGORY_ORDER.map((categoryKey) => {
                  const groups = groupedByCategory[categoryKey];
                  if (!groups.length) return null;

                  return (
                    <div key={categoryKey}>
                      <div className="mb-4">
                        <div className="text-lg font-semibold text-white">
                          {categoryMeta[categoryKey].title}
                        </div>
                        <div className="mt-1 text-sm text-white/52">
                          {categoryMeta[categoryKey].subtitle}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {groups.map((group) => (
                          <ServiceCard
                            key={group.key}
                            group={group}
                            onToggle={() => toggleServiceGroup(group)}
                            categoryLabel={formatServiceCategory(group.category)}
                            variantsLabel={portal.services.categoryPills.variants}
                            inLineupLabel={portal.services.inLineup}
                            addLabel={portal.services.add}
                            selectedDescription={portal.services.selectedDescription}
                            unselectedDescription={portal.services.unselectedDescription}
                            tapToRemoveLabel={portal.services.tapToRemove}
                            tapToAddLabel={portal.services.tapToAdd}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.3em] text-white/42">
                  {portal.services.currentLineup}
                </div>
                <div className="mt-3 text-sm leading-7 text-white/72">
                  {selectedCanonicalOptions.length > 0
                    ? selectedCanonicalOptions
                        .map((group) => group.label)
                        .join(" • ")
                    : portal.services.noServicesSelected}
                </div>
              </div>
            </SectionCard>

            <div className="space-y-5">
              <SectionCard
                eyebrow={portal.notifications.eyebrow}
                title={portal.notifications.title}
                description={portal.notifications.description}
                className="bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))]"
              >
                <div className="mb-4 rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                        {portal.notifications.summaryTitle}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {remindersOn} / {notificationItems.length}{" "}
                        {pluralize(notificationItems.length, portal.nouns.reminder)}{" "}
                        {portal.notifications.summarySuffix}
                      </div>
                    </div>
                    <StatusPill tone="success">
                      {formatCount(remindersOn, portal.nouns.reminder)}
                    </StatusPill>
                  </div>
                </div>

                <div className="space-y-3">
                  {notificationItems.map((item) => (
                    <SettingRow
                      key={item.key}
                      title={item.title}
                      body={item.body}
                      enabled={notificationDraft[item.key]}
                      onToggle={() => toggleNotification(item.key)}
                      disabled={savingNotifications}
                      onLabel={portal.notifications.on}
                      offLabel={portal.notifications.off}
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveNotifications}
                    disabled={savingNotifications || !hasUnsavedNotifications}
                    className={cn(
                      "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                      savingNotifications || !hasUnsavedNotifications
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                        : "border border-white/15 bg-white text-black hover:opacity-90"
                    )}
                  >
                    {savingNotifications
                      ? portal.notifications.saving
                      : portal.notifications.save}
                  </button>

                  <SecondaryButton
                    onClick={() =>
                      setNotificationDraft({
                        episodeDrops: true,
                        tonightReminders: true,
                        weeklyPlanning: true,
                        followedShowUpdates: true,
                      })
                    }
                  >
                    {portal.notifications.enableAll}
                  </SecondaryButton>
                </div>
              </SectionCard>

              <SectionCard
                eyebrow={portal.plan.eyebrow}
                title={portal.plan.title}
                description={portal.plan.description}
              >
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                        {portal.plan.premiumTitle}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {state.subscription.planName ?? portal.plan.noActivePlan}
                      </div>
                    </div>
                    <StatusPill tone={subscriptionTone}>
                      {formatSubscriptionStatus(state.subscription.status)}
                    </StatusPill>
                  </div>

                  <div className="mt-5">
                    <PlanSummaryRow
                      label={portal.plan.periodEnd}
                      value={formatDate(state.subscription.currentPeriodEnd)}
                    />
                    <PlanSummaryRow
                      label={portal.plan.amount}
                      value={formatMoney(
                        state.subscription.amountCents,
                        state.subscription.currency
                      )}
                    />
                    <PlanSummaryRow
                      label={portal.plan.billingSource}
                      value={billingProviderLabel}
                    />
                    <PlanSummaryRow
                      label={portal.plan.billingPortal}
                      value={
                        hasWebBilling
                          ? portal.plan.available
                          : portal.plan.notConnected
                      }
                    />
                  </div>
                </div>

                {state.subscription.willCancelAtPeriodEnd ? (
                  <div className="mt-4 rounded-[18px] border border-amber-400/22 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-200">
                    {portal.plan.cancelAtPeriodEnd}
                  </div>
                ) : null}

                <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-white/58">
                  {hasWebBilling
                    ? portal.plan.webBillingMessage
                    : isStoreManaged && hasPremiumAccess
                      ? billingProvider === "apple"
                        ? portal.plan.appleMessage
                        : portal.plan.googleMessage
                      : hasPremiumAccess
                        ? portal.plan.activeNoPortalMessage
                        : portal.plan.noWebBillingMessage}
                </div>

                <div className="mt-4 rounded-[18px] border border-sky-400/16 bg-sky-400/[0.06] px-4 py-4 text-sm leading-7 text-sky-50/88">
                  {portal.plan.importantBody}
                </div>

                {hasWebBilling ? (
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={openingBilling}
                    className={cn(
                      "mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold transition",
                      openingBilling
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                        : "border border-white/15 bg-white text-black hover:opacity-90"
                    )}
                  >
                    {openingBilling ? portal.plan.opening : portal.plan.manage}
                  </button>
                ) : canStartWebCheckout ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void startCheckout("monthly")}
                      disabled={startingCheckoutPlan !== null}
                      className={cn(
                        "rounded-full px-5 py-3 text-sm font-semibold transition",
                        startingCheckoutPlan !== null
                          ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                          : "border border-white/15 bg-white text-black hover:opacity-90"
                      )}
                    >
                      {startingCheckoutPlan === "monthly"
                        ? portal.plan.starting
                        : portal.plan.upgradeMonthly}
                    </button>

                    <button
                      type="button"
                      onClick={() => void startCheckout("annual")}
                      disabled={startingCheckoutPlan !== null}
                      className={cn(
                        "rounded-full border px-5 py-3 text-sm font-semibold transition",
                        startingCheckoutPlan !== null
                          ? "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
                          : "border-emerald-400/28 bg-emerald-400/[0.12] text-emerald-100 hover:bg-emerald-400/[0.18]"
                      )}
                    >
                      {startingCheckoutPlan === "annual"
                        ? portal.plan.starting
                        : portal.plan.upgradeAnnual}
                    </button>
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}