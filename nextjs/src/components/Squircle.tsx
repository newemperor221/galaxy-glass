"use client";

import { useRef, useEffect, useId, type ReactNode } from "react";
import { getSvgPath } from "@/lib/figmaSquircle";

interface SquircleProps {
  children: ReactNode;
  className?: string;
  /** Corner radius in px. Default: 16 */
  radius?: number;
  /** Corner smoothing factor. Default: 1 (Apple max) */
  smoothing?: number;
  /** Recompute on resize? Default: true */
  responsive?: boolean;
}

/**
 * Wraps children with an SVG squircle (Apple-style continuous corner) clip path.
 * Automatically measures the element and applies a figma-squircle clip-path.
 */
export default function Squircle({ children, className = "", radius = 16, smoothing = 1, responsive = true }: SquircleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const uid = useId();
  const clipId = `sq-${uid.replace(/[:.]/g, "")}`;

  useEffect(() => {
    const el = containerRef.current;
    const pathEl = pathRef.current;
    if (!el || !pathEl) return;

    const apply = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      pathEl.setAttribute("d", getSvgPath({ width: w, height: h, cornerRadius: radius, cornerSmoothing: smoothing }));
      el.style.clipPath = `url(#${clipId})`;
    };

    // Double rAF to let layout settle
    requestAnimationFrame(() => requestAnimationFrame(apply));

    if (responsive) {
      const ro = new ResizeObserver(apply);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [radius, smoothing, responsive, clipId]);

  return (
    <div ref={containerRef} className={className}>
      <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path ref={pathRef} />
          </clipPath>
        </defs>
      </svg>
      {children}
    </div>
  );
}
