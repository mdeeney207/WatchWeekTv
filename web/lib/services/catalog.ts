export type ServiceCategory = "core" | "live" | "free" | "specialty";

export type CanonicalServiceDefinition = {
  key: string;
  label: string;
  description: string;
  category: ServiceCategory;
  preferredSlugs: string[];
  aliases: string[];
};

export const CURATED_SERVICES: CanonicalServiceDefinition[] = [
  {
    key: "netflix",
    label: "Netflix",
    description: "Global originals, breakout series, films, and franchise drops.",
    category: "core",
    preferredSlugs: ["netflix"],
    aliases: ["netflix"],
  },
  {
    key: "prime-video",
    label: "Amazon Prime Video",
    description: "Originals, movies, and broad studio distribution.",
    category: "core",
    preferredSlugs: ["prime-video", "amazon-prime-video"],
    aliases: ["prime video", "amazon prime video", "prime-video"],
  },
  {
    key: "apple-tv-plus",
    label: "Apple TV+",
    description: "Prestige originals and tightly curated premium releases.",
    category: "core",
    preferredSlugs: ["apple-tv-plus", "appletv-plus", "apple-tv+"],
    aliases: ["apple tv+", "apple tv plus", "appletv+"],
  },
  {
    key: "disney-plus",
    label: "Disney+",
    description: "Franchise drops, family programming, and marquee releases.",
    category: "core",
    preferredSlugs: ["disney-plus", "disney+"],
    aliases: ["disney+", "disney plus", "disney-plus"],
  },
  {
    key: "hulu",
    label: "Hulu",
    description: "Next-day TV, originals, and broad streaming catalog depth.",
    category: "core",
    preferredSlugs: ["hulu"],
    aliases: ["hulu"],
  },
  {
    key: "max",
    label: "Max",
    description: "Prestige TV, HBO originals, films, and premium catalog titles.",
    category: "core",
    preferredSlugs: ["max", "hbo-max", "hbo"],
    aliases: ["max", "hbo max", "hbomax", "hbo"],
  },
  {
    key: "peacock",
    label: "Peacock",
    description: "NBCUniversal shows, live events, and next-day streaming support.",
    category: "core",
    preferredSlugs: ["peacock"],
    aliases: ["peacock"],
  },
  {
    key: "paramount-plus",
    label: "Paramount+",
    description: "CBS, Showtime, live sports, and franchise streaming releases.",
    category: "core",
    preferredSlugs: ["paramount-plus", "paramount+"],
    aliases: ["paramount+", "paramount plus", "paramount-plus"],
  },
  {
    key: "youtube-tv",
    label: "YouTube TV",
    description: "Live-channel bundle access for major broadcast and cable viewing.",
    category: "live",
    preferredSlugs: ["youtube-tv"],
    aliases: ["youtube tv", "youtube-tv"],
  },
  {
    key: "fox-sports",
    label: "FOX Sports",
    description: "Live sports access and event-driven viewing support.",
    category: "live",
    preferredSlugs: ["fox-sports", "fox-sports-app"],
    aliases: ["fox sports", "fox sports app", "fox-sports"],
  },
  {
    key: "espn-plus",
    label: "ESPN+",
    description: "Sports-first streaming for events, shoulder content, and originals.",
    category: "live",
    preferredSlugs: ["espn-plus", "espn+"],
    aliases: ["espn+", "espn plus", "espn-plus"],
  },
  {
    key: "tubi",
    label: "Tubi",
    description: "Free ad-supported catalog with broad on-demand coverage.",
    category: "free",
    preferredSlugs: ["tubi", "tubi-tv"],
    aliases: ["tubi", "tubi tv"],
  },
  {
    key: "roku-channel",
    label: "The Roku Channel",
    description: "Free streaming catalog and live channels in the Roku ecosystem.",
    category: "free",
    preferredSlugs: ["roku-channel", "the-roku-channel"],
    aliases: ["the roku channel", "roku channel"],
  },
  {
    key: "cw",
    label: "CW",
    description: "Free access to CW programming and supported catch-up viewing.",
    category: "free",
    preferredSlugs: ["cw"],
    aliases: ["cw", "the cw"],
  },
  {
    key: "britbox",
    label: "BritBox",
    description: "British TV catalog and premium imported series.",
    category: "specialty",
    preferredSlugs: ["britbox"],
    aliases: ["britbox"],
  },
  {
    key: "crunchyroll",
    label: "Crunchyroll",
    description: "Anime-first library and simulcast-friendly streaming access.",
    category: "specialty",
    preferredSlugs: ["crunchyroll"],
    aliases: ["crunchyroll"],
  },
  {
    key: "amc-plus",
    label: "AMC+",
    description: "AMC originals and a focused premium TV bundle.",
    category: "specialty",
    preferredSlugs: ["amc-plus", "amc+"],
    aliases: ["amc+", "amc plus", "amc-plus"],
  },
  {
    key: "discovery-plus",
    label: "discovery+",
    description: "Unscripted, lifestyle, food, and factual entertainment streaming.",
    category: "specialty",
    preferredSlugs: ["discovery-plus", "discovery+"],
    aliases: ["discovery+", "discovery plus", "discovery-plus"],
  },
];