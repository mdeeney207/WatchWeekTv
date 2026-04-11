export type GroupableWatchOption = {
  provider_name: string;
  provider_slug: string;
  language?: string | null;
  availability_type?: string | null;
  is_primary?: boolean | null;
};

export type WatchSection<T extends GroupableWatchOption = GroupableWatchOption> = {
  key: string;
  title: string;
  items: T[];
};

export function languageLabel(language: string | null | undefined): string {
  switch (String(language ?? "").trim().toLowerCase()) {
    case "en":
      return "English";
    case "es":
      return "Spanish";
    default: {
      const normalized = String(language ?? "").trim();
      return normalized ? normalized.toUpperCase() : "Other";
    }
  }
}

export function availabilityLabel(
  availabilityType: string | null | undefined
): string {
  switch (String(availabilityType ?? "").trim().toLowerCase()) {
    case "live_event":
      return "Live";
    case "highlight":
    case "highlights":
      return "Highlights";
    case "replay":
      return "Replay";
    default:
      return "Other";
  }
}

export function buildWatchSections<T extends GroupableWatchOption>(
  options: T[]
): WatchSection<T>[] {
  const sections: WatchSection<T>[] = [];

  const liveByLanguage = new Map<string, T[]>();
  const nonLiveByType = new Map<string, T[]>();

  for (const option of options) {
    const availabilityType = String(option.availability_type ?? "")
      .trim()
      .toLowerCase();

    if (availabilityType === "live_event") {
      const lang = languageLabel(option.language);
      const existing = liveByLanguage.get(lang) ?? [];
      existing.push(option);
      liveByLanguage.set(lang, existing);
    } else {
      const label = availabilityLabel(option.availability_type);
      const existing = nonLiveByType.get(label) ?? [];
      existing.push(option);
      nonLiveByType.set(label, existing);
    }
  }

  const liveLanguageOrder = ["English", "Spanish"];
  const orderedLiveLanguages = [
    ...liveLanguageOrder.filter((lang) => liveByLanguage.has(lang)),
    ...Array.from(liveByLanguage.keys()).filter(
      (lang) => !liveLanguageOrder.includes(lang)
    ),
  ];

  for (const lang of orderedLiveLanguages) {
    const items = [...(liveByLanguage.get(lang) ?? [])].sort((a, b) => {
      const primaryDelta =
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      if (primaryDelta !== 0) return primaryDelta;

      return a.provider_name.localeCompare(b.provider_name);
    });

    sections.push({
      key: `live-${lang.toLowerCase().replace(/\s+/g, "-")}`,
      title: lang,
      items,
    });
  }

  const typeOrder = ["Highlights", "Replay", "Other"];
  const orderedTypes = [
    ...typeOrder.filter((label) => nonLiveByType.has(label)),
    ...Array.from(nonLiveByType.keys()).filter(
      (label) => !typeOrder.includes(label)
    ),
  ];

  for (const type of orderedTypes) {
    const items = [...(nonLiveByType.get(type) ?? [])].sort((a, b) => {
      const primaryDelta =
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      if (primaryDelta !== 0) return primaryDelta;

      return a.provider_name.localeCompare(b.provider_name);
    });

    sections.push({
      key: `type-${type.toLowerCase().replace(/\s+/g, "-")}`,
      title: type,
      items,
    });
  }

  return sections;
}