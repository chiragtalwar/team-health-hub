/**
 * Finzarc Health — data model shared by the dashboard.
 *
 * Values below are a deterministic demo snapshot shaped exactly like the
 * Ultrahuman Partner API (`/api/v1/metrics`) and WHOOP v1 payloads, so the
 * dashboard can be pointed at live data without changing any UI code.
 */

export type Source = "ultrahuman" | "whoop";

export type Point = { t: string; v: number };

export type Member = {
  id: string;
  name: string;
  role: string;
  initials: string;
  sources: Source[];
  recovery: number;
  strain: number;
  sleepScore: number;
  sleepHours: number;
  hrv: number;
  rhr: number;
  steps: number;
  vo2: number;
  tempDeviation: number;
  glucoseAvg: number | null;
  glucoseVariability: number | null;
  readinessTrend: Point[];
  strainTrend: Point[];
  hrvTrend: Point[];
  sleepStages: { deep: number; rem: number; light: number; awake: number };
  lastSync: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const series = (values: number[]): Point[] =>
  values.map((v, i) => ({ t: DAYS[i] ?? `D${i + 1}`, v }));

export const members: Member[] = [
  {
    id: "arjun",
    name: "Arjun Mehta",
    role: "Founder · Finzarc",
    initials: "AM",
    sources: ["ultrahuman", "whoop"],
    recovery: 78,
    strain: 14.2,
    sleepScore: 84,
    sleepHours: 7.4,
    hrv: 68,
    rhr: 52,
    steps: 11240,
    vo2: 48.6,
    tempDeviation: -0.2,
    glucoseAvg: 94,
    glucoseVariability: 11,
    readinessTrend: series([64, 71, 58, 76, 82, 74, 78]),
    strainTrend: series([9.4, 12.1, 17.8, 11.2, 8.6, 15.4, 14.2]),
    hrvTrend: series([54, 61, 49, 63, 71, 66, 68]),
    sleepStages: { deep: 1.5, rem: 1.8, light: 3.8, awake: 0.3 },
    lastSync: "4 min ago",
  },
  {
    id: "neha",
    name: "Neha Kapoor",
    role: "Ops Lead · Finzarc",
    initials: "NK",
    sources: ["whoop"],
    recovery: 55,
    strain: 18.6,
    sleepScore: 67,
    sleepHours: 6.1,
    hrv: 47,
    rhr: 61,
    steps: 8460,
    vo2: 42.1,
    tempDeviation: 0.4,
    glucoseAvg: null,
    glucoseVariability: null,
    readinessTrend: series([72, 68, 61, 54, 49, 52, 55]),
    strainTrend: series([11.2, 13.9, 15.1, 19.4, 20.1, 17.2, 18.6]),
    hrvTrend: series([58, 55, 51, 46, 43, 45, 47]),
    sleepStages: { deep: 0.9, rem: 1.2, light: 3.6, awake: 0.4 },
    lastSync: "12 min ago",
  },
];

export const teamStrainLoad = series([10.3, 13.0, 16.5, 15.3, 14.4, 16.3, 16.4]);
export const teamRecoveryLoad = series([68, 70, 60, 65, 66, 63, 67]);

export const zones = [
  { label: "Light", pct: 34 },
  { label: "Moderate", pct: 28 },
  { label: "Vigorous", pct: 24 },
  { label: "Max", pct: 14 },
];

export function recoveryBand(v: number): { label: string; tone: "high" | "mid" | "low" } {
  if (v >= 67) return { label: "Primed", tone: "high" };
  if (v >= 34) return { label: "Adequate", tone: "mid" };
  return { label: "Strained", tone: "low" };
}

export const teamAverages = {
  recovery: Math.round(members.reduce((a, m) => a + m.recovery, 0) / members.length),
  strain: +(members.reduce((a, m) => a + m.strain, 0) / members.length).toFixed(1),
  sleep: +(members.reduce((a, m) => a + m.sleepHours, 0) / members.length).toFixed(1),
  hrv: Math.round(members.reduce((a, m) => a + m.hrv, 0) / members.length),
};
