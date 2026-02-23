// supabase/functions/send_push_notifications/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1) Pull due, unsent notifications (limit to keep it safe)
  const { data: due, error: dueErr } = await supabase
    .from("user_notifications")
    .select("id, user_id, episode_id, type, notify_at")
    .eq("sent", false)
    .lte("notify_at", new Date().toISOString())
    .order("notify_at", { ascending: true })
    .limit(200);

  if (dueErr) {
    return new Response(JSON.stringify({ ok: false, error: dueErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, note: "no due notifications" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const userIds = Array.from(new Set(due.map((n) => n.user_id)));

  // 2) Fetch tokens for those users
  const { data: tokens, error: tokErr } = await supabase
    .from("user_push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds);

  if (tokErr) {
    return new Response(JSON.stringify({ ok: false, error: tokErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.expo_push_token);
    tokensByUser.set(t.user_id, list);
  }

  // 3) Pull episode/show info from the view for nicer messages
  // (Join by episode_id; view already includes show_title, episode_title, service_name, etc.)
  const episodeIds = Array.from(new Set(due.map((n) => n.episode_id)));
  const { data: vrows, error: vErr } = await supabase
    .from("v_week_episodes")
    .select("episode_id, show_title, episode_title, service_name")
    .in("episode_id", episodeIds);

  if (vErr) {
    return new Response(JSON.stringify({ ok: false, error: vErr.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const infoByEpisode = new Map<string, any>();
  for (const r of vrows ?? []) infoByEpisode.set(r.episode_id, r);

  // 4) Build messages (one per user_token per notification)
  const messages: { notifId: string; token: string; msg: PushMessage }[] = [];

  for (const n of due) {
    const userTokens = tokensByUser.get(n.user_id) ?? [];
    if (userTokens.length === 0) continue;

    const info = infoByEpisode.get(n.episode_id);
    const show = info?.show_title ?? "WatchWeek";
    const epTitle = info?.episode_title ? ` — ${info.episode_title}` : "";
    const service = info?.service_name ? ` on ${info.service_name}` : "";
    const title = n.type === "drop" ? "New episode dropped" : "Episode today";
    const body = `${show}${epTitle}${service}`;

    for (const token of userTokens) {
      messages.push({
        notifId: n.id,
        token,
        msg: {
          to: token,
          title,
          body,
          sound: "default",
          data: { episode_id: n.episode_id, type: n.type },
        },
      });
    }
  }

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, note: "no tokens for due notifications" }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // 5) Send to Expo push API in chunks
  const batches = chunk(messages, 100);
  const okNotifIds = new Set<string>();
  const badTokens = new Set<string>();

  for (const batch of batches) {
    const payload = batch.map((x) => x.msg);

    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await resp.json();

    // Expo returns { data: [{ status: "ok" | "error", ... }], errors?: [...] }
    const results = json?.data ?? [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const meta = batch[i];

      if (r?.status === "ok") {
        okNotifIds.add(meta.notifId);
      } else {
        // mark token bad if Expo says it's invalid
        const msg = (r?.message ?? "") as string;
        if (msg.toLowerCase().includes("not a registered") || msg.toLowerCase().includes("invalid")) {
          badTokens.add(meta.token);
        }
      }
    }
  }

  // 6) Mark notifications sent (only those that got at least one OK)
  const okIds = Array.from(okNotifIds);
  if (okIds.length > 0) {
    await supabase
      .from("user_notifications")
      .update({ sent: true, sent_at: new Date().toISOString() })
      .in("id", okIds);
  }

  // 7) Clean dead tokens (optional but recommended)
  const bad = Array.from(badTokens);
  if (bad.length > 0) {
    await supabase.from("user_push_tokens").delete().in("expo_push_token", bad);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      due: due.length,
      messages: messages.length,
      notifications_marked_sent: okIds.length,
      bad_tokens_removed: bad.length,
    }),
    { headers: { "content-type": "application/json" } }
  );
});
