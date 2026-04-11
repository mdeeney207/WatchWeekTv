// web/lib/providers/resolvePrimaryProvider.ts

import { getProviderMeta } from "@/lib/providers";

export type ProviderBucket = "subscription" | "free" | "ads" | "rent" | "buy";

export type ProviderDisplayRow = {
  service_slug: string;
  availability_type: ProviderBucket;
  name: string;
  logo_url: string | null;
  affiliate_supported: boolean;
  destination_url: string | null;
  affiliate_url: string | null;
};

export type ResolvedProviderOption = {
  bucket: ProviderBucket;
  serviceSlug: string;
  normalizedSlug: string;
  label: string;
  logoUrl: string | null;
  affiliateSupported: boolean;
  destinationUrl: string | null;
  affiliateUrl: string | null;
  isClickable: boolean;
  source: ProviderDisplayRow;
};

export type ResolvedProviders = {
  primary: ResolvedProviderOption | null;
  secondary: ResolvedProviderOption[];
  all: ResolvedProviderOption[];
  grouped: Record<ProviderBucket, ResolvedProviderOption[]>;
};

const BUCKET_PRIORITY: ProviderBucket[] = [
  "subscription",
  "free",
  "ads",
  "rent",
  "buy",
];

const BUCKET_RANK: Record<ProviderBucket, number> = {
  subscription: 1,
  free: 2,
  ads: 3,
  rent: 4,
  buy: 5,
};

function clickable(row: ProviderDisplayRow) {
  return Boolean(row.affiliate_url ?? row.destination_url);
}

function normalizeRow(row: ProviderDisplayRow): ResolvedProviderOption {
  const meta = getProviderMeta(row.name || row.service_slug);

  return {
    bucket: row.availability_type,
    serviceSlug: row.service_slug,
    normalizedSlug: meta.slug,
    label: meta.label,
    logoUrl: row.logo_url ?? null,
    affiliateSupported: Boolean(row.affiliate_supported),
    destinationUrl: row.destination_url ?? null,
    affiliateUrl: row.affiliate_url ?? null,
    isClickable: clickable(row),
    source: row,
  };
}

function dedupeResolvedOptions(
  rows: ResolvedProviderOption[]
): ResolvedProviderOption[] {
  const best = new Map<string, ResolvedProviderOption>();

  for (const row of rows) {
    const key = row.normalizedSlug;
    const existing = best.get(key);

    if (!existing) {
      best.set(key, row);
      continue;
    }

    const existingRank = BUCKET_RANK[existing.bucket];
    const nextRank = BUCKET_RANK[row.bucket];

    if (row.isClickable && !existing.isClickable) {
      best.set(key, row);
      continue;
    }

    if (row.isClickable === existing.isClickable && nextRank < existingRank) {
      best.set(key, row);
      continue;
    }

    if (
      row.isClickable === existing.isClickable &&
      nextRank === existingRank &&
      row.label.localeCompare(existing.label) < 0
    ) {
      best.set(key, row);
    }
  }

  return Array.from(best.values()).sort((a, b) => {
    const byBucket = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
    if (byBucket !== 0) return byBucket;
    if (a.isClickable !== b.isClickable) return a.isClickable ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

export function resolvePrimaryProvider(
  rows: ProviderDisplayRow[]
): ResolvedProviders {
  const normalized = rows.map(normalizeRow);
  const deduped = dedupeResolvedOptions(normalized);

  let primary: ResolvedProviderOption | null = null;

  for (const bucket of BUCKET_PRIORITY) {
    const found = deduped.find((row) => row.bucket === bucket && row.isClickable);
    if (found) {
      primary = found;
      break;
    }
  }

  if (!primary) {
    for (const bucket of BUCKET_PRIORITY) {
      const found = deduped.find((row) => row.bucket === bucket);
      if (found) {
        primary = found;
        break;
      }
    }
  }

  const secondary = deduped.filter(
    (row) =>
      !primary ||
      !(
        row.normalizedSlug === primary.normalizedSlug &&
        row.bucket === primary.bucket
      )
  );

  const grouped: Record<ProviderBucket, ResolvedProviderOption[]> = {
    subscription: [],
    free: [],
    ads: [],
    rent: [],
    buy: [],
  };

  for (const row of secondary) {
    grouped[row.bucket].push(row);
  }

  return {
    primary,
    secondary,
    all: deduped,
    grouped,
  };
}