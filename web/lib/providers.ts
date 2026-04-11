// web/lib/providers.ts

export type ProviderTheme = {
  bg: string;
  text: string;
  ring: string;
};

export type ProviderMeta = {
  label: string;
  slug: string;
  theme: ProviderTheme;
};

const DEFAULT_THEME: ProviderTheme = {
  bg: "bg-white/10",
  text: "text-zinc-100",
  ring: "ring-1 ring-white/10",
};

const PROVIDER_MAP: Record<string, ProviderMeta> = {
  netflix: {
    label: "Netflix",
    slug: "netflix",
    theme: {
      bg: "bg-red-500/15",
      text: "text-red-100",
      ring: "ring-1 ring-red-400/20",
    },
  },
  hulu: {
    label: "Hulu",
    slug: "hulu",
    theme: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-100",
      ring: "ring-1 ring-emerald-400/20",
    },
  },
  max: {
    label: "Max",
    slug: "max",
    theme: {
      bg: "bg-indigo-500/15",
      text: "text-indigo-100",
      ring: "ring-1 ring-indigo-400/20",
    },
  },
  "prime-video": {
    label: "Prime Video",
    slug: "prime-video",
    theme: {
      bg: "bg-sky-500/15",
      text: "text-sky-100",
      ring: "ring-1 ring-sky-400/20",
    },
  },
  "disney-plus": {
    label: "Disney+",
    slug: "disney-plus",
    theme: {
      bg: "bg-blue-500/15",
      text: "text-blue-100",
      ring: "ring-1 ring-blue-400/20",
    },
  },
  "apple-tv-plus": {
    label: "Apple TV+",
    slug: "apple-tv-plus",
    theme: {
      bg: "bg-zinc-500/15",
      text: "text-zinc-100",
      ring: "ring-1 ring-zinc-400/20",
    },
  },
  peacock: {
    label: "Peacock",
    slug: "peacock",
    theme: {
      bg: "bg-fuchsia-500/15",
      text: "text-fuchsia-100",
      ring: "ring-1 ring-fuchsia-400/20",
    },
  },
  "paramount-plus": {
    label: "Paramount+",
    slug: "paramount-plus",
    theme: {
      bg: "bg-cyan-500/15",
      text: "text-cyan-100",
      ring: "ring-1 ring-cyan-400/20",
    },
  },
  abc: {
    label: "ABC",
    slug: "abc",
    theme: {
      bg: "bg-white/10",
      text: "text-zinc-100",
      ring: "ring-1 ring-white/10",
    },
  },
  fox: {
    label: "FOX",
    slug: "fox",
    theme: {
      bg: "bg-amber-500/15",
      text: "text-amber-100",
      ring: "ring-1 ring-amber-400/20",
    },
  },
  nbc: {
    label: "NBC",
    slug: "nbc",
    theme: {
      bg: "bg-yellow-500/15",
      text: "text-yellow-100",
      ring: "ring-1 ring-yellow-400/20",
    },
  },
  cbs: {
    label: "CBS",
    slug: "cbs",
    theme: {
      bg: "bg-blue-500/15",
      text: "text-blue-100",
      ring: "ring-1 ring-blue-400/20",
    },
  },
  starz: {
    label: "Starz",
    slug: "starz",
    theme: {
      bg: "bg-violet-500/15",
      text: "text-violet-100",
      ring: "ring-1 ring-violet-400/20",
    },
  },
  showtime: {
    label: "Showtime",
    slug: "showtime",
    theme: {
      bg: "bg-rose-500/15",
      text: "text-rose-100",
      ring: "ring-1 ring-rose-400/20",
    },
  },
  "amc-plus": {
    label: "AMC+",
    slug: "amc-plus",
    theme: {
      bg: "bg-orange-500/15",
      text: "text-orange-100",
      ring: "ring-1 ring-orange-400/20",
    },
  },
  trending: {
    label: "Trending",
    slug: "trending",
    theme: DEFAULT_THEME,
  },
  streaming: {
    label: "Streaming",
    slug: "streaming",
    theme: DEFAULT_THEME,
  },
};

function cleanProviderInput(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeProviderKey(value?: string | null) {
  const raw = cleanProviderInput(value);
  if (!raw) return "streaming";

  switch (raw) {
    case "unknown":
    case "n/a":
    case "na":
    case "none":
    case "null":
    case "undefined":
    case "stream":
    case "streaming service":
      return "streaming";

    case "netflix":
      return "netflix";

    case "hulu":
      return "hulu";

    case "max":
    case "hbo":
    case "hbo max":
      return "max";

    case "prime video":
    case "primevideo":
    case "amazon prime":
    case "amazon prime video":
    case "amazon video":
    case "amazon instant video":
      return "prime-video";

    case "disney":
    case "disney+":
    case "disney plus":
      return "disney-plus";

    case "apple tv":
    case "apple tv+":
    case "apple tv plus":
    case "appletv":
    case "appletv+":
    case "appletv plus":
      return "apple-tv-plus";

    case "paramount":
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

    case "trending":
      return "trending";

    default: {
      const slug = raw
        .replace(/[^\p{L}\p{N}\s+&-]+/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      return slug || "streaming";
    }
  }
}

function titleCaseFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => {
      if (part === "tv") return "TV";
      if (part === "abc" || part === "nbc" || part === "cbs" || part === "fox") {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function getProviderMeta(value?: string | null): ProviderMeta {
  const key = normalizeProviderKey(value);
  const exact = PROVIDER_MAP[key];
  if (exact) return exact;

  return {
    label: key === "streaming" ? "Streaming" : titleCaseFromSlug(key),
    slug: key,
    theme: DEFAULT_THEME,
  };
}