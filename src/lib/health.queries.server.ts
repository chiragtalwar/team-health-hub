/** Server-only data access + orchestration for Finzarc Health. */
import { syncUltrahuman, syncWhoop } from "./health.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function whoopRedirectUri(request: Request | undefined): string {
  const explicit = process.env["WHOOP_REDIRECT_URI"];
  if (explicit) return explicit;
  if (!request) throw new Error("Cannot determine the redirect URL.");
  const url = new URL(request.url);
  const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  const origin = forwarded ? `https://${forwarded}` : url.origin;
  return `${origin}/api/public/whoop/callback`;
}

export async function createWhoopState(userId: string): Promise<string> {
  const db = await admin();
  const state = crypto.randomUUID();
  const { error } = await db.from("whoop_oauth_states").insert({ state, user_id: userId } as never);
  if (error) throw new Error(error.message);
  return state;
}

export async function consumeWhoopState(state: string): Promise<string> {
  const db = await admin();
  const { data, error } = await db
    .from("whoop_oauth_states")
    .select("user_id, created_at")
    .eq("state", state)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This authorisation link is no longer valid.");
  await db.from("whoop_oauth_states").delete().eq("state", state);
  if (Date.now() - new Date(data.created_at).getTime() > 15 * 60 * 1000) {
    throw new Error("This authorisation link expired. Please try connecting again.");
  }
  return data.user_id;
}

export async function saveUltrahumanEmail(userId: string, email: string) {
  const db = await admin();
  const { error } = await db.from("device_links").upsert(
    { user_id: userId, provider: "ultrahuman", ultrahuman_email: email } as never,
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

export type TeamData = {
  me: { userId: string; ultrahumanEmail: string | null; whoopConnected: boolean };
  profiles: { id: string; display_name: string; role_title: string }[];
  metrics: {
    user_id: string;
    metric_date: string;
    source: string;
    recovery: number | null;
    strain: number | null;
    sleep_score: number | null;
    sleep_hours: number | null;
    hrv: number | null;
    rhr: number | null;
    steps: number | null;
    temp_deviation: number | null;
    glucose_avg: number | null;
  }[];
};

export async function loadTeamData(userId: string): Promise<TeamData> {
  const db = await admin();
  const since = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: profiles }, { data: metrics }, { data: links }] = await Promise.all([
    db.from("profiles").select("id, display_name, role_title"),
    db
      .from("daily_metrics")
      .select(
        "user_id, metric_date, source, recovery, strain, sleep_score, sleep_hours, hrv, rhr, steps, temp_deviation, glucose_avg",
      )
      .gte("metric_date", since)
      .order("metric_date", { ascending: true }),
    db.from("device_links").select("provider, ultrahuman_email, access_token").eq("user_id", userId),
  ]);

  const uh = links?.find((l) => l.provider === "ultrahuman");
  const whoop = links?.find((l) => l.provider === "whoop");

  return {
    me: {
      userId,
      ultrahumanEmail: uh?.ultrahuman_email ?? null,
      whoopConnected: Boolean(whoop?.access_token),
    },
    profiles: profiles ?? [],
    metrics: (metrics ?? []) as TeamData["metrics"],
  };
}

export async function syncEverythingForUser(userId: string) {
  const db = await admin();
  const { data: links } = await db
    .from("device_links")
    .select("provider, ultrahuman_email, access_token")
    .eq("user_id", userId);

  const results: { provider: string; ok: boolean; message?: string }[] = [];
  const uhEmail = links?.find((l) => l.provider === "ultrahuman")?.ultrahuman_email;
  const hasWhoop = Boolean(links?.find((l) => l.provider === "whoop")?.access_token);

  if (uhEmail) {
    try {
      await syncUltrahuman(userId, uhEmail);
      results.push({ provider: "ultrahuman", ok: true });
    } catch (e) {
      results.push({ provider: "ultrahuman", ok: false, message: (e as Error).message });
    }
  }
  if (hasWhoop) {
    try {
      await syncWhoop(userId);
      results.push({ provider: "whoop", ok: true });
    } catch (e) {
      results.push({ provider: "whoop", ok: false, message: (e as Error).message });
    }
  }
  if (results.length === 0) {
    return { results, message: "No devices linked yet." };
  }
  return { results };
}
