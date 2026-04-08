"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type AgentechGalaxyHeroProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export function AgentechGalaxyHero({
  title,
  subtitle,
  children
}: AgentechGalaxyHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;

    const ctx = canvasEl.getContext("2d", { alpha: true });
    if (!ctx) return;
    const ctxEl = ctx;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let t = 0;
    let particleCount = 0;
    let resizeTimer: number | undefined;
    const particles: Array<{
      r: number;
      arm: number;
      drift: number;
      spin: number;
      depth: number;
      spread: number;
      size: number;
      alpha: number;
      phase: number;
      color: string;
    }> = [];

    const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    function resize() {
      w = canvasEl.clientWidth;
      h = canvasEl.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);
      ctxEl.setTransform(dpr, 0, 0, dpr, 0, 0);
      particleCount = Math.min(9200, Math.max(5200, Math.floor((w * h) / 180)));
    }

    function buildParticles() {
      particles.length = 0;

      for (let i = 0; i < particleCount; i++) {
        const r = Math.pow(Math.random(), 0.58);
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const drift = rand(-0.8, 0.8);
        const spin = lerp(0.02, 0.12, Math.random());
        const depth = Math.random();
        const spread = lerp(0.04, 0.42, Math.pow(r, 0.9));
        const size = lerp(0.3, 1.5, Math.random()) * (1.3 - r * 0.62);
        const alpha = lerp(0.12, 0.88, Math.random());
        const phase = rand(Math.PI * 2, 0);

        let color = "233,239,244";
        if (r < 0.18) color = Math.random() < 0.5 ? "214,227,238" : "198,216,230";
        else if (r < 0.35) color = Math.random() < 0.6 ? "162,190,212" : "186,205,221";
        else color = Math.random() < 0.7 ? "108,182,228" : "224,232,239";

        particles.push({ r, arm, drift, spin, depth, spread, size, alpha, phase, color });
      }
    }

    function drawBg() {
      ctxEl.clearRect(0, 0, w, h);
      const g = ctxEl.createRadialGradient(w * 0.5, h * 0.54, 0, w * 0.5, h * 0.54, Math.max(w, h) * 0.72);
      g.addColorStop(0, "rgba(10,12,15,0.16)");
      g.addColorStop(0.32, "rgba(7,10,14,0.28)");
      g.addColorStop(0.72, "rgba(3,5,7,0.8)");
      g.addColorStop(1, "rgba(2,3,5,1)");
      ctxEl.fillStyle = g;
      ctxEl.fillRect(0, 0, w, h);
    }

    function drawSoftClouds(cx: number, cy: number, rx: number, ry: number) {
      ctxEl.save();
      ctxEl.translate(cx, cy);
      ctxEl.rotate(-0.12);

      const cloud1 = ctxEl.createRadialGradient(0, 0, 0, 0, 0, rx * 1.15);
      cloud1.addColorStop(0, "rgba(118,182,226,0.12)");
      cloud1.addColorStop(0.25, "rgba(92,156,206,0.08)");
      cloud1.addColorStop(0.54, "rgba(168,208,236,0.05)");
      cloud1.addColorStop(1, "rgba(0,0,0,0)");
      ctxEl.fillStyle = cloud1;
      ctxEl.beginPath();
      ctxEl.ellipse(0, 0, rx * 1.15, ry * 1.08, 0, 0, Math.PI * 2);
      ctxEl.fill();

      const cloud2 = ctxEl.createRadialGradient(0, 0, 0, 0, 0, rx * 0.44);
      cloud2.addColorStop(0, "rgba(214,236,248,0.18)");
      cloud2.addColorStop(0.45, "rgba(112,190,234,0.1)");
      cloud2.addColorStop(1, "rgba(0,0,0,0)");
      ctxEl.fillStyle = cloud2;
      ctxEl.beginPath();
      ctxEl.ellipse(0, 0, rx * 0.44, ry * 0.42, 0, 0, Math.PI * 2);
      ctxEl.fill();

      const rim = ctxEl.createRadialGradient(0, 0, rx * 0.68, 0, 0, rx * 1.18);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.72, "rgba(76,150,206,0.02)");
      rim.addColorStop(0.9, "rgba(94,186,242,0.14)");
      rim.addColorStop(1, "rgba(0,0,0,0)");
      ctxEl.fillStyle = rim;
      ctxEl.beginPath();
      ctxEl.ellipse(0, 0, rx * 1.18, ry * 1.08, 0, 0, Math.PI * 2);
      ctxEl.fill();

      ctxEl.restore();
    }

    function drawCore(cx: number, cy: number, rx: number, ry: number, tt: number) {
      const pulse = 1 + Math.sin(tt * 1.6) * 0.03;
      const outer = ctxEl.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.22);
      outer.addColorStop(0, "rgba(227,236,242,0.52)");
      outer.addColorStop(0.3, "rgba(168,194,214,0.24)");
      outer.addColorStop(0.72, "rgba(104,141,171,0.1)");
      outer.addColorStop(1, "rgba(0,0,0,0)");
      ctxEl.fillStyle = outer;
      ctxEl.beginPath();
      ctxEl.ellipse(cx, cy, rx * 0.22 * pulse, ry * 0.22 * pulse, 0, 0, Math.PI * 2);
      ctxEl.fill();
    }

    function drawGalaxy() {
      t += 0.0046;
      drawBg();

      const cx = w * 0.5;
      const cy = h * 0.36;
      const scale = Math.min(w, h);
      const rx = scale * 0.52;
      const ry = scale * 0.23;

      drawSoftClouds(cx, cy, rx, ry);

      ctxEl.save();
      ctxEl.translate(cx, cy);
      ctxEl.rotate(-0.12);
      ctxEl.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const r = p.r;
        const base = p.arm + p.drift * 0.42;
        const spiral = base + r * 7.4 + t * (0.82 + p.spin * 7.1) + p.phase * 0.02;

        let x = Math.cos(spiral) * rx * r;
        let y = Math.sin(spiral) * ry * r;

        const tangent = Math.sin(spiral * 1.38 + t * 1.74 + p.phase) * (10 + 18 * r) * p.spread;
        x += Math.cos(spiral + Math.PI / 2) * tangent;
        y += Math.sin(spiral + Math.PI / 2) * tangent * 0.5;

        const flatten = 1 - Math.pow(r, 1.4) * 0.18;
        y *= flatten;

        const drift = Math.sin(t * 1.16 + p.phase + r * 10) * (0.45 + p.depth * 1.05);
        y += drift;

        const glow = 0.72 + 0.28 * Math.sin(t * 3 + p.phase * 2);
        const alpha = Math.min(1, p.alpha * (0.2 + (1 - r) * 0.92) * glow);
        const size = p.size * (0.9 + (1 - r) * 1.05);

        ctxEl.fillStyle = `rgba(${p.color},${alpha})`;
        ctxEl.beginPath();
        ctxEl.arc(x, y, size, 0, Math.PI * 2);
        ctxEl.fill();
      }

      ctxEl.restore();
      drawCore(cx, cy, rx, ry, t);
      raf = window.requestAnimationFrame(drawGalaxy);
    }

    resize();
    buildParticles();
    drawGalaxy();

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        buildParticles();
      }, 80);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <section className="relative min-h-[88svh] w-full overflow-hidden border-b border-[#363d45]/70 bg-black text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(188,206,222,0.03),transparent_16%),radial-gradient(circle_at_center,rgba(108,147,176,0.05),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-7xl justify-center px-6 pb-16 pt-[54svh] text-center md:px-10 md:pt-[56svh] lg:px-8 lg:pb-20 lg:pt-[58svh]">
        <div className="max-w-6xl animate-rise">
          <h1 className="hero-wordmark text-[3.8rem] tracking-[0.1em] md:text-[6rem] lg:text-[8.4rem]">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/62 md:text-base">{subtitle}</p>
          {children ? <div className="mt-10 flex flex-wrap items-center justify-center gap-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
