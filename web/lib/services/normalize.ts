import {
  CURATED_SERVICES,
  type CanonicalServiceDefinition,
  type ServiceCategory,
} from "@/lib/services/catalog";

export type AvailableServiceLike = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type CanonicalServiceOption = {
  key: string;
  label: string;
  category: ServiceCategory;
};

export type ProviderBearing = {
  primary_provider?: string | null;
  providers_primary?: string[];
  providers_flatrate?: string[];
  providers_free?: string[];
  providers_ads?: string[];
};

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[+]/g, " plus ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripServiceVariantNoise(name: string) {
  return name
    .replace(/\bAmazon Channel\b/gi, "")
    .replace(/\bApple TV Channel\b/gi, "")
    .replace(/\bApple TV Channels\b/gi, "")
    .replace(/\bRoku Premium Channel\b/gi, "")
    .replace(/\bRoku Channel\b/gi, "")
    .replace(/\bPrime Video Channel\b/gi, "")
    .replace(/\bwith Ads\b/gi, "")
    .replace(/\bApp\b/gi, "")
    .replace(/\bChannel\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function matchCuratedService(input: {
  slug?: string | null;
  name?: string | null;
}): CanonicalServiceDefinition | null {
  const slug = normalizeText(input.slug ?? "");
  const name = normalizeText(input.name ?? "");
  const stripped = normalizeText(stripServiceVariantNoise(input.name ?? ""));

  for (const def of CURATED_SERVICES) {
    const preferred = def.preferredSlugs.map(normalizeText);
    const aliases = def.aliases.map(normalizeText);

    const exactSlugMatch = !!slug && preferred.includes(slug);
    const exactAliasMatch =
      (!!name && aliases.includes(name)) ||
      (!!stripped && aliases.includes(stripped)) ||
      (!!slug && aliases.includes(slug));

    if (exactSlugMatch || exactAliasMatch) {
      return def;
    }
  }

  return null;
}

export function canonicalServiceForSlug(slug?: string | null) {
  if (!slug) return null;
  return matchCuratedService({ slug, name: slug });
}

export function getCanonicalServiceByKey(key: string) {
  return CURATED_SERVICES.find((service) => service.key === key) ?? null;
}

export function getProviderSlugsFromShow(show: ProviderBearing) {
  return [
    ...(show.primary_provider ? [show.primary_provider] : []),
    ...(show.providers_primary ?? []),
    ...(show.providers_flatrate ?? []),
    ...(show.providers_free ?? []),
    ...(show.providers_ads ?? []),
  ].filter(Boolean);
}

export function getShowCanonicalServiceKeys(show: ProviderBearing) {
  const keys = new Set<string>();

  for (const slug of getProviderSlugsFromShow(show)) {
    const match = canonicalServiceForSlug(slug);
    if (match) keys.add(match.key);
  }

  return [...keys];
}

export function mapStreamingServicesToCanonicalOptions(
  services: AvailableServiceLike[],
  selectedServiceIds?: Set<string>
): CanonicalServiceOption[] {
  const byKey = new Map<string, CanonicalServiceOption>();

  for (const service of services) {
    if (!service.active) continue;
    if (selectedServiceIds && !selectedServiceIds.has(service.id)) continue;

    const match = matchCuratedService(service);
    if (!match) continue;

    byKey.set(match.key, {
      key: match.key,
      label: match.label,
      category: match.category,
    });
  }

  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function mapCanonicalKeysToOptions(keys: Iterable<string>) {
  const byKey = new Map<string, CanonicalServiceOption>();

  for (const key of keys) {
    const match = getCanonicalServiceByKey(key);
    if (!match) continue;

    byKey.set(match.key, {
      key: match.key,
      label: match.label,
      category: match.category,
    });
  }

  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}