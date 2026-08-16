/** Turns rows saved from Ultrahuman / WHOOP into the Member shape the UI renders. */
import type { Member, Point, Source } from "./health-data";
import type { TeamData } from "./health.queries.server";

type Row = TeamData["metrics"][number];

function merged(rows: Row[]): Row | undefined {
  if (rows.length === 0) return undefined;
  // WHOOP wins for recovery/strain/sleep, Ultrahuman fills glucose/steps/temp.
  const pick = <K extends keyof Row>(key: K): Row[K] => {
    const whoop = rows.find((r) => r.source === "whoop" && r[key] != null);
    if (whoop) return whoop[key];
    const uh = rows.find((r) => r[key] != null);
    return (uh ? uh[key] : null) as Row[K];
  };
  return {
    ...rows[0]!,
    recovery: pick("recovery"),
    strain: pick("strain"),
    sleep_score: pick("sleep_score"),
    sleep_hours: pick("sleep_hours"),
    hrv: pick("hrv"),
    rhr: pick("rhr"),
    steps: pick("steps"),
    temp_deviation: pick("temp_deviation"),
    glucose_avg: pick("glucose_avg"),
  };
}

function label(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function trend(byDate: Map<string, Row[]>, key: keyof Row): Point[] {
  return [...byDate.entries()]
    .map(([date, rows]) => ({ t: label(date), v: Number(merged(rows)?.[key] ?? 0) }))
    .filter((p) => p.v > 0)
    .slice(-7);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function toMembers(data: TeamData): Member[] {
  return data.profiles
    .map((profile) => {
      const rows = data.metrics.filter((m) => m.user_id === profile.id);
      if (rows.length === 0) return null;

      const byDate = new Map<string, Row[]>();
      for (const row of rows) {
        byDate.set(row.metric_date, [...(byDate.get(row.metric_date) ?? []), row]);
      }
      const dates = [...byDate.keys()].sort();
      const latest = merged(byDate.get(dates[dates.length - 1]!) ?? []);
      if (!latest) return null;

      const sources = [...new Set(rows.map((r) => r.source))] as Source[];
      const stages = latest.sleep_hours ?? 0;

      const member: Member = {
        id: profile.id,
        name: profile.display_name,
        role: profile.role_title,
        initials: initials(profile.display_name),
        sources,
        recovery: Math.round(latest.recovery ?? 0),
        strain: +(latest.strain ?? 0).toFixed(1),
        sleepScore: Math.round(latest.sleep_score ?? 0),
        sleepHours: +(latest.sleep_hours ?? 0).toFixed(1),
        hrv: Math.round(latest.hrv ?? 0),
        rhr: Math.round(latest.rhr ?? 0),
        steps: Math.round(latest.steps ?? 0),
        vo2: 0,
        tempDeviation: +(latest.temp_deviation ?? 0).toFixed(1),
        glucoseAvg: latest.glucose_avg != null ? Math.round(latest.glucose_avg) : null,
        glucoseVariability: null,
        readinessTrend: trend(byDate, "recovery"),
        strainTrend: trend(byDate, "strain"),
        hrvTrend: trend(byDate, "hrv"),
        sleepStages: {
          deep: +(stages * 0.2).toFixed(1),
          rem: +(stages * 0.24).toFixed(1),
          light: +(stages * 0.51).toFixed(1),
          awake: +(stages * 0.05).toFixed(1),
        },
        lastSync: dates[dates.length - 1]!,
      };
      return member;
    })
    .filter((m): m is Member => m !== null);
}

export function averages(members: Member[]) {
  const avg = (fn: (m: Member) => number) =>
    members.length ? members.reduce((a, m) => a + fn(m), 0) / members.length : 0;
  return {
    recovery: Math.round(avg((m) => m.recovery)),
    strain: +avg((m) => m.strain).toFixed(1),
    sleep: +avg((m) => m.sleepHours).toFixed(1),
    hrv: Math.round(avg((m) => m.hrv)),
  };
}
