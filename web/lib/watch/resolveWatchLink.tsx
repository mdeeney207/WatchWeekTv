// web/lib/watch/resolveWatchLink.ts

export type ResolveWatchLinkInput = {
  show_web_url?: string | null;
  show_ios_url?: string | null;
  show_android_url?: string | null;

  service_web_url?: string | null;
  show_url_template?: string | null;
  ios_deep_link?: string | null;
  android_deep_link?: string | null;
  android_intent_link?: string | null;
  roku_deep_link?: string | null;
};

export type WatchDestinationKind =
  | "show_web_url"
  | "service_web_url"
  | "show_url_template"
  | "show_ios_url"
  | "show_android_url"
  | "ios_deep_link"
  | "android_deep_link"
  | "android_intent_link"
  | "roku_deep_link"
  | "none";

export type WatchDestination = {
  href: string | null;
  kind: WatchDestinationKind;
};

function clean(value?: string | null) {
  const v = String(value ?? "").trim();
  return v.length > 0 ? v : null;
}

function isBlockedPlaceholder(value?: string | null) {
  const v = clean(value)?.toLowerCase() ?? "";
  if (!v) return false;

  return (
    v.includes("deeplinks available for paid plans only") ||
    v.includes("deep links available for paid plans only")
  );
}

function hasUnresolvedTemplateToken(value?: string | null) {
  const v = clean(value);
  if (!v) return false;

  const lower = v.toLowerCase();

  if (
    lower.includes("{provider_show_id}") ||
    lower.includes("{{provider_show_id}}")
  ) {
    return true;
  }

  // Generic unresolved token guard for any remaining {...} patterns.
  return /\{[^}]+\}/.test(v);
}

function usable(value?: string | null) {
  const v = clean(value);
  if (!v) return null;
  if (isBlockedPlaceholder(v)) return null;
  if (hasUnresolvedTemplateToken(v)) return null;
  return v;
}

export function isHttpUrl(value?: string | null) {
  const v = usable(value);
  if (!v) return false;

  try {
    const parsed = new URL(v);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function firstUsableHttpUrl(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const v = usable(value);
    if (v && isHttpUrl(v)) return v;
  }
  return null;
}

function firstUsableValue(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const v = usable(value);
    if (v) return v;
  }
  return null;
}

export function resolveWatchDestination(
  input?: ResolveWatchLinkInput | null
): WatchDestination {
  if (!input) {
    return {
      href: null,
      kind: "none",
    };
  }

  // WEBSITE RULE: prefer browser-safe URLs first.
  const showWebUrl = firstUsableHttpUrl(input.show_web_url);
  if (showWebUrl) {
    return {
      href: showWebUrl,
      kind: "show_web_url",
    };
  }

  const serviceWebUrl = firstUsableHttpUrl(input.service_web_url);
  if (serviceWebUrl) {
    return {
      href: serviceWebUrl,
      kind: "service_web_url",
    };
  }

  // Only allow fully resolved template-derived URLs.
  const showUrlTemplate = firstUsableHttpUrl(input.show_url_template);
  if (showUrlTemplate) {
    return {
      href: showUrlTemplate,
      kind: "show_url_template",
    };
  }

  // App/deep-link fallbacks only after real web URLs fail.
  const showIosUrl = firstUsableValue(input.show_ios_url);
  if (showIosUrl) {
    return {
      href: showIosUrl,
      kind: "show_ios_url",
    };
  }

  const showAndroidUrl = firstUsableValue(input.show_android_url);
  if (showAndroidUrl) {
    return {
      href: showAndroidUrl,
      kind: "show_android_url",
    };
  }

  const iosDeepLink = firstUsableValue(input.ios_deep_link);
  if (iosDeepLink) {
    return {
      href: iosDeepLink,
      kind: "ios_deep_link",
    };
  }

  const androidDeepLink = firstUsableValue(input.android_deep_link);
  if (androidDeepLink) {
    return {
      href: androidDeepLink,
      kind: "android_deep_link",
    };
  }

  const androidIntentLink = firstUsableValue(input.android_intent_link);
  if (androidIntentLink) {
    return {
      href: androidIntentLink,
      kind: "android_intent_link",
    };
  }

  const rokuDeepLink = firstUsableValue(input.roku_deep_link);
  if (rokuDeepLink) {
    return {
      href: rokuDeepLink,
      kind: "roku_deep_link",
    };
  }

  return {
    href: null,
    kind: "none",
  };
}