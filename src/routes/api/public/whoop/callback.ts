import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whoop/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const providerError = url.searchParams.get("error");

        const back = (params: Record<string, string>) =>
          new Response(null, {
            status: 302,
            headers: { Location: `/?${new URLSearchParams(params)}` },
          });

        if (providerError) return back({ whoop: "error", reason: providerError });
        if (!code || !state) return back({ whoop: "error", reason: "missing_code" });

        try {
          const { exchangeWhoopCode, saveWhoopTokens, syncWhoop } = await import("@/lib/health.server");
          const { consumeWhoopState, whoopRedirectUri } = await import("@/lib/health.queries.server");
          const userId = await consumeWhoopState(state);
          const tokens = await exchangeWhoopCode(code, whoopRedirectUri(request));
          await saveWhoopTokens(userId, tokens);
          try {
            await syncWhoop(userId);
          } catch (syncError) {
            console.error("Initial WHOOP sync failed", syncError);
          }
          return back({ whoop: "connected" });
        } catch (error) {
          console.error("WHOOP callback failed", error);
          return back({ whoop: "error", reason: (error as Error).message.slice(0, 200) });
        }
      },
    },
  },
});
