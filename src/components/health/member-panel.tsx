import { Activity, Droplets, Footprints, HeartPulse, Moon, Thermometer } from "lucide-react";
import { Bar, Gauge } from "./gauge";
import { TrendArea } from "./trend";
import { recoveryBand, type Member } from "@/lib/health-data";

function SourceBadge({ source }: { source: Member["sources"][number] }) {
  const isRing = source === "ultrahuman";
  return (
    <span className="label-tag inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[0.625rem]">
      <span
        className="size-1.5 rounded-full"
        style={{ background: isRing ? "var(--glucose)" : "var(--sleep)" }}
      />
      {isRing ? "Ultrahuman Ring" : "WHOOP 5.0"}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  fill,
}: {
  icon: typeof HeartPulse;
  label: string;
  value: string;
  unit?: string;
  tone: "recovery" | "strain" | "sleep" | "glucose";
  fill: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="label-tag flex items-center gap-1.5">
          <Icon className="size-3.5" style={{ color: `var(--${tone})` }} />
          {label}
        </span>
      </div>
      <p className="num mt-2 text-2xl font-semibold text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xs text-muted-foreground">{unit}</span> : null}
      </p>
      <div className="mt-2">
        <Bar value={fill} tone={tone} />
      </div>
    </div>
  );
}

export function MemberPanel({ member }: { member: Member }) {
  const band = recoveryBand(member.recovery);
  const stages = member.sleepStages;
  const stageTotal = stages.deep + stages.rem + stages.light + stages.awake;

  return (
    <section className="panel p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="num flex size-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-sm font-semibold"
            style={{ color: "var(--recovery)" }}
          >
            {member.initials}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
            <p className="text-xs text-muted-foreground">{member.role}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {member.sources.map((s) => (
            <SourceBadge key={s} source={s} />
          ))}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <Gauge
          value={member.recovery}
          label="Recovery"
          sublabel={band.label}
          tone="recovery"
          size={156}
        />
        <div className="min-w-[180px] flex-1 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="label-tag">Day strain</span>
            <span className="num text-xl" style={{ color: "var(--strain)" }}>
              {member.strain.toFixed(1)}
              <span className="ml-1 text-[0.625rem] text-muted-foreground">/ 21</span>
            </span>
          </div>
          <Bar value={member.strain} max={21} tone="strain" />
          <div className="flex items-baseline justify-between gap-4 pt-2">
            <span className="label-tag">Sleep performance</span>
            <span className="num text-xl" style={{ color: "var(--sleep)" }}>
              {member.sleepScore}%
            </span>
          </div>
          <Bar value={member.sleepScore} tone="sleep" />
          <p className="text-xs text-muted-foreground">
            Synced {member.lastSync} · {member.sleepHours.toFixed(1)}h in bed
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          icon={HeartPulse}
          label="HRV"
          value={String(member.hrv)}
          unit="ms"
          tone="recovery"
          fill={(member.hrv / 100) * 100}
        />
        <Stat
          icon={Activity}
          label="Resting HR"
          value={String(member.rhr)}
          unit="bpm"
          tone="strain"
          fill={((80 - member.rhr) / 40) * 100}
        />
        <Stat
          icon={Footprints}
          label="Steps"
          value={member.steps.toLocaleString()}
          tone="sleep"
          fill={(member.steps / 15000) * 100}
        />
        <Stat
          icon={Moon}
          label="VO₂ max"
          value={member.vo2.toFixed(1)}
          unit="ml/kg"
          tone="recovery"
          fill={(member.vo2 / 60) * 100}
        />
        <Stat
          icon={Thermometer}
          label="Skin temp Δ"
          value={`${member.tempDeviation > 0 ? "+" : ""}${member.tempDeviation.toFixed(1)}`}
          unit="°C"
          tone="strain"
          fill={Math.min(100, Math.abs(member.tempDeviation) * 100)}
        />
        {member.glucoseAvg ? (
          <Stat
            icon={Droplets}
            label="Avg glucose"
            value={String(member.glucoseAvg)}
            unit="mg/dL"
            tone="glucose"
            fill={(member.glucoseAvg / 140) * 100}
          />
        ) : (
          <div className="flex flex-col justify-center rounded-lg border border-dashed border-border bg-surface p-3">
            <span className="label-tag flex items-center gap-1.5">
              <Droplets className="size-3.5" /> Glucose
            </span>
            <p className="mt-2 text-xs text-muted-foreground">
              Needs an Ultrahuman M1 / ring source on this account.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <span className="label-tag">7-day recovery</span>
          <TrendArea data={member.readinessTrend} tone="recovery" />
        </div>
        <div>
          <span className="label-tag">7-day HRV</span>
          <TrendArea data={member.hrvTrend} tone="sleep" />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="label-tag">Sleep architecture</span>
          <span className="num text-xs text-muted-foreground">{stageTotal.toFixed(1)}h total</span>
        </div>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full border border-border">
          {(
            [
              ["Deep", stages.deep, "var(--sleep)"],
              ["REM", stages.rem, "var(--recovery)"],
              ["Light", stages.light, "var(--surface-2)"],
              ["Awake", stages.awake, "var(--strain)"],
            ] as const
          ).map(([name, val, col]) => (
            <div
              key={name}
              title={`${name} ${val}h`}
              style={{ width: `${(val / stageTotal) * 100}%`, background: col }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {(
            [
              ["Deep", stages.deep, "var(--sleep)"],
              ["REM", stages.rem, "var(--recovery)"],
              ["Light", stages.light, "var(--grid)"],
              ["Awake", stages.awake, "var(--strain)"],
            ] as const
          ).map(([name, val, col]) => (
            <span key={name} className="num flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ background: col }} />
              {name} {val}h
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
