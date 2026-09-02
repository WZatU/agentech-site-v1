import { notFound, redirect } from "next/navigation";
import { HistoryBackButton } from "@/components/history-back-button";
import { isAgentechPrimaryOwnerEmail } from "@/lib/company-accounts";
import {
  OFFICIAL_X2_LIMIT_GROUPS,
  RUNTIME_X2_LIMIT_GROUPS,
  X2_JOINT_DIAGRAM_URL,
  X2_LIMITS_SOURCE_URL
} from "@/lib/master-robot-joint-reference";
import { isValidEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master Robot Engineering Reference | Agentech",
  description: "Private Agentech owner reference for the Master / AgiBot X2 integration.",
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

async function isMasterRobotOwner(email: string) {
  if (!isAgentechPrimaryOwnerEmail(email)) {
    return false;
  }

  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

function degreesFromRadians(radians: number) {
  return (radians * (180 / Math.PI)).toFixed(1);
}

export default async function MasterRobotReferencePage() {
  const email = await getServerAccountEmail();

  if (!isValidEmail(email)) {
    redirect("/login?next=/admin/master-robot");
  }

  if (!(await isMasterRobotOwner(email))) {
    notFound();
  }

  return (
    <main className="account-white-page min-h-screen bg-[#f2f5f9] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[22px] border border-slate-800 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
          <div className="h-2 bg-red-600" />
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1fr_auto] lg:items-end lg:px-9 lg:py-9">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                  Owner Engineering Reference
                </span>
                <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-bold text-slate-200">31 DOF</span>
                <span className="rounded-full border border-red-500/60 bg-red-950/40 px-3 py-1 text-xs font-bold text-red-100">Internal only</span>
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">Master / X2 Joint Safety Map</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-300">
                Private working reference for connecting Master to EAIC Hub. This page records the official manufacturer envelope beside the AimDK sample runtime mapping; it does not authorize live motion.
              </p>
            </div>
            <div className="space-y-3 lg:text-right">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Signed-in owner</p>
              <p className="font-bold text-white">{email}</p>
              <HistoryBackButton
                fallbackHref="/admin/ai-gateway"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
              />
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Manufacturer diagram</p>
                <h2 className="mt-2 text-2xl font-black">Joint naming and physical location</h2>
              </div>
              <a
                href={X2_LIMITS_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
              >
                Open official source
              </a>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={X2_JOINT_DIAGRAM_URL}
                alt="Official AgiBot X2 joint naming and limit diagram"
                className="mx-auto h-auto w-full max-w-4xl"
              />
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 shadow-[0_16px_45px_rgba(185,28,28,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Safety gate</p>
              <h2 className="mt-2 text-2xl font-black text-red-950">Reference only. No live actuation.</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-red-900">
                Do not send raw joint targets from EAIC Hub until Faraday Future or AgiBot confirms the supported seated upper-body control path, controller ownership, stop behavior, and mirrored-axis conventions.
              </p>
            </div>
            <div className="rounded-[20px] border border-amber-300 bg-amber-50 p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">Reconciliation required</p>
              <ul className="mt-3 space-y-3 text-sm font-semibold leading-6 text-amber-950">
                <li>Public limits describe a guaranteed physical envelope; runtime signs differ by side.</li>
                <li>Public head pitch is 0°, while the sample controller defines a nonzero range.</li>
                <li>Shoulder pitch direction and some mirrored roll/yaw ranges do not line up one-to-one.</li>
                <li>Never let the native motion controller and a second controller command the same joint simultaneously.</li>
              </ul>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Visibility</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                Server-gated to the exact account <span className="text-red-700">info@agent-tech.ai</span> and an active admin record. Other admins and customer accounts receive a not-found response.
              </p>
            </div>
          </aside>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Official manufacturer reference</p>
            <h2 className="mt-2 text-3xl font-black">Guaranteed joint position envelope</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">Degrees, transcribed from AimDK X2 1.0.0 documentation.</p>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-2 sm:p-7">
            {OFFICIAL_X2_LIMIT_GROUPS.map((group) => (
              <article key={group.label} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="bg-slate-950 px-4 py-3 text-white">
                  <h3 className="font-black">{group.label}</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{group.note}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[430px] text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.1em] text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-black">Joint</th>
                        <th className="px-4 py-3 text-right font-black">Minimum</th>
                        <th className="px-4 py-3 text-right font-black">Maximum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.joints.map((joint) => (
                        <tr key={joint.joint}>
                          <td className="px-4 py-3 font-bold text-slate-900">{joint.joint}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">{joint.minimumDegrees}°</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">{joint.maximumDegrees}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-800 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-800 px-5 py-5 sm:px-7">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-400">Internal AimDK sample mapping</p>
            <h2 className="mt-2 text-3xl font-black">Runtime joint names, ranges, and gains</h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
              Extracted from the local AimDK <span className="font-mono text-white">motocontrol.py</span> example. These values document the sample, not a production-safe command contract.
            </p>
          </div>
          <div className="grid gap-5 p-5 xl:grid-cols-2 sm:p-7">
            {RUNTIME_X2_LIMIT_GROUPS.map((group) => (
              <article key={group.label} className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                <h3 className="border-b border-slate-700 px-4 py-3 text-lg font-black">{group.label}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[690px] text-left text-xs">
                    <thead className="bg-slate-800 uppercase tracking-[0.08em] text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-black">Runtime joint</th>
                        <th className="px-3 py-3 text-right font-black">Min rad</th>
                        <th className="px-3 py-3 text-right font-black">Max rad</th>
                        <th className="px-3 py-3 text-right font-black">Min deg</th>
                        <th className="px-3 py-3 text-right font-black">Max deg</th>
                        <th className="px-3 py-3 text-right font-black">Kp</th>
                        <th className="px-3 py-3 text-right font-black">Kd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {group.joints.map((joint) => (
                        <tr key={joint.joint} className="text-slate-200">
                          <td className="px-4 py-3 font-mono font-bold text-white">{joint.joint}</td>
                          <td className="px-3 py-3 text-right font-mono">{joint.minimumRadians}</td>
                          <td className="px-3 py-3 text-right font-mono">{joint.maximumRadians}</td>
                          <td className="px-3 py-3 text-right font-mono">{degreesFromRadians(joint.minimumRadians)}°</td>
                          <td className="px-3 py-3 text-right font-mono">{degreesFromRadians(joint.maximumRadians)}°</td>
                          <td className="px-3 py-3 text-right font-mono">{joint.kp}</td>
                          <td className="px-3 py-3 text-right font-mono">{joint.kd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
