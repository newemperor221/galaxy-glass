"use client";

import { type ReactNode } from "react";

interface SquircleClipProps {
  children: ReactNode;
  className?: string;
}

/**
 * Squircle (超椭圆) clip wrapper.
 * Uses SVG clipPath with a smooth super-ellipse curve.
 */
export default function SquircleClip({ children, className = "" }: SquircleClipProps) {
  const clipId = `sq-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={`relative ${className}`}>
      <svg width="0" height="0" className="absolute" style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d="M0.08,0 L0.92,0 C0.96,0 1,0.04 1,0.08 L1,0.92 C1,0.96 0.96,1 0.92,1 L0.08,1 C0.04,1 0,0.96 0,0.92 L0,0.08 C0,0.04 0.04,0 0.08,0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div style={{ clipPath: `url(#${clipId})` }}>
        {children}
      </div>
    </div>
  );
}
