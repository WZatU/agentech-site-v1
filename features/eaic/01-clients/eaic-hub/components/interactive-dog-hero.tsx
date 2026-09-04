"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./interactive-dog-hero.module.css";

const MAX_ROTATE_X = 4;
const MAX_ROTATE_Y = 9;
const MAX_TRANSLATE_X = 10;
const MAX_TRANSLATE_Y = 6;
const EASING = 0.14;

export function InteractiveDogHero() {
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visualElementCandidate = visualRef.current;

    if (!visualElementCandidate) {
      return;
    }

    const visualElement: HTMLDivElement = visualElementCandidate;
    const heroElementCandidate = visualElement.parentElement;

    if (!heroElementCandidate) {
      return;
    }

    const heroElement: HTMLElement = heroElementCandidate;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    const desktopMotionQuery = window.matchMedia("(min-width: 768px)");
    let frameId = 0;
    let targetRotateX = 0;
    let targetRotateY = 0;
    let targetTranslateX = 0;
    let targetTranslateY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;
    let currentTranslateX = 0;
    let currentTranslateY = 0;

    function renderFrame() {
      currentRotateX += (targetRotateX - currentRotateX) * EASING;
      currentRotateY += (targetRotateY - currentRotateY) * EASING;
      currentTranslateX += (targetTranslateX - currentTranslateX) * EASING;
      currentTranslateY += (targetTranslateY - currentTranslateY) * EASING;

      visualElement.style.setProperty("--dog-rotate-x", `${currentRotateX.toFixed(3)}deg`);
      visualElement.style.setProperty("--dog-rotate-y", `${currentRotateY.toFixed(3)}deg`);
      visualElement.style.setProperty("--dog-translate-x", `${currentTranslateX.toFixed(3)}px`);
      visualElement.style.setProperty("--dog-translate-y", `${currentTranslateY.toFixed(3)}px`);

      const movementRemaining =
        Math.abs(targetRotateX - currentRotateX) +
        Math.abs(targetRotateY - currentRotateY) +
        Math.abs(targetTranslateX - currentTranslateX) +
        Math.abs(targetTranslateY - currentTranslateY);

      if (movementRemaining > 0.02) {
        frameId = window.requestAnimationFrame(renderFrame);
      } else {
        frameId = 0;
      }
    }

    function scheduleFrame() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    }

    function resetPosition() {
      targetRotateX = 0;
      targetRotateY = 0;
      targetTranslateX = 0;
      targetTranslateY = 0;
      visualElement.style.setProperty("--dog-light-x", "68%");
      visualElement.style.setProperty("--dog-light-y", "42%");
      scheduleFrame();
    }

    function handlePointerMove(event: PointerEvent) {
      if (
        reducedMotionQuery.matches ||
        !finePointerQuery.matches ||
        !desktopMotionQuery.matches ||
        event.pointerType === "touch"
      ) {
        resetPosition();
        return;
      }

      const heroRect = heroElement.getBoundingClientRect();
      const pointerInsideHero =
        event.clientX >= heroRect.left &&
        event.clientX <= heroRect.right &&
        event.clientY >= heroRect.top &&
        event.clientY <= heroRect.bottom;

      if (!pointerInsideHero) {
        resetPosition();
        return;
      }

      const normalizedX = ((event.clientX - heroRect.left) / heroRect.width) * 2 - 1;
      const normalizedY = ((event.clientY - heroRect.top) / heroRect.height) * 2 - 1;

      targetRotateX = -normalizedY * MAX_ROTATE_X;
      targetRotateY = normalizedX * MAX_ROTATE_Y;
      targetTranslateX = normalizedX * MAX_TRANSLATE_X;
      targetTranslateY = normalizedY * MAX_TRANSLATE_Y;
      visualElement.style.setProperty("--dog-light-x", `${50 + normalizedX * 20}%`);
      visualElement.style.setProperty("--dog-light-y", `${44 + normalizedY * 14}%`);
      scheduleFrame();
    }

    function handleMotionPreferenceChange() {
      resetPosition();
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", resetPosition);
    reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);
    finePointerQuery.addEventListener("change", handleMotionPreferenceChange);
    desktopMotionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPosition);
      reducedMotionQuery.removeEventListener("change", handleMotionPreferenceChange);
      finePointerQuery.removeEventListener("change", handleMotionPreferenceChange);
      desktopMotionQuery.removeEventListener("change", handleMotionPreferenceChange);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div ref={visualRef} className={styles.visual} data-eaic-hero-visual>
      <Image
        data-eaic-hero-blueprint="linework"
        data-eaic-hero-theme="dark"
        src="/assets/products/agentech-library/humanoid-wireframe-dark-v1.png"
        alt="Humanoid robot wireframe working at a table"
        fill
        sizes="(min-width: 768px) 58vw, 100vw"
        quality={90}
        className={styles.image}
        priority
      />
      <Image
        data-eaic-hero-blueprint="linework"
        data-eaic-hero-theme="light"
        src="/assets/products/agentech-library/humanoid-wireframe-light-v1.png"
        alt="Humanoid robot wireframe working at a table"
        fill
        sizes="(min-width: 768px) 58vw, 100vw"
        quality={90}
        className={styles.image}
        priority
      />
      <span className={styles.sheen} aria-hidden="true" />
    </div>
  );
}
