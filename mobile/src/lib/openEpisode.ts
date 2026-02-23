import { Alert, Linking, Platform } from "react-native";

export type OpenableEpisode = {
  android_deep_link?: string | null;
  ios_deep_link?: string | null;
  android_intent_link?: string | null;

  // Web show link (usually “show page” on provider)
  show_url_template?: string | null;
  provider_show_id?: string | null;

  // Generic episode/show URLs (legacy / fallback)
  web_url?: string | null;

  // Provider/service homepage URL (what your views now expose)
  service_web_url?: string | null;

  // Optional store links
  android_play_store_url?: string | null;
  ios_app_store_url?: string | null;

  // Optional (Roku OS only)
  roku_deep_link?: string | null;
};

export type OpenMethod =
  | "intent"
  | "deep_link"
  | "service_web"
  | "web_show"
  | "web_fallback"
  | "store"
  | "roku";

export type OpenLinkOutcome =
  | { ok: true; opened_url: string; method: OpenMethod; index: number }
  | { ok: false; tried: string[]; reason: "no_candidates" | "open_failed" };

function normalizeUrl(u: unknown) {
  const s = String(u ?? "").trim();
  if (!s) return null;

  // already a scheme
  if (s.includes("://")) return s;

  // likely a domain
  if (s.startsWith("www.") || s.includes(".")) return `https://${s}`;

  // unknown token
  return s;
}

function applyTemplate(tpl: string, id: string) {
  return tpl.replace("{id}", encodeURIComponent(id));
}

function applyTemplateOrAppend(tpl: string, id: string) {
  const base = String(tpl ?? "").trim();
  if (!base) return null;

  if (base.includes("{id}")) return applyTemplate(base, id);

  const joiner = base.endsWith("/") ? "" : "/";
  return `${base}${joiner}${encodeURIComponent(id)}`;
}

function isHttpUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

async function tryOpen(url: string) {
  try {
    // For http(s), we can always attempt openURL (browser handles it)
    if (!isHttpUrl(url)) {
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (!can) return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

type Candidate = { url: string; method: OpenMethod };

function dedupe(cands: Candidate[]) {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of cands) {
    if (!c.url) continue;
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out;
}

/**
 * Opens best link for this device using strict priority.
 * NOTE: Does NOT auto-open Roku link on mobile; that should be a secondary action.
 */
export async function openEpisodeLinks(
  r: OpenableEpisode,
  opts?: {
    onResult?: (result: OpenLinkOutcome) => void;
    showAlertOnFail?: boolean;

    /**
     * If provided and a Roku link exists, caller can choose to present
     * a secondary action (button) using this callback.
     */
    onRokuAvailable?: (rokuUrl: string) => void;
  }
): Promise<OpenLinkOutcome> {
  const showAlertOnFail = opts?.showAlertOnFail ?? true;
  const id = r.provider_show_id?.trim() || null;

  const push = (arr: Candidate[], raw: string | null | undefined, method: OpenMethod) => {
    const n = normalizeUrl(raw);
    if (!n) return;
    arr.push({ url: n, method });
  };

  // Build candidates in the EXACT priority order you want.
  const ordered: Candidate[] = [];

  if (Platform.OS === "android") {
    // 1) android_intent_link (templated if needed)
    if (r.android_intent_link) {
      const u =
        id && r.android_intent_link.includes("{id}")
          ? applyTemplate(r.android_intent_link, id)
          : r.android_intent_link;
      push(ordered, u, "intent");
    }

    // 2) android_deep_link
    if (r.android_deep_link) {
      const u =
        id && r.android_deep_link.includes("{id}")
          ? applyTemplate(r.android_deep_link, id)
          : r.android_deep_link;
      push(ordered, u, "deep_link");
    }

    // 3) service_web_url
    if (r.service_web_url) push(ordered, r.service_web_url, "service_web");

    // 4) show_url_template (web show page) — optional, after service
    if (r.show_url_template && id) {
      const templated = applyTemplateOrAppend(r.show_url_template, id);
      if (templated) push(ordered, templated, "web_show");
    }

    // 5) web_url fallback
    if (r.web_url) push(ordered, r.web_url, "web_fallback");

    // 6) store
    if (r.android_play_store_url) push(ordered, r.android_play_store_url, "store");

    // Roku is NOT auto-opened (mobile can’t handle it); expose as optional secondary
    const roku = normalizeUrl(r.roku_deep_link);
    if (roku) opts?.onRokuAvailable?.(roku);
  } else {
    // iOS
    // 1) ios_deep_link
    if (r.ios_deep_link) {
      const u =
        id && r.ios_deep_link.includes("{id}") ? applyTemplate(r.ios_deep_link, id) : r.ios_deep_link;
      push(ordered, u, "deep_link");
    }

    // 2) service_web_url
    if (r.service_web_url) push(ordered, r.service_web_url, "service_web");

    // 3) show_url_template (optional)
    if (r.show_url_template && id) {
      const templated = applyTemplateOrAppend(r.show_url_template, id);
      if (templated) push(ordered, templated, "web_show");
    }

    // 4) web_url fallback
    if (r.web_url) push(ordered, r.web_url, "web_fallback");

    // 5) store
    if (r.ios_app_store_url) push(ordered, r.ios_app_store_url, "store");
  }

  const candidates = dedupe(ordered);

  if (!candidates.length) {
    const result: OpenLinkOutcome = { ok: false, tried: [], reason: "no_candidates" };
    opts?.onResult?.(result);
    if (showAlertOnFail) Alert.alert("Can’t open link", "No link is available for this episode.");
    return result;
  }

  const tried: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const { url, method } = candidates[i];
    tried.push(url);
    const opened = await tryOpen(url);
    if (opened) {
      const result: OpenLinkOutcome = { ok: true, opened_url: url, method, index: i };
      opts?.onResult?.(result);
      return result;
    }
  }

  const result: OpenLinkOutcome = { ok: false, tried, reason: "open_failed" };
  opts?.onResult?.(result);

  if (showAlertOnFail) {
    Alert.alert("Can’t open link", "No compatible link is available for this device.");
  }

  return result;
}
