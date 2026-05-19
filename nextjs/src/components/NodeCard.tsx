"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { MergedNode } from "@/lib/api";
import { bytes, uptime, age, priceTag, getOSIcon, flagEmoji } from "@/lib/utils";

interface NodeCardProps {
  node: MergedNode;
  index: number;
}

export default function NodeCard({ node, index }: NodeCardProps) {
  const cpu = node.cpu_usage || 0;
  const mem = node.memory_usage || 0;
  const disk = node.disk_usage || 0;
  const tags = node.tags_list || [];
  const osIcon = getOSIcon(node.os);
  const flagCode = flagEmoji(node.region);
  const offline = !node.online;

  const barColor = (v: number) => {
    if (v >= 90) return "#f43f5e";
    if (v >= 70) return "#f59e0b";
    return null; // will use default per-type
  };

  const barGradient = (v: number, type: "cpu"|"mem"|"dsk") => {
    if (v >= 90) return "linear-gradient(90deg, #f43f5e, #e11d48)";
    if (v >= 70) return "linear-gradient(90deg, #f59e0b, #d97706)";
    if (type === "cpu") return "linear-gradient(90deg, #10b981, #34d399)";
    if (type === "mem") return "linear-gradient(90deg, #6366f1, #818cf8)";
    return "linear-gradient(90deg, #f59e0b, #fbbf24)";
  };

  const metricDelay = (i: number) => 0.35 + index * 0.04 + i * 0.06;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.005 }}
      className={`relative cursor-pointer transition-all duration-400 overflow-hidden sq-card group ${
        offline ? "opacity-50" : ""
      }`}
      style={{ borderRadius: 16 }}
    >
      {/* Deep glass background */}
      <div
        className="absolute inset-0 transition-all duration-400"
        style={{
          background: offline
            ? "rgba(6, 12, 26, 0.55)"
            : "rgba(6, 12, 26, 0.75)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      />

      {/* Subtle border — gradient edge */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-400"
        style={{
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,0.04)",
            "0 0 0 1px rgba(255,255,255,0.06)",
            "0 4px 24px rgba(0,0,0,0.3)",
          ].join(", "),
          borderRadius: "inherit",
        }}
      />

      {/* Hover: accent border glow */}
      {!offline && (
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-0 transition-all duration-500 group-hover:opacity-100"
          style={{
            boxShadow: [
              "0 0 0 1px rgba(16,185,129,0.12)",
              "0 0 28px rgba(16,185,129,0.06)",
              "0 8px 32px rgba(0,0,0,0.35)",
            ].join(", "),
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Subtle top inner glow */}
      {!offline && (
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-[1]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
            borderRadius: "16px 16px 0 0",
          }}
        />
      )}

      {/* Content */}
      <a href={`./detail?uuid=${node.uuid}`} className="relative block p-[20px] flex flex-col gap-[10px] z-[2]">

        {/* Offline badge */}
        {offline && (
          <div
            className="absolute top-[20px] right-[20px] z-[3] px-[8px] py-[3px] text-[10px] font-semibold tracking-[0.06em] uppercase"
            style={{
              borderRadius: 8,
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.20)",
              color: "#f43f5e",
              lineHeight: "1.4",
            }}
          >OFFLINE</div>
        )}

        {/* Header row */}
        <div className="flex items-center gap-2.5">
          {/* Status dot with glow */}
          <div className="relative shrink-0 w-[10px] h-[10px]">
            <span
              className={`absolute inset-0 rounded-full ${
                node.online
                  ? 'bg-[#10b981]'
                  : 'bg-[#f43f5e]'
              }`}
              style={{
                boxShadow: node.online
                  ? "0 0 8px rgba(16,185,129,0.4)"
                  : "0 0 4px rgba(244,63,94,0.3)",
                animation: node.online ? "live-pulse 2.5s ease-in-out infinite" : "none",
              }}
            />
          </div>
          {osIcon && (
            <img src={osIcon} alt=""
              className="w-[15px] h-[15px] object-contain shrink-0 opacity-50"
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <span className="font-semibold flex-1 min-w-0 truncate text-[14px] leading-[1.3] text-white/90 tracking-[-0.01em]">
            {node.name || node.uuid}
          </span>
          {flagCode && (
            <img src={`https://flagcdn.com/${flagCode}.svg`} alt={node.region} title={node.region}
              className="w-[22px] h-[15px] object-cover rounded-[3px] shrink-0 ring-1 ring-white/5" loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>

        {/* OS / Virt info */}
        {(node.os || node.virtualization) && (
          <div className="text-[11px] leading-[1.4] text-white/30 tracking-[0.03em]">
            {[node.os?.split(" ")[0], node.virtualization].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t}
                className="inline-flex items-center px-[8px] py-[2px] text-[10px] font-mono leading-[1.5]"
                style={{
                  borderRadius: 8,
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.10)",
                  color: "rgba(240,253,244,0.45)",
                }}
              >{t}</span>
            ))}
          </div>
        )}

        {/* Metrics */}
        <div className="flex flex-col gap-[8px] mt-[2px]">
          <MetricRow label="CPU" value={cpu.toFixed(1)} pct={cpu} color={barColor(cpu)} grad={barGradient(cpu, "cpu")} delay={metricDelay(0)} />
          <MetricRow label="MEM" value={mem.toFixed(1)} pct={mem} color={barColor(mem)} grad={barGradient(mem, "mem")} delay={metricDelay(1)} />
          <MetricRow label="DSK" value={disk.toFixed(1)} pct={disk} color={barColor(disk)} grad={barGradient(disk, "dsk")} delay={metricDelay(2)} />
        </div>

        {/* Net row */}
        <div className="flex items-center gap-4 mt-[2px]">
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] leading-[1.4] text-[#10b981] font-medium">
            <span className="opacity-60 text-[8px]">▲</span> {bytes(node.network_out || 0)}/s
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] leading-[1.4] text-[#6366f1] font-medium">
            <span className="opacity-60 text-[8px]">▼</span> {bytes(node.network_in || 0)}/s
          </span>
        </div>

        {/* Footer separator + uptime + price */}
        <div className="relative pt-[12px] mt-[2px]">
          {/* Gradient separator — full width with fade */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.05) 85%, transparent 96%)",
            }}
          />
          <div className="flex items-center gap-2 font-mono text-[11px] leading-[1.4] text-white/30">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={10} className="opacity-40" />
              {uptime(node.uptime_val)}
            </span>
            {node.last_update && Date.now() - new Date(node.last_update).getTime() > 120000 && (
              <span className="text-[#f59e0b]">{age(node.last_update)}</span>
            )}
            <span
              className="ml-auto inline-flex items-center font-semibold text-[11px] px-[10px] py-[3px]"
              style={{
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(99,102,241,0.10))",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(240,253,244,0.85)",
                lineHeight: "1.4",
              }}
            >{node.price ? priceTag(node.price, node.currency) : ""}</span>
          </div>
        </div>
      </a>
    </motion.div>
  );
}

function MetricRow({ label, value, pct, color, grad, delay }: {
  label: string; value: string; pct: number;
  color: string | null; grad: string; delay?: number;
}) {
  return (
    <div className="flex items-center gap-[8px]" style={{ minHeight: 18 }}>
      <span className="font-bold shrink-0 text-right font-sans text-[10px] w-[28px] text-white/35 tracking-[0.05em] uppercase">{label}</span>
      <div
        className="flex-1 h-[4px] overflow-hidden"
        style={{
          borderRadius: 9999,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <motion.div
          className="h-full relative overflow-hidden"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.min(1, pct / 100) }}
          transition={{ duration: 0.6, delay: delay || 0, ease: [0.16,1,0.3,1] }}
          style={{
            transformOrigin: "left",
            borderRadius: 9999,
            background: grad,
          }}
        >
          {/* Bar shine */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)",
            }}
          />
        </motion.div>
      </div>
      <span className="text-right font-semibold font-mono shrink-0 text-[11px] w-[38px] text-white/70 tabular-nums">{value}%</span>
    </div>
  );
}
