"use client";

import { useRef, useEffect, useMemo, useId } from "react";
import * as d3 from "d3";

interface LineChartProps {
  data: number[];
  /** Optional second dataset for dual-line (net up/down) */
  data2?: number[];
  color?: string;
  color2?: string;
  /** Show y-axis label (auto computes max) */
  showY?: boolean;
  /** Start/end time labels */
  timeStart?: string;
  timeEnd?: string;
  /** Unit suffix for y-axis */
  unit?: string;
  height?: number;
}

export default function LineChart({
  data, data2, color = "#10b981", color2 = "#f97316",
  showY, timeStart, timeEnd, unit = "%", height = 160,
}: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const gradId = `lg-${uid}`;
  const gradId2 = `lg2-${uid}`;
  const filterId = `glow-${uid}`;

  const vw = 400; // fixed viewBox width, scales via preserveAspectRatio
  const vh = height;
  const mx = 28; // margin left (for y-label)
  const mr = 8;  // margin right
  const mt = 8;
  const mb = 22;
  const iw = vw - mx - mr;
  const ih = vh - mt - mb;

  const xScale = useMemo(() =>
    d3.scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, iw]),
    [data.length, iw]
  );

  const maxVal = useMemo(() => {
    const all = data2 ? [...data, ...data2] : data;
    return Math.max(...all, 1);
  }, [data, data2]);

  const yScale = useMemo(() =>
    d3.scaleLinear().domain([0, maxVal]).range([ih, 0]),
    [maxVal, ih]
  );

  const lineGen = useMemo(() =>
    d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX),
    [xScale, yScale]
  );

  const areaGen = useMemo(() =>
    d3.area<number>()
      .x((_, i) => xScale(i))
      .y0(ih)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX),
    [xScale, yScale, ih]
  );

  const linePath = data.length > 1 ? lineGen(data) : null;
  const areaPath = data.length > 1 ? areaGen(data) : null;
  const linePath2 = data2 && data2.length > 1 ? lineGen(data2) : null;
  const areaPath2 = data2 && data2.length > 1 ? areaGen(data2) : null;

  // Y-axis tick value
  const yLabel = useMemo(() => {
    if (!showY) return null;
    if (maxVal >= 1000) return d3.format(".1s")(maxVal).replace("G", "B");
    return maxVal.toFixed(maxVal < 10 ? 1 : 0);
  }, [showY, maxVal]);

  // Last point for endpoint dot
  const lastPoint = data.length > 0
    ? { x: xScale(data.length - 1), y: yScale(data[data.length - 1]) }
    : null;
  const lastPoint2 = data2 && data2.length > 0
    ? { x: xScale(data2.length - 1), y: yScale(data2[data2.length - 1]) }
    : null;

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Line glow filter */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient fills */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {data2 && (
            <linearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color2} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {/* Grid lines (subtle) */}
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i}
            x1={mx} y1={mt + ih * (1 - r)}
            x2={vw - mr} y2={mt + ih * (1 - r)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
          />
        ))}

        {/* Area fills */}
        {areaPath && (
          <path d={areaPath} fill={`url(#${gradId})`}
            style={{ transition: "d 0.3s ease" }}
          />
        )}
        {areaPath2 && (
          <path d={areaPath2} fill={`url(#${gradId2})`}
            style={{ transition: "d 0.3s ease" }}
          />
        )}

        {/* Lines */}
        {linePath && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            filter={`url(#${filterId})`}
            className="chart-line"
          />
        )}
        {linePath2 && (
          <path d={linePath2} fill="none" stroke={color2} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="chart-line"
          />
        )}

        {/* Endpoint dots */}
        {lastPoint && (
          <>
            <circle cx={lastPoint.x} cy={lastPoint.y} r="3"
              fill={color}
              className="chart-dot"
            />
            <circle cx={lastPoint.x} cy={lastPoint.y} r="6"
              fill="none" stroke={color} strokeWidth="1.5" opacity="0.35"
              className="chart-ring"
            />
          </>
        )}
        {lastPoint2 && (
          <>
            <circle cx={lastPoint2.x} cy={lastPoint2.y} r="3" fill={color2}
              className="chart-dot" />
            <circle cx={lastPoint2.x} cy={lastPoint2.y} r="6"
              fill="none" stroke={color2} strokeWidth="1.5" opacity="0.35"
              className="chart-ring" />
          </>
        )}

        {/* Y-axis label */}
        {showY && yLabel && (
          <text x={mx - 4} y={mt + 4}
            fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end"
            fontFamily="'Fira Code', monospace"
          >{yLabel}{unit}</text>
        )}

        {/* Time labels */}
        {timeStart && (
          <text x={mx} y={vh - 2}
            fill="rgba(255,255,255,0.2)" fontSize="9" textAnchor="start"
            fontFamily="'Fira Code', monospace"
          >{timeStart}</text>
        )}
        {timeEnd && timeEnd !== timeStart && (
          <text x={vw - mr} y={vh - 2}
            fill="rgba(255,255,255,0.2)" fontSize="9" textAnchor="end"
            fontFamily="'Fira Code', monospace"
          >{timeEnd}</text>
        )}

        {/* Data2 legend (net chart) */}
        {data2 && (
          <>
            <line x1={vw - mr - 60} y1={mt + 3} x2={vw - mr - 48} y2={mt + 3}
              stroke={color2} strokeWidth="2" />
            <text x={vw - mr - 44} y={mt + 6}
              fill={color2} fontSize="9" textAnchor="start"
              fontFamily="'Fira Code', monospace"
            >↑ 上行</text>
            <line x1={vw - mr - 60} y1={mt + 17} x2={vw - mr - 48} y2={mt + 17}
              stroke={color} strokeWidth="2" />
            <text x={vw - mr - 44} y={mt + 20}
              fill={color} fontSize="9" textAnchor="start"
              fontFamily="'Fira Code', monospace"
            >↓ 下行</text>
          </>
        )}

        {/* No data label */}
        {data.length < 2 && !data2 && (
          <text x={vw / 2} y={vh / 2 + 4}
            fill="rgba(255,255,255,0.15)" fontSize="11" textAnchor="middle"
            fontFamily="'Fira Code', monospace"
          >数据不足</text>
        )}
      </svg>

      {/* Keyframe animation for endpoint dots */}
      <style>{`
        .chart-line {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawLine 0.6s ease forwards;
        }
        .chart-dot {
          opacity: 0;
          animation: fadeIn 0.4s 0.5s ease forwards;
        }
        .chart-ring {
          opacity: 0;
          animation: ringPulse 2s 0.6s ease-in-out infinite;
        }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.35; r: 6; }
          50% { opacity: 0.1; r: 10; }
        }
      `}</style>
    </div>
  );
}
