import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Flame, Gauge as GaugeIcon, HeartPulse, Moon, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Gauge, Bar } from "@/components/health/gauge";
import { TeamCompareChart, TrendArea } from "@/components/health/trend";
import { MemberPanel } from "@/components/health/member-panel";
import { ConnectPanel } from "@/components/health/connect-panel";
import {
  members as demoMembers,
  teamAverages as demoAverages,
  teamStrainLoad as demoStrain,
  zones,
  type Member,
} from "@/lib/health-data";
import { averages as computeAverages, toMembers } from "@/lib/live-members";
import { getSetupStatus, getTeamData } from "@/lib/health.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finzarc Health — Ultrahuman + WHOOP Team Dashboard" },
      {
        name: "description",
        content:
          "One dashboard for Ultrahuman Ring and WHOOP data: recovery, strain, sleep, HRV and glucose for you and your teammate, side by side.",
      },
      { property: "og:title", content: "Finzarc Health — Ultrahuman + WHOOP Team Dashboard" },
      {
        property: "og:description",
        content:
          "Recovery, strain, sleep and HRV from Ultrahuman Ring and WHOOP, unified into a single team readiness view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function useSession() {
  const [state, setState] = useState<{ ready: boolean; signedIn: boolean }>({
    ready: false,
    signedIn: false,
  });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ ready: true, signedIn: Boolean(data.session) });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ ready: true, signedIn: Boolean(session) });
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

