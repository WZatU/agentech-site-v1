"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type AgentechGalaxyHeroProps = {
  title: string;
  titleImage?: string;
  subtitle?: string;
  children?: ReactNode;
  bottomContent?: ReactNode;
  lockedViewport?: boolean;
};

export function AgentechGalaxyHero({
  title,
  titleImage,
  subtitle,
  children,
  bottomContent,
  lockedViewport = false
}: AgentechGalaxyHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;

    const ctx = canvasEl.getContext("2d", { alpha: true });
    if (!ctx) return;
    const ctxEl = ctx;
    const staticCanvas = document.createElement("canvas");
    const staticCtx = staticCanvas.getContext("2d", { alpha: true });
    if (!staticCtx) return;
    const staticCtxEl = staticCtx;

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
      dpr = w >= 768 ? Math.min(window.devicePixelRatio || 1, 1.35) : Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);
      staticCanvas.width = canvasEl.width;
      staticCanvas.height = canvasEl.height;
      ctxEl.setTransform(dpr, 0, 0, dpr, 0, 0);
      staticCtxEl.setTransform(dpr, 0, 0, dpr, 0, 0);
      particleCount =
        w >= 768
          ? Math.min(12000, Math.max(7200, Math.floor((w * h) / 135)))
          : Math.min(9200, Math.max(5200, Math.floor((w * h) / 180)));
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

    function getGalaxyMetrics() {
      const cx = w * 0.5;
      const isDesktop = w >= 768;
      const cy = h * (w < 640 ? 0.31 : isDesktop ? 0.24 : 0.34);
      const scale = Math.min(w, h);
      const rx = isDesktop ? Math.max(w * 0.88, scale * 1.35) : scale * 0.52;
      const ry = isDesktop ? Math.max(h * 0.29, scale * 0.3) : scale * 0.23;

      return { cx, cy, isDesktop, rx, ry };
    }

    function drawBg(targetCtx: CanvasRenderingContext2D) {
      targetCtx.clearRect(0, 0, w, h);
      const g = targetCtx.createRadialGradient(w * 0.5, h * 0.54, 0, w * 0.5, h * 0.54, Math.max(w, h) * 0.72);
      g.addColorStop(0, "rgba(10,12,15,0.16)");
      g.addColorStop(0.32, "rgba(7,10,14,0.28)");
      g.addColorStop(0.72, "rgba(3,5,7,0.8)");
      g.addColorStop(1, "rgba(2,3,5,1)");
      targetCtx.fillStyle = g;
      targetCtx.fillRect(0, 0, w, h);
    }

    function fillEllipticGlow(
      targetCtx: CanvasRenderingContext2D,
      {
        blur = 0,
        cx,
        cy,
        innerRadius = 0,
        radiusX,
        radiusY,
        rotation = 0,
        stops
      }: {
        blur?: number;
        cx: number;
        cy: number;
        innerRadius?: number;
        radiusX: number;
        radiusY: number;
        rotation?: number;
        stops: Array<[number, string]>;
      }
    ) {
      targetCtx.save();
      targetCtx.translate(cx, cy);
      targetCtx.rotate(rotation);
      if (blur > 0) targetCtx.filter = `blur(${blur}px)`;
      targetCtx.scale(1, radiusY / radiusX);

      const gradient = targetCtx.createRadialGradient(0, 0, innerRadius, 0, 0, radiusX);
      for (const [stop, color] of stops) {
        gradient.addColorStop(stop, color);
      }
      targetCtx.fillStyle = gradient;
      targetCtx.beginPath();
      targetCtx.arc(0, 0, radiusX, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    }

    function drawSoftClouds(targetCtx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, isDesktop: boolean) {
      if (!isDesktop) {
        targetCtx.save();
        targetCtx.translate(cx, cy);
        targetCtx.rotate(-0.12);

        const cloud1 = targetCtx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.15);
        cloud1.addColorStop(0, "rgba(118,182,226,0.12)");
        cloud1.addColorStop(0.25, "rgba(92,156,206,0.08)");
        cloud1.addColorStop(0.54, "rgba(168,208,236,0.05)");
        cloud1.addColorStop(1, "rgba(0,0,0,0)");
        targetCtx.fillStyle = cloud1;
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, rx * 1.15, ry * 1.08, 0, 0, Math.PI * 2);
        targetCtx.fill();

        const cloud2 = targetCtx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.44);
        cloud2.addColorStop(0, "rgba(214,236,248,0.18)");
        cloud2.addColorStop(0.45, "rgba(112,190,234,0.1)");
        cloud2.addColorStop(1, "rgba(0,0,0,0)");
        targetCtx.fillStyle = cloud2;
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, rx * 0.44, ry * 0.42, 0, 0, Math.PI * 2);
        targetCtx.fill();

        const rimGradient = targetCtx.createRadialGradient(0, 0, rx * 0.68, 0, 0, rx * 1.18);
        rimGradient.addColorStop(0, "rgba(0,0,0,0)");
        rimGradient.addColorStop(0.72, "rgba(76,150,206,0.02)");
        rimGradient.addColorStop(0.9, "rgba(94,186,242,0.14)");
        rimGradient.addColorStop(1, "rgba(0,0,0,0)");
        targetCtx.fillStyle = rimGradient;
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, rx * 1.18, ry * 1.08, 0, 0, Math.PI * 2);
        targetCtx.fill();

        targetCtx.restore();
        return;
      }

      const broad = 0.22;
      const rim = 0.26;
      const core = 0.92;

      fillEllipticGlow(targetCtx, {
        blur: 12,
        cx,
        cy,
        radiusX: rx * 1.2,
        radiusY: ry * 1.08,
        rotation: -0.12,
        stops: [
          [0, `rgba(118,182,226,${0.12 * broad})`],
          [0.25, `rgba(92,156,206,${0.08 * broad})`],
          [0.58, `rgba(168,208,236,${0.04 * broad})`],
          [0.84, `rgba(168,208,236,${0.006 * broad})`],
          [1, "rgba(0,0,0,0)"]
        ]
      });

      fillEllipticGlow(targetCtx, {
        blur: 4,
        cx,
        cy,
        radiusX: rx * 0.46,
        radiusY: ry * 0.42,
        rotation: -0.12,
        stops: [
          [0, `rgba(214,236,248,${0.2 * core})`],
          [0.42, `rgba(112,190,234,${0.11 * core})`],
          [0.82, `rgba(112,190,234,${0.02 * core})`],
          [1, "rgba(0,0,0,0)"]
        ]
      });

      fillEllipticGlow(targetCtx, {
        blur: 10,
        cx,
        cy,
        innerRadius: rx * 0.6,
        radiusX: rx * 1.25,
        radiusY: ry * 1.12,
        rotation: -0.12,
        stops: [
          [0, "rgba(0,0,0,0)"],
          [0.68, `rgba(76,150,206,${0.018 * rim})`],
          [0.88, `rgba(94,186,242,${0.11 * rim})`],
          [1, "rgba(0,0,0,0)"]
        ]
      });
    }

    function drawCore(cx: number, cy: number, rx: number, ry: number, tt: number, isDesktop: boolean) {
      const pulse = 1 + Math.sin(tt * 1.6) * 0.03;
      if (!isDesktop) {
        const outer = ctxEl.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.22);
        outer.addColorStop(0, "rgba(227,236,242,0.52)");
        outer.addColorStop(0.3, "rgba(168,194,214,0.24)");
        outer.addColorStop(0.72, "rgba(104,141,171,0.1)");
        outer.addColorStop(1, "rgba(0,0,0,0)");
        ctxEl.fillStyle = outer;
        ctxEl.beginPath();
        ctxEl.ellipse(cx, cy, rx * 0.22 * pulse, ry * 0.22 * pulse, 0, 0, Math.PI * 2);
        ctxEl.fill();
        return;
      }

      const boost = 1.16;
      fillEllipticGlow(ctxEl, {
        blur: 0,
        cx,
        cy,
        radiusX: rx * 0.24 * pulse,
        radiusY: ry * 0.23 * pulse,
        stops: [
          [0, `rgba(227,236,242,${0.56 * boost})`],
          [0.3, `rgba(168,194,214,${0.25 * boost})`],
          [0.74, `rgba(104,141,171,${0.1 * boost})`],
          [1, "rgba(0,0,0,0)"]
        ]
      });
    }

    function renderStaticLayer() {
      const { cx, cy, isDesktop, rx, ry } = getGalaxyMetrics();
      drawBg(staticCtxEl);
      drawSoftClouds(staticCtxEl, cx, cy, rx, ry, isDesktop);
    }

    function drawGalaxy() {
      t += 0.0046;
      ctxEl.clearRect(0, 0, w, h);
      ctxEl.globalCompositeOperation = "source-over";
      ctxEl.filter = "none";
      ctxEl.drawImage(staticCanvas, 0, 0, w, h);

      const { cx, cy, isDesktop, rx, ry } = getGalaxyMetrics();

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
        const centerBoost = isDesktop && r < 0.38 ? 1.22 : 1;
        const alphaBase = isDesktop ? 0.26 + (1 - r) * 1.08 : 0.2 + (1 - r) * 0.92;
        const alpha = Math.min(1, p.alpha * alphaBase * glow * centerBoost);
        const size = p.size * (isDesktop ? 1 + (1 - r) * 1.15 : 0.9 + (1 - r) * 1.05);

        ctxEl.fillStyle = `rgba(${p.color},${alpha})`;
        ctxEl.beginPath();
        ctxEl.arc(x, y, size, 0, Math.PI * 2);
        ctxEl.fill();
      }

      ctxEl.restore();
      drawCore(cx, cy, rx, ry, t, isDesktop);
      raf = window.requestAnimationFrame(drawGalaxy);
    }

    resize();
    buildParticles();
    renderStaticLayer();
    drawGalaxy();

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        buildParticles();
        renderStaticLayer();
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
    <section
      className={
        lockedViewport
          ? "relative h-[calc(100svh-72px)] w-full overflow-hidden bg-black text-white"
          : "relative min-h-[calc(100svh-72px-88px)] w-full overflow-hidden border-b border-[#363d45]/70 bg-black text-white md:min-h-[88svh]"
      }
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(188,206,222,0.03),transparent_16%),radial-gradient(circle_at_center,rgba(108,147,176,0.05),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div
        className={
          lockedViewport
            ? "relative z-10 mx-auto flex h-full max-w-7xl justify-center px-5 pb-28 pt-[48svh] text-center sm:px-6 sm:pb-32 sm:pt-[50svh] md:px-10 md:pb-32 md:pt-[52svh] lg:px-8 lg:pt-[54svh]"
            : "relative z-10 mx-auto flex min-h-[calc(100svh-72px-88px)] max-w-7xl justify-center px-5 pb-10 pt-[43svh] text-center sm:px-6 md:min-h-[88svh] md:px-10 md:pb-16 md:pt-[56svh] lg:px-8 lg:pb-20 lg:pt-[58svh]"
        }
      >
        <div className="galaxy-rise max-w-6xl">
          {titleImage ? (
            <Image
              src={titleImage}
              alt={title}
              width={1000}
              height={101}
              className={
                lockedViewport
                  ? "mx-auto h-auto w-full max-w-[82vw] drop-shadow-[0_28px_78px_rgba(104,190,234,0.28)] sm:max-w-3xl lg:max-w-5xl"
                  : "mx-auto h-auto w-full max-w-5xl drop-shadow-[0_28px_78px_rgba(104,190,234,0.28)]"
              }
              priority
            />
          ) : (
            <h1 className="hero-wordmark text-[3.8rem] tracking-[0.1em] md:text-[6rem] lg:text-[8.4rem]">
              {title}
            </h1>
          )}
          {subtitle ? <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/62 md:text-base">{subtitle}</p> : null}
          {children ? <div className="mt-10 flex flex-wrap items-center justify-center gap-4">{children}</div> : null}
        </div>
      </div>

      {bottomContent ? (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[#363d45]/70 bg-black/70 py-4 backdrop-blur-sm sm:py-5">
          {bottomContent}
        </div>
      ) : null}
    </section>
  );
}
