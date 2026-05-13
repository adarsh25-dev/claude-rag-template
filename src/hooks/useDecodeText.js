"use client";

import { useEffect, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

function scrambleSameLength(targetText) {
  let out = "";
  for (let i = 0; i < targetText.length; i += 1) {
    const ch = targetText[i];
    if (ch === " ") {
      out += " ";
      continue;
    }
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

/**
 * Scrambles label text into random glyphs, then resolves to `targetText` when `isActive` is true.
 * @param {string} targetText
 * @param {boolean} isActive
 * @param {{ durationMs?: number }} [options]
 * @returns {string}
 */
export function useDecodeText(targetText, isActive, options) {
  const durationMs = options?.durationMs ?? 900;
  const [text, setText] = useState("");

  useEffect(() => {
    if (!isActive) {
      setText("");
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(targetText);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const scrambleEnd = 0.52;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);

      if (t < scrambleEnd) {
        setText(scrambleSameLength(targetText));
      } else {
        const resolveT = (t - scrambleEnd) / (1 - scrambleEnd);
        const n = Math.min(
          targetText.length,
          Math.floor(resolveT * targetText.length) + 1,
        );
        let s = "";
        for (let i = 0; i < targetText.length; i += 1) {
          if (i < n) {
            s += targetText[i];
          } else if (targetText[i] === " ") {
            s += " ";
          } else {
            s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
          }
        }
        setText(s);
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setText(targetText);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, targetText, durationMs]);

  return text;
}
