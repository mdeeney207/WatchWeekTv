// mobile/src/lib/showServices.ts
import { supabase } from "./supabase";

export type OfferType = "flatrate" | "ads";

export type ShowServiceBadge = {
  service_id: string;
  name: string;
  logo_url: string | null;
  offer_type: OfferType;
  is_primary: boolean;
};

export async function getBadgesForTmdbShowUS(tmdbId: number): Promise<ShowServiceBadge[]> {
  try {
    // 1) Ensure server writes show + show_services (providers)
    const { data, error } = await supabase.functions.invoke("sync_show", {
      body: { tmdb_id: tmdbId, runtimeConcurrency: 4 },
    });

    if (error || !data?.show_id) {
      if (__DEV__) console.log("[showServices] sync_show failed", tmdbId, error?.message ?? data);
      return [];
    }

    const showId = String(data.show_id);

    // 2) Read show_services (US)
    const { data: ss, error: ssErr } = await supabase
      .from("show_services")
      .select("service_id,offer_type,is_primary")
      .eq("show_id", showId)
      .eq("region", "US");

    if (ssErr) {
      if (__DEV__) console.log("[showServices] show_services select failed", tmdbId, ssErr.message);
      return [];
    }

    const serviceIds = Array.from(
      new Set((ss ?? []).map((r: any) => String(r.service_id)).filter(Boolean))
    );

    if (serviceIds.length === 0) return [];

    // 3) Read streaming_services metadata
    const { data: svcs, error: svcErr } = await supabase
      .from("streaming_services")
      .select("id,name,logo_url,active")
      .in("id", serviceIds);

    if (svcErr) {
      if (__DEV__) console.log("[showServices] streaming_services select failed", tmdbId, svcErr.message);
      return [];
    }

    const svcMap = new Map<string, { name: string; logo_url: string | null; active: boolean }>();
    for (const s of svcs ?? []) {
      svcMap.set(String((s as any).id), {
        name: String((s as any).name ?? ""),
        logo_url: (s as any).logo_url ?? null,
        active: (s as any).active !== false,
      });
    }

    const mapped: ShowServiceBadge[] = (ss ?? [])
      .map((r: any) => {
        const id = String(r.service_id);
        const svc = svcMap.get(id);
        if (!svc || !svc.active || !svc.name) return null;

        return {
          service_id: id,
          offer_type: (r.offer_type ?? "flatrate") as OfferType,
          is_primary: !!r.is_primary,
          name: svc.name,
          logo_url: svc.logo_url,
        };
      })
      .filter(Boolean) as ShowServiceBadge[];

    // Prefer flatrate first, then primary, then name
    mapped.sort((a, b) => {
      const oa = a.offer_type === "flatrate" ? 0 : 1;
      const ob = b.offer_type === "flatrate" ? 0 : 1;
      if (oa !== ob) return oa - ob;
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return mapped;
  } catch (e: any) {
    if (__DEV__) console.log("[showServices] getBadgesForTmdbShowUS error", tmdbId, e?.message ?? e);
    return [];
  }
}
