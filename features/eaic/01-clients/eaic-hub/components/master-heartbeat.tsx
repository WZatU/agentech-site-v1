"use client";

import { useEffect, useState } from "react";
import { toMasterHeartbeatView, type MasterHeartbeatResponse } from "@/lib/master-heartbeat";

export function MasterHeartbeat() {
  const [status, setStatus] = useState<MasterHeartbeatResponse | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/master-heartbeat", { cache: "no-store" });
        if (!response.ok) throw new Error("heartbeat unavailable");
        const next = await response.json() as MasterHeartbeatResponse;
        if (active) {
          setStatus(next);
          setFetchFailed(false);
        }
      } catch {
        if (active) setFetchFailed(true);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const fallback: MasterHeartbeatResponse = {
    schemaVersion: 1, gatewayId: "agentech01", condition: "unavailable",
    fresh: false, ageMs: null, observedAt: null, receivedAt: null,
    master: null, battery: null,
  };
  const view = toMasterHeartbeatView(status || fallback);
  const online = view.tone === "online" && !fetchFailed;
  const warning = view.tone === "stale" || view.tone === "controller-offline" || fetchFailed;
  const fields = [
    ["Gateway", fetchFailed ? `${view.gateway} · refresh failed` : view.gateway],
    ["Master controller", view.controller],
    ["Battery", view.battery],
    ["Mode", view.mode],
    ["Last update", view.lastUpdate],
  ];

  return (
    <section
      data-master-heartbeat="true"
      className={`mt-4 border p-3 ${online ? "border-[#83cdbf] bg-[#e8f7f3]" : warning ? "border-[#f2c56b] bg-[#fff8df]" : "border-[#b8c7d9] bg-[#f5f8fc]"}`}
      role="status"
      aria-live="polite"
      aria-label="Master live heartbeat"
    >
      <div data-master-heartbeat-title="true" className="mb-2 flex items-center gap-2 text-sm font-bold text-[#173b62]">
        <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-[#00a58f]" : warning ? "bg-[#d99a00]" : "bg-[#75879a]"}`} aria-hidden="true" />
        Live heartbeat
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-5">
        {fields.map(([label, value]) => (
          <div data-master-heartbeat-field="true" key={label} className="border border-black/10 bg-white/70 px-2 py-1.5" title={label === "Last update" ? status?.receivedAt || undefined : undefined}>
            <dt data-master-heartbeat-label="true" className="font-semibold text-[#52677d]">{label}</dt>
            <dd data-master-heartbeat-value="true" className="mt-0.5 text-[#173b62]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
