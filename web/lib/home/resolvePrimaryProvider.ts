type ProviderBucket = "flatrate" | "ads" | "free" | "rent" | "buy";

type TmdbProviderItem = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number | null;
};

type TmdbCountryProviders = Partial<Record<ProviderBucket, TmdbProviderItem[]>>;

export type ResolvedProviderOption = {
  bucket: ProviderBucket;
  tmdbProviderId: number | null;
  rawName: string;
  slug: string;
  label: string;
  logoPath: string | null;
  displayPriority: number | null;
};

export type ResolvedProviders = {
  primary: ResolvedProviderOption | null;
  secondary: ResolvedProviderOption[];
  all: ResolvedProviderOption[];
};

const BUCKET_PRIORITY: ProviderBucket[] = [
  "flatrate",
  "ads",
  "free",
  "rent",
  "buy",
];

function normalizeRawProviderName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function providerSlugFromRawName(raw?: string | null) {
  const value = normalizeRawProviderName(raw);

  switch (value) {
    case "":
    case "unknown":
    case "n/a":
    case "na":
    case "null":
    case "undefined":
      return "streaming";

    case "netflix":
      return "netflix";

    case "hulu":
      return "hulu";

    case "max":
    case "hbo max":
      return "max";

    case "amazon prime":
    case "amazon prime video":
    case "prime video":
    case "primevideo":
      return "prime-video";

    case "disney+":
    case "disney plus":
      return "disney-plus";

    case "apple tv+":
    case "apple tv plus":
    case "appletv+":
    case "appletv plus":
      return "apple-tv-plus";

    case "paramount+":
    case "paramount plus":
      return "paramount-plus";

    case "peacock":
    case "peacock premium":
      return "peacock";

    case "abc":
      return "abc";

    case "fox":
      return "fox";

    case "nbc":
      return "nbc";

    case "cbs":
      return "cbs";

    case "starz":
      return "starz";

    case "showtime":
      return "showtime";

    case "amc+":
    case "amc plus":
      return "amc-plus";

    default:
      return (
        value
          .replace(/[^\p{L}\p{N}\s+&-]+/gu, "")
          .replace(/\s+/g, "-") || "streaming"
      );
  }
}

function buildResolvedOption(
  bucket: ProviderBucket,
  item: TmdbProviderItem
): ResolvedProviderOption {
  const rawName = item.provider_name ?? "";
  const normalizedName = normalizeRawProviderName(rawName);
  const slug = normalizedName
    ? providerSlugFromRawName(rawName)
    : "streaming";

  return {
    bucket,
    tmdbProviderId: item.provider_id ?? null,
    rawName,
    slug,
    label: rawName.trim() || "Streaming",
    logoPath: item.logo_path ?? null,
    displayPriority:
      typeof item.display_priority === "number"
        ? item.display_priority
        : null,
  };
}

function dedupeOptions(items: ResolvedProviderOption[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.bucket}:${item.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeAcrossBuckets(items: ResolvedProviderOption[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

export function resolvePrimaryProvider(
  regionProviders?: TmdbCountryProviders | null
): ResolvedProviders {
  if (!regionProviders) {
    return {
      primary: null,
      secondary: [],
      all: [],
    };
  }

  const ordered: ResolvedProviderOption[] = [];

  for (const bucket of BUCKET_PRIORITY) {
    const bucketItems = regionProviders[bucket] ?? [];

    const normalized = dedupeOptions(
      bucketItems
        .map((item) => buildResolvedOption(bucket, item))
        .sort((a, b) => {
          const ap = a.displayPriority ?? Number.MAX_SAFE_INTEGER;
          const bp = b.displayPriority ?? Number.MAX_SAFE_INTEGER;
          return ap - bp;
        })
    );

    ordered.push(...normalized);
  }

  const deduped = dedupeAcrossBuckets(ordered);
  const primary = deduped[0] ?? null;
  const secondary = deduped.slice(1);

  return {
    primary,
    secondary,
    all: deduped,
  };
}