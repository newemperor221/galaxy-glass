"use client";

import { useEffect, useRef, useDeferredValue } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface UPlotChartProps {
  data: number[];
  data2?: number[];
  timestamps?: number[];
  color: string;
  color2?: string;
  showY?: boolean;
  unit?: string;
  height?: number;
}

export default function UPlotChart({
  data, data2, timestamps, color, color2, showY, unit, height = 140,
}: UPlotChartProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const initRef = useRef(false);

  // Defer non-urgent chart data to avoid blocking interactivity
  const deferredData = useDeferredValue(data);
  const deferredData2 = useDeferredValue(data2);

  // Build opts once
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const series: uPlot.Series[] = [
      {},
      {
        label: "",
        stroke: color,
        width: 2,
        fill: color + "18",
        points: { show: false },
      },
    ];

    if (data2 !== undefined) {
      series.push({
        label: "",
        stroke: color2,
        width: 2,
        fill: (color2 || "#fff") + "10",
        points: { show: false },
      });
    }

    const opts: uPlot.Options = {
      width: target.clientWidth,
      height,
      cursor: { show: true, drag: { x: false, y: false } },
      select: { show: false },
      legend: { show: false },
      axes: [
        {
          show: !!timestamps,
          stroke: "rgba(255,255,255,0.10)",
          grid: { stroke: "rgba(255,255,255,0.03)", width: 1 },
          size: 24,
          font: "9px system-ui",
          values: (_self, ticks) => ticks.map(v => {
            const d = new Date(v * 1000);
            return d.toLocaleTimeString("zh-CN", {hour:"2-digit",minute:"2-digit"});
          }),
        },
        {
          show: !!showY,
          stroke: "rgba(255,255,255,0.15)",
          grid: { stroke: "rgba(255,255,255,0.03)", width: 1 },
          size: 32,
          font: "10px system-ui",
          values: (_self, ticks) => ticks.map(v => {
            if (unit === "%") return v.toFixed(0) + "%";
            if (unit === "/s") {
              const b = v || 0;
              const k = 1024;
              if (b >= k * k) return (b / k / k).toFixed(0) + "M";
              if (b >= k) return (b / k).toFixed(0) + "K";
              return b.toFixed(0);
            }
            return v.toFixed(0);
          }),
        },
      ],
      series,
      hooks: {
        ready: [() => { initRef.current = true; }],
      },
    };

    const pts = timestamps
      ? [timestamps.slice(), data.slice()] as uPlot.AlignedData
      : [null as unknown as number[], data.slice()] as uPlot.AlignedData;
    if (data2 !== undefined) pts.push(data2.slice());

    chartRef.current = new uPlot(opts, pts, target);
    initRef.current = true;

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; initRef.current = false; }
    };
    // Only re-create on color/unit/height changes, not data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, color2, showY, unit, height, !!data2, !!timestamps]);

  // Smooth data update via setData (no destroy/recreate flicker)
  useEffect(() => {
    if (!chartRef.current) return;
    const pts = timestamps
      ? [timestamps.slice(), deferredData.slice()] as uPlot.AlignedData
      : [null as unknown as number[], deferredData.slice()] as uPlot.AlignedData;
    if (deferredData2 !== undefined) pts.push(deferredData2.slice());
    chartRef.current.setData(pts);
  }, [deferredData, deferredData2, timestamps]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (chartRef.current && targetRef.current) {
        chartRef.current.setSize({ width: targetRef.current.clientWidth, height });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [height]);

  if (data.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: 12 }}>
        数据不足
      </div>
    );
  }

  return <div ref={targetRef} style={{ width: "100%", height }} />;
}
