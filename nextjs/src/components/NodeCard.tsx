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

  const barColor = (v: number, type: "cpu"|"mem"|"dsk") => {
    if (v >= 90) return { bg: "var(--color-danger)", grad: "var(--color-danger)" };
    if (v >= 70) return { bg: "var(--color-accent-orange)", grad: "var(--color-accent-orange)" };
    if (type === "cpu") return { bg: "var(--color-accent)", grad: "linear-gradient(90deg, #10b981, #34d399)" };
    if (type === "mem") return { bg: "#a78bfa", grad: "linear-gradient(90deg, #7c3aed, #a78bfa)" };
    return { bg: "#f59e0b", grad: "linear-gradient(90deg, #d97706, #f59e0b)" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={`cursor-pointer transition-all duration-300 rounded-[16px] bg-glass-bg/6 backdrop-blur-[60px] saturate-120 border border-glass-border/10 shadow-[0_0_0_1px_rgba(45,158,107,0.04)_inset_0_1px_0_rgba(255,255,255,0.03)] overflow-hidden ${node.online ? "" : "opacity-60"}`}
    >
      <a href={`./detail?uuid=${node.uuid}`} className="block p-[14px_16px] flex flex-col gap-[10px]">
        {/* Header */}
        <div className="flex items-center gap-[7px]">
          <span className={`w-[9px] h-[9px] rounded-full shrink-0 ${node.online ? 'bg-accent shadow-[0_0_4px_rgba(45,158,107,0.3)]' : 'bg-danger'}`}
          />
          {osIcon && (
            <img src={osIcon} alt="" className="w-4 h-4 object-contain shrink-0 opacity-70" loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          {node.online && (
            <span className="absolute top-[14px] left-[16px] w-[9px] h-[9px] rounded-full animate-ping opacity-30 bg-accent" />
          )}
          <span className="font-semibold flex-1 min-w-0 truncate text-[14px] text-text-primary">
            {node.name || node.uuid}
          </span>
          {flagCode && (
            <img src={`https://flagcdn.com/${flagCode}.svg`} alt={node.region} title={node.region}
              className="w-6 h-[17px] object-cover rounded-[2px] shrink-0" loading="lazy"
              onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>

        {/* OS info */}
        {(node.os || node.virtualization) && (
          <div className="text-[12px] text-text-muted tracking-[0.02em]">
            {[node.os?.split(" ")[0], node.virtualization].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Metrics */}
        <div className="flex flex-col gap-[4px]">
          <MetricRow label="CPU" value={cpu.toFixed(1)} pct={cpu} color={barColor(cpu, "cpu")} sub={node.cpu_name_short} />
          <MetricRow label="MEM" value={mem.toFixed(1)} pct={mem} color={barColor(mem, "mem")} sub={node.memory_total ? `${bytes(node.memory_used)} / ${bytes(node.memory_total)}` : undefined} />
          <MetricRow label="DSK" value={disk.toFixed(1)} pct={disk} color={barColor(disk, "dsk")} sub={node.disk_total_val ? `${bytes(node.disk_used)} / ${bytes(node.disk_total_val)}` : undefined} />
        </div>

        {/* Net row */}
        <div className="flex items-center gap-2 h-[18px]">
          <span className="font-mono text-[12px] text-accent">↑ {bytes(node.network_out || 0)}/s</span>
          <span className="font-mono text-[12px] text-accent-2">↓ {bytes(node.network_in || 0)}/s</span>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-[7px] font-mono text-[12px] text-text-muted border-t border-glass-border/10">
          <span className="flex items-center gap-1"><Clock size={12} className="opacity-60" /> {uptime(node.uptime_val)}</span>
          <span className="ml-auto">{age(node.last_update)}</span>
          {node.price && (
            <span className="ml-auto font-bold text-xs leading-[1.4] bg-gradient-to-r from-[#10b981] to-[#818cf8] p-[3px_7px] rounded-full text-text-primary">{priceTag(node.price, node.currency)}</span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="px-[7px] py-[2px] font-mono rounded-full" style={{
                fontSize:11, background:"rgba(255,255,255,0.06)", border:"1px solid var(--glass-border)", color:"var(--color-text-muted)"
              }}>{t}</span>
            ))}
          </div>
        )}
      </a>
    </motion.div>
  );
}

function MetricRow({ label, value, pct, color, sub }: { label: string; value: string; pct: number; color: { bg: string; grad: string }; sub?: string }) {
  return (
    <div className="flex items-center gap-[6px] h-[20px]">
      <span className="font-bold shrink-0 text-right font-sans text-[11px] w-[26px] text-text-muted tracking-[0.02em]">{label}</span>
      <div className="flex-1 h-[6px] rounded-full overflow-hidden bg-glass-bg/6">
        <motion.div
          className="h-full rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.min(1, pct / 100) }}
          transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
          style={{ transformOrigin: "left", background: pct >= 90 ? color.bg : pct >= 70 ? "var(--color-accent-orange)" : color.grad }}
        />
      </div>
      <span className="text-right font-semibold font-mono shrink-0 text-[13px] w-[38px] text-text-primary">{value}%</span>
    </div>
  );
}
