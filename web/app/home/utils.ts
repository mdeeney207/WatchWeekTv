import { toProviderKey, type FollowedShow } from "@/lib/home/selectHero";
import type { SelectableProviderKey, CandidateCardModel } from "./types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function normalizeTitleKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDowMonthDay(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function hoursFromNowLabel(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

export function providerKeyToSlug(p: SelectableProviderKey): string {
  switch (p) {
    case "Netflix":
      return "netflix";
    case "Hulu":
      return "hulu";
    case "Max":
      return "max";
    case "Prime Video":
      return "prime-video";
    case "Disney+":
      return "disney-plus";
    case "Apple TV+":
      return "apple-tv-plus";
    case "Peacock":
      return "peacock";
    case "Paramount+":
      return "paramount-plus";
    default:
      return String(p).toLowerCase();
  }
}

export function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function sanitizeStoredProviders(input: unknown): SelectableProviderKey[] {
  if (!Array.isArray(input)) return ["Netflix", "Hulu", "Max"];

  const allowed = new Set<SelectableProviderKey>([
    "Netflix",
    "Hulu",
    "Max",
    "Prime Video",
    "Disney+",
    "Apple TV+",
    "Peacock",
    "Paramount+",
  ]);

  const cleaned = input.filter(
    (item): item is SelectableProviderKey =>
      typeof item === "string" && allowed.has(item as SelectableProviderKey)
  );

  return cleaned.length ? cleaned : ["Netflix", "Hulu", "Max"];
}

export function sanitizeStoredFollowed(input: unknown): FollowedShow[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      const raw = item as Partial<FollowedShow>;
      const provider = toProviderKey(raw.provider);

      const cleaned: FollowedShow = {
        id: String(raw.id ?? ""),
        title: String(raw.title ?? "").trim(),
        provider,
        posterUrl: raw.posterUrl ?? undefined,
        backdropUrl: raw.backdropUrl ?? undefined,
        tmdbId:
          typeof raw.tmdbId === "number" && Number.isFinite(raw.tmdbId)
            ? raw.tmdbId
            : raw.id && Number.isFinite(Number(raw.id))
              ? Number(raw.id)
              : null,
      };

      if (
        raw.scheduleSource === "verified" &&
        isValidIsoDate(raw.nextAirsAtISO)
      ) {
        cleaned.nextAirsAtISO = raw.nextAirsAtISO;
        cleaned.scheduleSource = "verified";
      }

      if (!cleaned.id || !cleaned.title) return null;
      return cleaned;
    })
    .filter(Boolean) as FollowedShow[];
}

export function uniqueCards(items: CandidateCardModel[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.id}::${item.date?.toISOString() ?? "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function firstFutureCard(items: CandidateCardModel[]) {
  const now = Date.now();
  return (
    items.find((item) => item.date && item.date.getTime() > now) ??
    items[0] ??
    null
  );
}