// web/lib/providerSlug.ts
export function toProviderSlug(input: string) {
  const s = (input || "").trim().toLowerCase();

  // common normalizations (names -> slugs)
  const map: Record<string, string> = {
    "amazon prime video": "prime-video",
    "prime video": "prime-video",
    "amazon video": "prime-video",
    "disney+": "disney-plus",
    "disney plus": "disney-plus",
    "apple tv+": "apple-tv",
    "apple tv plus": "apple-tv",
    "hbo max": "max",
    "max": "max",
    "paramount+": "paramount-plus",
    "paramount plus": "paramount-plus",
    "peacock premium": "peacock",
  };

  if (map[s]) return map[s];

  // generic slugify
  return s
    .replace(/\+/g, " plus ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlugs(inputs: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of inputs) {
    if (!x) continue;
    const slug = toProviderSlug(x);
    if (!slug) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}