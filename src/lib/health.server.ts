/**
 * Server-only provider integrations for Finzarc Health.
 * Talks to the Ultrahuman Partner API and the WHOOP API, then upserts
 * normalised rows into public.daily_metrics.
 */

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_SCOPES =
  "offline read:recovery read:sleep read:workout read:cycles read:profile read:body_measurement";

const UH_BASE = "https://partner.ultrahuman.com/api/v1/metrics";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type MetricRow = {
  user_id: string;
  metric_date: string;
  source: "ultrahuman" | "whoop";
  recovery?: number | null;
  strain?: number | null;
  sleep_score?: number | null;
  sleep_hours?: number | null;
  hrv?: number | null;
  rhr?: number | null;
  steps?: number | null;
  temp_deviation?: number | null;
  glucose_avg?: number | null;
  raw?: unknown;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function upsert(rows: MetricRow[]) {
  if (rows.length === 0) return;
  const db = await admin();
  const { error } = await db
    .from("daily_metrics")
    .upsert(rows as never, { onConflict: "user_id,metric_date,source" });
  if (error) throw new Error(`Saving metrics failed: ${error.message}`);
}

/* ------------------------------ Ultrahuman ------------------------------ */

function pickNumber(objects: Record<string, unknown>[], keys: string[]): number | null {
  for (const obj of objects) {
    const type = String(obj["type"] ?? obj["name"] ?? "").toLowerCase();
    if (!keys.some((k) => type.includes(k))) continue;
    const object = (obj["object"] ?? {}) as Record<string, unknown>;
    const candidate = object["value"] ?? object["total"] ?? object["avg"] ?? obj["value"];
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function syncUltrahuman(userId: string, email: string, date = today()) {
  const key = process.env["ULTRAHUMAN_API_KEY"];
  if (!key) throw new Error("Ultrahuman API key is not configured yet.");

  const res = await fetch(`${UH_BASE}?email=${encodeURIComponent(email)}&date=${date}`, {
    headers: { Authorization: key },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Ultrahuman request failed [${res.status}]: ${body}`);

  const parsed = JSON.parse(body) as { data?: { metric_data?: Record<string, unknown>[] } };
  const items = parsed.data?.metric_data ?? [];

  await upsert([
    {
      user_id: userId,
      metric_date: date,
      source: "ultrahuman",
      hrv: pickNumber(items, ["hrv"]),
      rhr: pickNumber(items, ["resting_heart", "rhr"]),
      steps: pickNumber(items, ["steps"]),
      temp_deviation: pickNumber(items, ["temp"]),
      glucose_avg: pickNumber(items, ["glucose"]),
      sleep_score: pickNumber(items, ["sleep_index", "sleep_score"]),
      recovery: pickNumber(items, ["recovery"]),
      raw: parsed,
    },
  ]);

  return { date, saved: true };
}

/* --------------------------------- WHOOP -------------------------------- */

type TokenSet = { access_token: string; refresh_token?: string; expires_in: number };

export function whoopCreds() {
  const clientId = process.env["WHOOP_CLIENT_ID"];
  const clientSecret = process.env["WHOOP_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("WHOOP app credentials are not configured yet.");
  return { clientId, clientSecret };
}

export async function exchangeWhoopCode(code: string, redirectUri: string): Promise<TokenSet> {
  const { clientId, clientSecret } = whoopCreds();
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WHOOP token exchange failed [${res.status}]: ${text}`);
  return JSON.parse(text) as TokenSet;
}

async function refreshWhoop(refreshToken: string): Promise<TokenSet> {
  const { clientId, clientSecret } = whoopCreds();
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WHOOP token refresh failed [${res.status}]: ${text}`);
  return JSON.parse(text) as TokenSet;
}

export async function saveWhoopTokens(userId: string, tokens: TokenSet) {
  const db = await admin();
  const { error } = await db.from("device_links").upsert(
    {
      user_id: userId,
      provider: "whoop",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    } as never,
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(`Saving WHOOP connection failed: ${error.message}`);
}

async function whoopAccessToken(userId: string): Promise<string> {
  const db = await admin();
  const { data, error } = await db
    .from("device_links")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "whoop")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.access_token) throw new Error("WHOOP is not connected for this account yet.");

  const expired = data.expires_at ? new Date(data.expires_at).getTime() - 60_000 < Date.now() : true;
  if (expired && data.refresh_token) {
    const fresh = await refreshWhoop(data.refresh_token);
    await saveWhoopTokens(userId, { ...fresh, refresh_token: fresh.refresh_token ?? data.refresh_token });
    return fresh.access_token;
  }
  return data.access_token;
}

async function whoopGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://api.prod.whoop.com/developer${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WHOOP request failed [${res.status}]: ${text}`);
  return JSON.parse(text) as T;
}

type Paged<T> = { records?: T[] };

export async function syncWhoop(userId: string, date = today()) {
  const token = await whoopAccessToken(userId);

  const [recovery, cycles, sleep] = await Promise.all([
    whoopGet<Paged<{ score?: Record<string, number> }>>(token, "/v1/recovery?limit=1"),
    whoopGet<Paged<{ score?: Record<string, number> }>>(token, "/v1/cycle?limit=1"),
    whoopGet<Paged<{ score?: Record<string, unknown> }>>(token, "/v1/activity/sleep?limit=1"),
  ]);

  const rec = recovery.records?.[0]?.score ?? {};
  const cyc = cycles.records?.[0]?.score ?? {};
  const slp = (sleep.records?.[0]?.score ?? {}) as Record<string, unknown>;
  const stageSummary = (slp["stage_summary"] ?? {}) as Record<string, number>;
  const asleepMs =
    (stageSummary["total_light_sleep_time_milli"] ?? 0) +
    (stageSummary["total_slow_wave_sleep_time_milli"] ?? 0) +
    (stageSummary["total_rem_sleep_time_milli"] ?? 0);

  await upsert([
    {
      user_id: userId,
      metric_date: date,
      source: "whoop",
      recovery: rec["recovery_score"] ?? null,
      hrv: rec["hrv_rmssd_milli"] ?? null,
      rhr: rec["resting_heart_rate"] ?? null,
      temp_deviation: rec["skin_temp_celsius"] ?? null,
      strain: cyc["strain"] ?? null,
      sleep_score: (slp["sleep_performance_percentage"] as number) ?? null,
      sleep_hours: asleepMs ? +(asleepMs / 3_600_000).toFixed(2) : null,
      raw: { recovery, cycles, sleep },
    },
  ]);

  return { date, saved: true };
}
