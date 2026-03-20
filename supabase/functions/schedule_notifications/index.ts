import { createClient } from "jsr:@supabase/supabase-js@2";

type ScheduleResponseRow = {
  inserted_count: number;
};

type JsonRecord = Record<string, unknown>;

function json(
  body: JsonRecord,
  status = 200,
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;

  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isIsoLike(value: string | null): boolean {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return json(
        {
          ok: false,
          error: "Method not allowed. Use GET or POST.",
        },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          ok: false,
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
        },
        500,
      );
    }

    const bearer = getBearerToken(req);
    const headerSecret = req.headers.get("x-cron-secret");

    if (!cronSecret) {
      return json(
        {
          ok: false,
          error: "CRON_SECRET is not configured.",
        },
        500,
      );
    }

    if (bearer !== cronSecret && headerSecret !== cronSecret) {
      return json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        401,
      );
    }

    let body: JsonRecord = {};
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          body = await req.json() as JsonRecord;
        } catch {
          return json(
            {
              ok: false,
              error: "Invalid JSON body.",
            },
            400,
          );
        }
      }
    }

    const url = new URL(req.url);

    const qsWindowStart = url.searchParams.get("window_start");
    const qsWindowEnd = url.searchParams.get("window_end");

    const bodyWindowStart =
      typeof body.window_start === "string" ? body.window_start : null;
    const bodyWindowEnd =
      typeof body.window_end === "string" ? body.window_end : null;

    const windowStart = bodyWindowStart ?? qsWindowStart;
    const windowEnd = bodyWindowEnd ?? qsWindowEnd;

    if (windowStart && !isIsoLike(windowStart)) {
      return json(
        {
          ok: false,
          error: "window_start must be a valid ISO datetime string.",
        },
        400,
      );
    }

    if (windowEnd && !isIsoLike(windowEnd)) {
      return json(
        {
          ok: false,
          error: "window_end must be a valid ISO datetime string.",
        },
        400,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const rpcArgs: {
      p_window_start?: string;
      p_window_end?: string;
    } = {};

    if (windowStart) rpcArgs.p_window_start = windowStart;
    if (windowEnd) rpcArgs.p_window_end = windowEnd;

    const startedAt = new Date().toISOString();

    const { data, error } = await supabase.rpc(
      "schedule_notifications",
      rpcArgs,
    );

    if (error) {
      return json(
        {
          ok: false,
          error: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
          rpc_args: rpcArgs,
        },
        500,
      );
    }

    const rows = (data ?? []) as ScheduleResponseRow[];
    const insertedCount = rows[0]?.inserted_count ?? 0;
    const finishedAt = new Date().toISOString();

    return json({
      ok: true,
      function: "schedule_notifications",
      inserted_count: insertedCount,
      rpc_args: rpcArgs,
      started_at: startedAt,
      finished_at: finishedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
});