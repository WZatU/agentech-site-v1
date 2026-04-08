type CompactMetric = {
  label: string;
  value: string;
  delta: string;
};

type ExploreShowcaseProps = {
  metrics: CompactMetric[];
};

const tokenValue = "1,284,293,655";
const revenueValue = "$3,483,020";

const tokenPath =
  "M 24 206 C 72 198, 108 188, 146 176 C 178 166, 212 150, 244 140 C 280 130, 314 110, 346 94 C 380 78, 416 54, 452 34";
const revenuePath =
  "M 24 208 C 66 202, 102 188, 138 168 C 174 150, 210 136, 246 126 C 280 116, 316 96, 352 74 C 390 52, 424 36, 456 22";

function ModuleChart({
  path,
  tone
}: {
  path: string;
  tone: "token" | "revenue";
}) {
  const lineId = `${tone}-chart-line`;
  const fillId = `${tone}-chart-fill`;

  return (
    <div className="relative h-[240px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(147,183,211,0.14),transparent_26%)]" />
      <div className="explore-noise absolute inset-0 opacity-20" />

      <svg viewBox="0 0 480 240" className="relative h-full w-full">
        <defs>
          <linearGradient id={lineId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(138,168,194,0.24)" />
            <stop offset="46%" stopColor="rgba(206,226,241,0.92)" />
            <stop offset="100%" stopColor="rgba(144,178,205,0.74)" />
          </linearGradient>
          <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(164,198,226,0.18)" />
            <stop offset="100%" stopColor="rgba(164,198,226,0)" />
          </linearGradient>
        </defs>

        {[40, 84, 128, 172, 216].map((line) => (
          <line
            key={line}
            x1="0"
            y1={line}
            x2="480"
            y2={line}
            stroke="rgba(255,255,255,0.045)"
            strokeWidth="1"
          />
        ))}

        <path d={`${path} L 456 240 L 24 240 Z`} fill={`url(#${fillId})`} opacity="0.8" />
        <path
          d={path}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeLinecap="round"
          strokeWidth="2.4"
        />

        {[
          { x: 138, y: 168 },
          { x: 246, y: tone === "token" ? 140 : 126 },
          { x: 352, y: tone === "token" ? 94 : 74 },
          { x: 456, y: tone === "token" ? 34 : 22 }
        ].map((point, index) => (
          <g key={`${tone}-${point.x}-${point.y}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={index === 3 ? 4.5 : 2.5}
              fill={index === 3 ? "rgba(234,243,250,0.96)" : "rgba(189,213,231,0.72)"}
            />
            {index === 3 ? (
              <circle
                cx={point.x}
                cy={point.y}
                r="11"
                fill="rgba(205,227,243,0.12)"
              />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function FeatureModule({
  label,
  tag,
  value,
  unit,
  description,
  path,
  tone
}: {
  label: string;
  tag: string;
  value: string;
  unit: string;
  description: string;
  path: string;
  tone: "token" | "revenue";
}) {
  return (
    <article className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.035] p-8 shadow-panel backdrop-blur-md md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(147,183,211,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_42%)]" />
      <div className="explore-scanlines absolute inset-0 opacity-25" />
      <div className="explore-noise absolute inset-0 opacity-20" />

      <div className="relative grid gap-8 xl:grid-cols-[0.92fr,1.08fr] xl:items-end">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate">{label}</p>
            <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-[#9ec0dd]">
              {tag}
            </span>
          </div>

          <div className="mt-10">
            <p className="text-[clamp(3.1rem,7vw,6.4rem)] font-semibold leading-none tracking-[-0.06em] text-white tabular-nums">
              {value}
            </p>
            <p className="mt-5 text-sm uppercase tracking-[0.24em] text-white/60">{unit}</p>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate">{description}</p>
          </div>
        </div>

        <ModuleChart path={path} tone={tone} />
      </div>
    </article>
  );
}

export function ExploreShowcase({ metrics }: ExploreShowcaseProps) {
  return (
    <section className="border-b border-[#363d45]/70 bg-[linear-gradient(180deg,#010204_0%,#020408_55%,#010204_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="space-y-6">
          <FeatureModule
            label="Total Token Usage"
            tag="+2.3M today"
            value={tokenValue}
            unit="tokens processed"
            description="Across all active agents and workflows."
            path={tokenPath}
            tone="token"
          />

          <FeatureModule
            label="Revenue Generated"
            tag="+18.4% this month"
            value={revenueValue}
            unit="deployed systems"
            description="Across deployed agent systems."
            path={revenuePath}
            tone="revenue"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[26px] border border-white/10 bg-white/[0.025] px-6 py-5 backdrop-blur-sm"
            >
              <p className="text-sm text-slate">{metric.label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">{metric.value}</p>
              <p className="mt-3 text-sm text-[#8fb4d3]">{metric.delta}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
