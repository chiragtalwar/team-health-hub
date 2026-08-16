import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Link2, LogOut, RefreshCw, Circle as Ring, Watch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { linkUltrahuman, startWhoopConnect, syncMyDevices } from "@/lib/health.functions";

type Props = {
  ultrahumanEmail: string | null;
  whoopConnected: boolean;
  ultrahumanKeyReady: boolean;
  whoopAppReady: boolean;
};

export function ConnectPanel({
  ultrahumanEmail,
  whoopConnected,
  ultrahumanKeyReady,
  whoopAppReady,
}: Props) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [redirect, setRedirect] = useState("/api/public/whoop/callback");
  const [email, setEmail] = useState(ultrahumanEmail ?? "");

  useEffect(() => {
    setRedirect(`${window.location.origin}/api/public/whoop/callback`);
  }, []);

  const link = useServerFn(linkUltrahuman);
  const startWhoop = useServerFn(startWhoopConnect);
  const sync = useServerFn(syncMyDevices);

  const linkRing = useMutation({
    mutationFn: () => link({ data: { email } }),
    onSuccess: async () => {
      toast.success("Ring account saved — pulling today's metrics.");
      await runSync.mutateAsync();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runSync = useMutation({
    mutationFn: () => sync({}),
    onSuccess: (res) => {
      const failed = res.results.filter((r) => !r.ok);
      if (res.results.length === 0) toast.info("Link a device first.");
      else if (failed.length === 0) toast.success("Synced.");
      else failed.forEach((f) => toast.error(`${f.provider}: ${f.message}`));
      void qc.invalidateQueries({ queryKey: ["team-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connectWhoop = useMutation({
    mutationFn: () => startWhoop({}),
    onSuccess: (res) => {
      window.location.href = res.authorizationUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel p-5 sm:p-7" id="connect">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-tag">Setup · your devices</span>
          <h2 className="mt-2 text-2xl font-semibold">Connect your ring and band</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Do this once. Nothing technical: type the email your Ultrahuman ring uses, tap the WHOOP
            button and approve. Your keys stay on the server — never in the browser.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="panel" onClick={() => runSync.mutate()} disabled={runSync.isPending}>
            <RefreshCw className={`size-4 ${runSync.isPending ? "animate-spin" : ""}`} /> Sync now
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Ultrahuman */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="label-tag flex items-center gap-1.5">
              <Ring className="size-3.5" style={{ color: "var(--glucose)" }} /> Ultrahuman Ring
            </span>
            <a
              href="https://vision.ultrahuman.com/developer-docs?api=daily"
              target="_blank"
              rel="noreferrer"
              className="label-tag inline-flex items-center gap-1 hover:text-foreground"
            >
              <Link2 className="size-3.5" /> Docs
            </a>
          </div>
          <h3 className="mt-3 text-base font-semibold">
            {ultrahumanEmail ? "Ring linked" : "Enter your ring account email"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The email you use in the Ultrahuman app. We pull sleep, HRV, steps, temperature and
            glucose for that account each day.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-[14rem] flex-1"
            />
            <Button
              variant="hero"
              onClick={() => linkRing.mutate()}
              disabled={linkRing.isPending || !email}
            >
              {ultrahumanEmail ? "Update" : "Link ring"}
            </Button>
          </div>
          <StatusLine
            ok={ultrahumanKeyReady}
            okText="Partner API key installed"
            pendingText="Waiting on the Ultrahuman partner API key (ask me to add it)"
          />
        </article>

        {/* WHOOP */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="label-tag flex items-center gap-1.5">
              <Watch className="size-3.5" style={{ color: "var(--strain)" }} /> WHOOP
            </span>
            <a
              href="https://developer.whoop.com/api/#section/Authentication"
              target="_blank"
              rel="noreferrer"
              className="label-tag inline-flex items-center gap-1 hover:text-foreground"
            >
              <Link2 className="size-3.5" /> Docs
            </a>
          </div>
          <h3 className="mt-3 text-base font-semibold">
            {whoopConnected ? "WHOOP connected" : "Authorise your WHOOP account"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            One tap sends you to WHOOP's approval screen and straight back here with recovery, strain
            and sleep flowing in.
          </p>
          <div className="mt-4">
            <Button
              variant={whoopConnected ? "panel" : "hero"}
              onClick={() => connectWhoop.mutate()}
              disabled={connectWhoop.isPending || !whoopAppReady}
            >
              {whoopConnected ? "Reconnect WHOOP" : "Connect WHOOP"}
            </Button>
          </div>
          <StatusLine
            ok={whoopAppReady}
            okText="WHOOP app credentials installed"
            pendingText="Waiting on WHOOP client ID + secret (ask me to add them)"
          />
        </article>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <span className="label-tag">WHOOP redirect URL (paste into your WHOOP app)</span>
          <p className="num mt-1 text-sm break-all text-foreground">{redirect}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(redirect);
            setCopied(true);
            toast.success("Redirect URL copied");
            window.setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </section>
  );
}

function StatusLine({
  ok,
  okText,
  pendingText,
}: {
  ok: boolean;
  okText: string;
  pendingText: string;
}) {
  return (
    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="size-1.5 rounded-full"
        style={{ background: ok ? "var(--recovery)" : "var(--strain)" }}
      />
      {ok ? okText : pendingText}
    </p>
  );
}
