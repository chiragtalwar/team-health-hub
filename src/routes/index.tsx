import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Flame, Gauge as GaugeIcon, HeartPulse, Moon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Gauge, Bar } from "@/components/health/gauge";
import { TeamCompareChart, TrendArea } from "@/components/health/trend";
import { MemberPanel } from "@/components/health/member-panel";
import { ConnectPanel } from "@/components/health/connect-panel";
import { members, teamAverages, teamStrainLoad, zones } from "@/lib/health-data";

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

function Dashboard() {
  const [you, mate] = members;
  const compare = you!.readinessTrend.map((p, i) => ({
    t: p.t,
    you: p.v,
    mate: mate!.readinessTrend[i]?.v ?? 0,
  }));

  const readinessDelta = you!.recovery - mate!.recovery;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero / command bar */}
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
              <span className="label-tag hidden sm:inline">Ultrahuman + WHOOP linked</span>
              <a href="#connect">
                <Button variant="panel" size="sm">
                  Connect devices <ArrowUpRight className="size-3.5" />
                </Button>
              </a>
            </div>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <span className="label-tag">Step 01 · Today</span>
              <h1 className="mt-3 text-4xl leading-[1.05] font-semibold sm:text-6xl">
                Two devices.
                <br />
                <span style={{ color: "var(--recovery)" }}>One team readiness</span> signal.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your Ultrahuman Ring and WHOOP strap stream into the same board as your teammate's,
                so recovery, strain and sleep debt read as one number instead of two apps.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-6">
                <div>
                  <span className="label-tag">Team recovery</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--recovery)" }}>
                    {teamAverages.recovery}%
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg strain</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--strain)" }}>
                    {teamAverages.strain}
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg sleep</span>
                  <p className="num text-3xl font-semibold" style={{ color: "var(--sleep)" }}>
                    {teamAverages.sleep}h
                  </p>
                </div>
                <div>
                  <span className="label-tag">Avg HRV</span>
                  <p className="num text-3xl font-semibold text-foreground">{teamAverages.hrv}ms</p>
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
                  value={teamAverages.recovery}
                  label="Ready"
                  sublabel="Train hard-ish"
                  size={148}
                />
                <div className="flex-1">
                  <TrendArea data={teamStrainLoad} tone="strain" height={110} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Combined strain trending{" "}
                    <span style={{ color: "var(--strain)" }}>up 12%</span> week over week.
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

      {/* Member panels */}
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

        {/* Head to head */}
        <section className="panel mt-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="label-tag">Head to head</span>
              <h2 className="mt-2 text-2xl font-semibold">Recovery, side by side</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="num flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-0.5 w-5" style={{ background: "var(--recovery)" }} />
                {you!.name.split(" ")[0]}
              </span>
              <span className="num flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-0.5 w-5"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, var(--sleep) 0 5px, transparent 5px 9px)",
                  }}
                />
                {mate!.name.split(" ")[0]}
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
                body: `${you!.name.split(" ")[0]} is ${Math.abs(readinessDelta)} pts ${
                  readinessDelta > 0 ? "ahead" : "behind"
                } today — schedule the heavy block on the stronger side.`,
                tone: "recovery" as const,
              },
              {
                icon: Flame,
                title: "Overreaching risk",
                body: `${mate!.name.split(" ")[0]} has 3 straight days above 17 strain with HRV down 11ms. One easy day is the cheap fix.`,
                tone: "strain" as const,
              },
              {
                icon: Moon,
                title: "Sleep debt",
                body: `Team is ${(8 - teamAverages.sleep).toFixed(1)}h/night short of the 8h target — biggest single lever on tomorrow's recovery.`,
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
          <ConnectPanel />
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="label-tag">Finzarc Health · built for two, ready for the whole team</p>
          <p className="num flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="size-3.5" style={{ color: "var(--recovery)" }} /> demo snapshot
          </p>
        </footer>
      </div>
    </main>
  );
}
