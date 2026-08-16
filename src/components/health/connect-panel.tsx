import { useState } from "react";
import { Check, Copy, KeyRound, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  provider: "Ultrahuman" | "WHOOP";
  title: string;
  detail: string;
  needs: string[];
  doc: string;
};

const steps: Step[] = [
  {
    id: "uh",
    provider: "Ultrahuman",
    title: "Partner API key + ring email",
    detail:
      "Ultrahuman's Vision partner API is a server-to-server key. Requests hit /api/v1/metrics?email=<ring account>&date=YYYY-MM-DD with the key in an Authorization header, returning sleep, HRV, temperature, steps and glucose for that day.",
    needs: ["Partner API key", "Ring account email for each teammate"],
    doc: "https://vision.ultrahuman.com/developer-docs?api=daily",
  },
  {
    id: "whoop",
    provider: "WHOOP",
    title: "OAuth 2.0 app credentials",
    detail:
      "WHOOP uses per-user OAuth. Create an app in the WHOOP developer dashboard, add the redirect URL below, and each teammate authorises once with scopes read:recovery read:sleep read:workout read:cycles read:profile.",
    needs: ["Client ID", "Client secret", "Redirect URL registered"],
    doc: "https://developer.whoop.com/api/#section/Authentication",
  },
];

export function ConnectPanel() {
  const [copied, setCopied] = useState(false);
  const redirect =
    typeof window === "undefined" ? "/api/public/whoop/callback" : `${window.location.origin}/api/public/whoop/callback`;

  return (
    <section className="panel p-5 sm:p-7" id="connect">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-tag">Step 02 · Go live</span>
          <h2 className="mt-2 text-2xl font-semibold">Connect the real devices</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The dashboard above is running on a demo snapshot shaped exactly like the two APIs. To
            swap in live data, three things have to come from your side — everything else is wired
            for you.
          </p>
        </div>
        <Button variant="hero" onClick={() => toast.info("Send the credentials in chat and I'll wire live sync next.")}>
          <KeyRound className="size-4" /> I have the credentials
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {steps.map((s) => (
          <article key={s.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="label-tag">{s.provider}</span>
              <a
                href={s.doc}
                target="_blank"
                rel="noreferrer"
                className="label-tag inline-flex items-center gap-1 hover:text-foreground"
              >
                <Link2 className="size-3.5" /> Docs
              </a>
            </div>
            <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
            <ul className="mt-4 space-y-2">
              {s.needs.map((n) => (
                <li key={n} className="flex items-center gap-2 text-sm">
                  <Check className="size-4" style={{ color: "var(--recovery)" }} />
                  {n}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <span className="label-tag">WHOOP redirect URL</span>
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

      <p className="mt-4 text-xs text-muted-foreground">
        Keys are never stored in the browser — when you hand them over they go into encrypted server
        secrets and every device call runs server-side.
      </p>
    </section>
  );
}
