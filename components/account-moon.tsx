"use client";

import { useEffect, useState } from "react";

const synodicMonthDays = 29.530588853;
const knownNewMoonUtc = Date.UTC(2000, 0, 6, 18, 14);

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getMoonPhase(date = new Date()) {
  const daysSinceKnownNewMoon = (date.getTime() - knownNewMoonUtc) / 86_400_000;
  const age = positiveModulo(daysSinceKnownNewMoon, synodicMonthDays);
  const cycle = age / synodicMonthDays;
  const illumination = (1 - Math.cos(2 * Math.PI * cycle)) / 2;
  const waxing = cycle < 0.5;
  const phaseName =
    age < 1.84566 || age >= 27.68493
      ? "New Moon"
      : age < 5.53699
        ? "Waxing Crescent"
        : age < 9.22831
          ? "First Quarter"
          : age < 12.91963
            ? "Waxing Gibbous"
            : age < 16.61096
              ? "Full Moon"
              : age < 20.30228
                ? "Waning Gibbous"
                : age < 23.99361
                  ? "Last Quarter"
                  : "Waning Crescent";

  return {
    age,
    cycle,
    illumination,
    phaseName,
    waxing
  };
}

export function AccountMoon() {
  const [phase, setPhase] = useState<ReturnType<typeof getMoonPhase> | null>(null);

  useEffect(() => {
    setPhase(getMoonPhase());
    const interval = window.setInterval(() => setPhase(getMoonPhase()), 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!phase) {
    return null;
  }

  const shadowPercent = Math.max(0, Math.min(100, (1 - phase.illumination) * 100));
  const shadowStyle = phase.waxing ? { left: 0, width: `${shadowPercent}%` } : { right: 0, width: `${shadowPercent}%` };
  const label = `${phase.phaseName}, ${Math.round(phase.illumination * 100)}% illuminated`;

  return (
    <div
      className="account-moon pointer-events-none fixed z-[1]"
      aria-label={label}
      title={label}
      data-moon-phase={phase.phaseName}
      data-moon-illumination={Math.round(phase.illumination * 100)}
    >
      <div className="account-moon-glow" />
      <div className="account-moon-disk">
        <div className="account-moon-shadow" style={shadowStyle} />
        <span className="account-moon-crater account-moon-crater-a" />
        <span className="account-moon-crater account-moon-crater-b" />
        <span className="account-moon-crater account-moon-crater-c" />
        <span className="account-moon-crater account-moon-crater-d" />
      </div>
    </div>
  );
}
