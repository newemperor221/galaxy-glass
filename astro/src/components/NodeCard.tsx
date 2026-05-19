"use client";

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import type { MergedNode } from "@/lib/api";
import { bytes, uptime, age, priceTag, getOSIcon, flagEmoji } from "@/lib/utils";

export default function NodeCard({ node, index }: { node: MergedNode; index: number }) {
  const [visible, setVisible] = useState(false);
  const [barAnims, setBarAnims] = useState([false, false, false]);
  const mountIndex = useRef(index);

  const cpu = node.cpu_usage || 0;
  const mem = node.memory_usage || 0;
  const disk = node.disk_usage || 0;
  const tags = node.tags_list || [];
  const flagCode = flagEmoji(node.region);
  const offline = !node.online;

  const barColor = (v: number, hi: string, mid: string, lo: string) => v>=90?hi: v>=70?mid: lo;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), mountIndex.current * 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers = [0, 1, 2].map((i) =>
      setTimeout(() => setBarAnims((p) => { const n = [...p]; n[i] = true; return n; }), 350 + i * 60)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <div className={`glass-card ${offline?"opacity-50":""}`}
      style={{
        padding:"12px 16px",
        display:"flex",flexDirection:"column",gap:"8px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        animation: visible ? "none" : undefined,
      }}>
      <a href={`/detail?uuid=${node.uuid}`} className="flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{background:node.online?"var(--accent)":"var(--danger)",boxShadow:node.online?"0 0 4px rgba(16,185,129,0.3)":"none"}}/>
          {flagCode && <img src={`https://flagcdn.com/${flagCode}.svg`} alt={node.region} className="w-3.5 h-2.5 object-cover rounded shrink-0" loading="lazy"/>}
          <span className="font-semibold text-sm truncate flex-1" style={{color:"var(--text-primary)"}}>{node.name || node.uuid}</span>
          {offline && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{borderRadius:4,background:"rgba(244,63,94,0.12)",color:"var(--danger)"}}>OFFLINE</span>}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(t => <span key={t} className="text-[9px] font-mono px-[5px] py-[1px]" style={{borderRadius:4,background:"rgba(99,102,241,0.08)",color:"var(--text-muted)"}}>{t}</span>)}
          </div>
        )}

        {/* Bars */}
        <div className="flex flex-col gap-1.5 mt-0.5">
          {[["CPU", cpu, "#10b981"], ["MEM", mem, "#6366f1"], ["DSK", disk, "#f59e0b"]].map(([l,v,lo],i) => {
            const val = v as number;
            const bc = barColor(val, "#f43f5e", "#f59e0b", lo as string);
            const anim = barAnims[i];
            return (
              <div key={l as string} className="flex items-center gap-2" style={{minHeight:14}}>
                <span className="text-[9px] font-semibold font-mono w-[22px] text-right shrink-0" style={{color:"var(--text-muted)"}}>{l}</span>
                <div className="flex-1 h-1.5 overflow-hidden" style={{borderRadius:3,background:"rgba(255,255,255,0.04)"}}>
                  <div className="h-full" style={{borderRadius:3,background:bc,width:anim?`${Math.min(100,val)}%`:"0%",transition:"width 0.5s cubic-bezier(0.16,1,0.3,1)"}}/>
                </div>
                <span className="text-[10px] font-mono w-[30px] text-right tabular-nums" style={{color:"var(--text-secondary)"}}>{(val as number).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>

        {/* Net */}
        <div className="flex items-center gap-3 text-[11px] font-mono" style={{color:"var(--text-secondary)"}}>
          <span style={{color:"#10b981"}}>↑{bytes(node.network_out||0)}/s</span>
          <span style={{color:"#6366f1"}}>↓{bytes(node.network_in||0)}/s</span>
          <span className="ml-auto flex items-center gap-1" style={{color:"var(--text-muted)"}}><Clock size={9}/>{uptime(node.uptime_val)}</span>
        </div>

        {/* Price */}
        {node.price && (
          <div className="text-[11px] font-mono font-semibold text-right" style={{color:"var(--accent)"}}>{priceTag(node.price, node.currency)}</div>
        )}

        {/* Stale warning */}
        {node.last_update && Date.now() - new Date(node.last_update).getTime() > 120000 && (
          <div className="text-[10px] font-mono text-right" style={{color: "#f59e0b"}}>{age(node.last_update)}</div>
        )}
      </a>
    </div>
  );
}