function Dashboard() {
  const { ready, signedIn } = useSession();
  const fetchTeam = useServerFn(getTeamData);
  const fetchSetup = useServerFn(getSetupStatus);

  const team = useQuery({
    queryKey: ["team-data"],
    queryFn: () => fetchTeam({}),
    enabled: ready && signedIn,
  });
  const setup = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => fetchSetup({}),
    enabled: ready && signedIn,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whoop = params.get("whoop");
    if (!whoop) return;
    if (whoop === "connected") toast.success("WHOOP connected — data is flowing in.");
    else toast.error(`WHOOP connection failed: ${params.get("reason") ?? "unknown"}`);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const liveMembers: Member[] = team.data ? toMembers(team.data) : [];
  const isLive = liveMembers.length > 0;
  const members = isLive ? liveMembers : demoMembers;
  const averages = isLive ? computeAverages(liveMembers) : demoAverages;
  const strainLoad = isLive
    ? members[0]!.strainTrend.map((p, i) => ({
        t: p.t,
        v: +(
          members.reduce((a, m) => a + (m.strainTrend[i]?.v ?? 0), 0) / members.length
        ).toFixed(1),
      }))
    : demoStrain;

  const you = members[0]!;
  const mate = members[1] ?? members[0]!;
  const compare = you.readinessTrend.map((p, i) => ({
    t: p.t,
    you: p.v,
    mate: mate.readinessTrend[i]?.v ?? 0,
  }));
  const readinessDelta = you.recovery - mate.recovery;

  return (
    <main className="min-h-screen bg-background">
      <div className="relative overflow-hidden border-b border-border">
        <div className="hero-wash absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-2"
                style={{ boxShadow: "var(--glow-recovery)" }}
              >
                <HeartPulse className="size-4" style={{ color: "var(--recovery)" }} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold tracking-tight">FINZARC HEALTH</p>
                <p className="label-tag">Team biometrics · v1</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="label-tag hidden sm:inline">
                {isLive ? "Live device data" : "Demo snapshot"}
              </span>
              {signedIn ? (
                <a href="#connect">
                  <Button variant="panel" size="sm">
                    Connect devices <ArrowUpRight className="size-3.5" />
                  </Button>
                </a>
              ) : (
                <Link to="/auth">
                  <Button variant="hero" size="sm">
                    Sign in <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <span className="label-tag">{isLive ? "Live · today" : "Preview · today"}</span>
              <h1 className="mt-3 text-4xl leading-[1.05] font-semibold sm:text-6xl">
                Two devices.
                <br />
                <span style={{ color: "var(--recovery)" }}>One team readiness</span> signal.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your Ultrahuman Ring and WHOOP strap stream into the same board as your teammate's,
                so recovery, strain and sleep debt read as one number instead of two apps.
              </p>
              {!signedIn && ready && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to="/auth">
                    <Button variant="hero">Sign in and link your devices</Button>
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    Numbers below are a sample until you connect.
                  </span>
                </div>
              )}
              <div className="mt-7 flex flex-wrap items-center gap-6">
                <div>
                  <span className="label-tag">Team recovery</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--recovery)" }}>
                    {averages.recovery}%
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg strain</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--strain)" }}>
                    {averages.strain}
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg sleep</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--sleep)" }}>
                    {averages.sleep}h
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg HRV</span>
                  <p className="num text-3xl font-semibold text-foreground">{averages.hrv}ms</p>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <div className="flex items-center justify-between">
                <span className="label-tag">Team readiness index</span>
                <span className="label-tag">7-day load</span>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <Gauge
                  value={averages.recovery}
                  label="Ready"
                  sublabel={averages.recovery >= 67 ? "Train hard" : "Ease in"}
                  size={148}
                />
                <div className="flex-1">
                  <TrendArea data={strainLoad} tone="strain" height={110} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Combined strain across the team, last {strainLoad.length} days.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-3">
                {zones.map((z) => (
                  <div key={z.label}>
                    <p className="num text-sm">{z.pct}%</p>
                    <p className="label-tag mb-1.5 text-[0.5625rem]">{z.label}</p>
                    <Bar value={z.pct} tone="sleep" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">Today, person by person</h2>
          <span className="label-tag">Ultrahuman daily metrics · WHOOP cycles</span>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {members.map((m) => (
            <MemberPanel key={m.id} member={m} />
          ))}
        </div>

        <section className="panel mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label-tag">Head to head</span>
              <h2 className="mt-2 text-2xl font-semibold">Recovery, side by side</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="num flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-0.5 w-5" style={{ background: "var(--recovery)" }} />
                {you.name.split(" ")[0]}
              </span>
              <span className="num flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-0.5 w-5"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, var(--sleep) 0 5px, transparent 5px 9px)",
                  }}
                />
                {mate.name.split(" ")[0]}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <TeamCompareChart data={compare} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: GaugeIcon,
                title: "Readiness gap",
                body: `${you.name.split(" ")[0]} is ${Math.abs(readinessDelta)} pts ${
                  readinessDelta >= 0 ? "ahead" : "behind"
                } today — schedule the heavy block on the stronger side.`,
                tone: "recovery" as const,
              },
              {
                icon: Flame,
                title: "Overreaching risk",
                body: `${mate.name.split(" ")[0]} is carrying ${mate.strain} strain against ${mate.hrv}ms HRV. One easy day is the cheap fix.`,
                tone: "strain" as const,
              },
              {
                icon: Moon,
                title: "Sleep debt",
                body: `Team is ${Math.max(0, 8 - averages.sleep).toFixed(1)}h/night short of the 8h target — biggest single lever on tomorrow's recovery.`,
                tone: "sleep" as const,
              },
            ].map((c) => (
              <article key={c.title} className="rounded-xl border border-border bg-surface p-4">
                <span className="label-tag flex items-center gap-1.5">
                  <c.icon className="size-3.5" style={{ color: `var(--${c.tone})` }} />
                  {c.title}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6">
          {signedIn ? (
            <ConnectPanel
              ultrahumanEmail={team.data?.me.ultrahumanEmail ?? null}
              whoopConnected={team.data?.me.whoopConnected ?? false}
              ultrahumanKeyReady={setup.data?.ultrahumanKey ?? false}
              whoopAppReady={setup.data?.whoopApp ?? false}
            />
          ) : (
            <section className="panel p-5 sm:p-7" id="connect">
              <span className="label-tag">Setup</span>
              <h2 className="mt-2 text-2xl font-semibold">Connect your ring and band</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Create your account first — then it's two taps: type the email your Ultrahuman ring
                uses, and approve WHOOP. Both of you do this once on your own device.
              </p>
              <Link to="/auth" className="mt-5 inline-block">
                <Button variant="hero">Create account / sign in</Button>
              </Link>
            </section>
          )}
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="label-tag">Finzarc Health · built for two, ready for the whole team</p>
          <p className="num flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3.5" style={{ color: "var(--recovery)" }} />{" "}
            {isLive ? `live · ${you.lastSync}` : "demo snapshot"}
          </p>
        </footer>
      </div>
    </main>
  );
}
