type TmdbWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number | null;
};

type NormalizedProvider = {
  tmdbProviderId: number | null;
  rawName: string;
  slug: string;
  label: string;
  logoPath: string | null;
};

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
    case "hbo max":
    case "max":
      return "max";
    case "hulu":
      return "hulu";
    case "disney+":
    case "disney plus":
      return "disney-plus";
    case "amazon prime video":
    case "amazon prime":
    case "prime video":
      return "prime-video";
    case "apple tv+":
    case "apple tv plus":
      return "apple-tv-plus";
    case "paramount+":
    case "paramount plus":
      return "paramount-plus";
    case "peacock":
    case "peacock premium":
      return "peacock";
    case "netflix":
      return "netflix";
    case "abc":
      return "abc";
    case "fox":
      return "fox";
    case "nbc":
      return "nbc";
    case "cbs":
      return "cbs";
    default:
      return value.replace(/[^\p{L}\p{N}\s+&-]+/gu, "").replace(/\s+/g, "-") || "streaming";
  }
}

export function normalizeTmdbProvider(
  provider: TmdbWatchProvider
): NormalizedProvider {
  const slug = providerSlugFromRawName(provider.provider_name);

  return {
    tmdbProviderId: provider.provider_id ?? null,
    rawName: provider.provider_name ?? "",
    slug,
    label: provider.provider_name?.trim() || "Streaming",
    logoPath: provider.logo_path ?? null,
  };
}