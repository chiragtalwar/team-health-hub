type GaugeProps = {
  value: number;
  max?: number;
  size?: number;
  label: string;
  sublabel?: string;
  tone?: "recovery" | "strain" | "sleep" | "glucose";
  format?: (v: number) => string;
};

const toneVar: Record<string, string> = {
  recovery: "var(--recovery)",
  strain: "var(--strain)",
  sleep: "var(--sleep)",
  glucose: "var(--glucose)",
};

export function Gauge({
  value,
  max = 100,
  size = 168,
  label,
  sublabel,
  tone = "recovery",
  format,
}: GaugeProps) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = toneVar[tone] ?? toneVar["recovery"];

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)",
            filter: `drop-shadow(0 0 10px color-mix(in oklab, ${color} 55%, transparent))`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-4xl font-semibold" style={{ color }}>
          {format ? format(value) : Math.round(value)}
        </span>
        <span className="label-tag mt-1">{label}</span>
        {sublabel ? (
          <span className="mt-0.5 text-xs text-muted-foreground">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  tone = "recovery",
}: {
  value: number;
  max?: number;
  tone?: "recovery" | "strain" | "sleep" | "glucose";
}) {
  const color = toneVar[tone] ?? toneVar["recovery"];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, (value / max) * 100)}%`,
          background: color,
          transition: "width 800ms cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}
