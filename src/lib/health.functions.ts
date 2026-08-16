import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTeamData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadTeamData } = await import("./health.queries.server");
    return loadTeamData(context.userId);
  });

export const linkUltrahuman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    return { email };
  })
  .handler(async ({ data, context }) => {
    const { saveUltrahumanEmail } = await import("./health.queries.server");
    await saveUltrahumanEmail(context.userId, data.email);
    return { ok: true };
  });

export const startWhoopConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { WHOOP_SCOPES, WHOOP_AUTH_URL, whoopCreds } = await import("./health.server");
    const { createWhoopState, whoopRedirectUri } = await import("./health.queries.server");
    const { clientId } = whoopCreds();
    const request = getRequest();
    const redirectUri = whoopRedirectUri(request);
    const state = await createWhoopState(context.userId);
    const url = `${WHOOP_AUTH_URL}?${new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: WHOOP_SCOPES,
      state,
    })}`;
    return { authorizationUrl: url };
  });

export const syncMyDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncEverythingForUser } = await import("./health.queries.server");
    return syncEverythingForUser(context.userId);
  });
