"use client";

import { useEffect, useRef } from "react";

interface GlowState {
  x: number;
  y: number;
  init: boolean;
}

/**
 * Animates a soft organic glow behind an active row, sharing the lyrics orb's
 * visual language. Transform/opacity only, no per-frame React state.
 * Returns ref callbacks so consumers never read ref.current during render.
 */
export function useOrganicGlow<T extends HTMLElement>(
  enabled: boolean,
  paddingX = 48,
  paddingY = 28,
) {
  const glowNodeRef = useRef<HTMLDivElement | null>(null);
  const hostNodeRef = useRef<T | null>(null);

  useEffect(() => {
    const glow = glowNodeRef.current;
    const host = hostNodeRef.current;
    if (!enabled || !glow || !host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state: GlowState = { x: 0, y: 0, init: false };
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const w = host.offsetWidth;
      const h = host.offsetHeight;
      const targetX = host.offsetLeft + w / 2;
      const targetY = host.offsetTop + h / 2;

      const distance = Math.abs(targetY - state.y);
      const k = !state.init || distance > 200 ? 1 : 1 - Math.exp(-dt * 8);
      if (!state.init) {
        state.x = targetX;
        state.y = targetY;
        state.init = true;
      } else {
        state.x += (targetX - state.x) * k;
        state.y += (targetY - state.y) * k;
      }

      const t = now / 1000;
      const scaleX = ((w + paddingX) / 320) * (1 + (reducedMotion ? 0 : 0.03 * Math.sin(t * 1.5)));
      const scaleY = ((h + paddingY) / 140) * (1 + (reducedMotion ? 0 : 0.04 * Math.sin(t * 1.1 + 0.9)));
      const radiusA = 55 + 7 * Math.sin(t * 0.8);
      const radiusB = 45 + 6 * Math.sin(t * 0.65 + 1.8);

      glow.style.borderRadius = `${radiusA}% ${100 - radiusA}% ${radiusB}% ${100 - radiusB}% / ${radiusB}% ${radiusA}% ${100 - radiusA}% ${100 - radiusB}%`;
      glow.style.transform = `translate3d(${state.x - 160}px, ${state.y - 70}px, 0) rotate(${reducedMotion ? 0 : 4 * Math.sin(t * 0.4)}deg) scale(${scaleX}, ${scaleY})`;

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [enabled, paddingX, paddingY]);

  const glowRef = (node: HTMLDivElement | null) => {
    glowNodeRef.current = node;
  };

  const hostRef = (node: T | null) => {
    hostNodeRef.current = node;
  };

  return { glowRef, hostRef };
}
