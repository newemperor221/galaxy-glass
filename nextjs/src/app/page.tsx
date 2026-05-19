"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, LogIn, ArrowUp, ArrowDown, Clock, Gauge, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import NodeCard from "@/components/NodeCard";
import type { MergedNode, NodeData, RecentDataPoint } from "@/lib/api";
import { fetchSiteInfo, fetchNodes, fetchRecentData, mergeNodeData } from "@/lib/api";
import { bytes, uptime, age, priceTag, getExchangeRate, flagEmoji } from "@/lib/utils";

type SortMode = "default" | "name" | "region" | "cpu" | "mem" | "disk" | "netIn" | "netOut" | "uptime";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "默认" },
  { value: "name", label: "名称" },
  { value: "region", label: "地区" },
  { value: "cpu", label: "CPU 占用" },
  { value: "mem", label: "内存占用" },
  { value: "disk", label: "磁盘占用" },
  { value: "netIn", label: "下行速度" },
  { value: "netOut", label: "上行速度" },
  { value: "uptime", label: "在线时长" },
];

function PageContent() {
  const [nodesList, setNodesList] = useState<MergedNode[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [siteName, setSiteName] = useState("银河探针");

  useEffect(() => {
    getExchangeRate().then(setExchangeRate);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const siteInfo = await fetchSiteInfo();
      if (siteInfo.sitename) setSiteName(siteInfo.sitename);
      const nodeList = await fetchNodes();
      const merged = await Promise.all(
        nodeList.map(async (node: NodeData) => {
          const recent = await fetchRecentData(node.uuid);
          return mergeNodeData(node, recent);
        })
      );
      setNodesList(merged);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData]);
  useEffect(() => { const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-CN", { hour12: false })), 1000); return () => clearInterval(t); }, []);

  // Filter & sort
  const filtered = (() => {
    let arr = [...nodesList];
    arr.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      let cmp = 0;
      switch (sortMode) {
        case "cpu": cmp = (b.cpu_usage || 0) - (a.cpu_usage || 0); break;
        case "mem": cmp = (b.memory_usage || 0) - (a.memory_usage || 0); break;
        case "disk": cmp = (b.disk_usage || 0) - (a.disk_usage || 0); break;
        case "netIn": cmp = (b.network_in || 0) - (a.network_in || 0); break;
        case "netOut": cmp = (b.network_out || 0) - (a.network_out || 0); break;
        case "uptime": cmp = (b.uptime_val || 0) - (a.uptime_val || 0); break;
        case "name": cmp = (a.name || a.uuid).localeCompare(b.name || b.uuid); break;
        case "region": cmp = (a.country_code || "").localeCompare(b.country_code || ""); break;
      }
      if (cmp !== 0) return cmp;
      return (a.name || a.uuid).localeCompare(b.name || b.uuid);
    });
    if (filterRegion) arr = arr.filter((n) => n.region === filterRegion);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter((n) => [n.uuid, n.name, n.os, n.virtualization, n.cpu_name, ...(n.tags_list || [])].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return arr;
  })();

  // Stats
  const online = nodesList.filter((n) => n.online).length;
  const total = nodesList.length;
  const netIn = nodesList.reduce((s, n) => s + (n.network_in || 0), 0);
  const netOut = nodesList.reduce((s, n) => s + (n.network_out || 0), 0);
  const totalRx = nodesList.reduce((s, n) => s + (n.network_total_received || 0), 0);
  const totalTx = nodesList.reduce((s, n) => s + (n.network_total_transmitted || 0), 0);
  let totalCny = 0; let remainCny = 0;
  nodesList.forEach((n) => {
    if (n.price) {
      const p = parseFloat(String(n.price));
      const pCny = n.currency === "¥" ? p : p * exchangeRate;
      totalCny += pCny;
      if (n.expired_at && n.billing_cycle) {
        const expired = new Date(n.expired_at).getTime();
        const now = Date.now();
        if (expired > now) {
          const daysLeft = Math.ceil((expired - now) / 86400000);
          const dailyPrice = pCny / parseInt(String(n.billing_cycle));
          remainCny += dailyPrice * daysLeft;
        }
      }
    }
  });

  const regionMap = new Map<string, number>();
  nodesList.forEach((n) => { const r = n.region || ""; if (r) regionMap.set(r, (regionMap.get(r) || 0) + 1); });
  const regions = [...regionMap.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      {/* Navbar */}
      <nav className="sticky top-0 z-20" style={{ borderBottom: "1px solid var(--glass-border)" }}>
        <div className="container">
          <div className="flex items-center justify-between gap-2" style={{ padding: "0.6rem 0", height: 48 }}>
            <a href="./" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
              <span style={{
                fontSize: 24, fontWeight: 700,
                background: "linear-gradient(135deg, #10b981, #818cf8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>{siteName}</span>
            </a>
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <div
                className={`flex items-center rounded-full overflow-hidden transition-all duration-300`}
                style={{
                  maxWidth: showSearch ? 260 : 36, height: 36,
                  border: "1px solid var(--glass-border)",
                  background: showSearch ? "var(--glass-raised)" : "var(--glass-bg)",
                  backdropFilter: "blur(var(--blur-surface))",
                }}>
                <button
                  className={`w-9 h-9 flex items-center justify-center shrink-0 ${showSearch ? 'text-accent' : 'text-text-muted'}`}
                  onClick={() => setShowSearch(!showSearch)}
                ><Search size={15} /></button>
                {showSearch && (
                  <input
                    autoFocus
                    placeholder="搜索"
                    className="flex-1 bg-transparent border-none outline-none text-xs pr-3"
                    style={{ color: "var(--text-primary)", caretColor: "#fff" }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-full transition-colors border border-glass-border/10 bg-glass-bg/6 backdrop-blur-[24px] text-text-secondary"
                  onClick={() => setShowSort(!showSort)}
                ><ArrowUpDown size={13} /><span className="hidden sm:inline">{SORT_OPTIONS.find(o=>o.value===sortMode)?.label}</span></button>
                {showSort && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                    <div className="absolute right-0 mt-1.5 min-w-[150px] z-20 p-[4px] backdrop-blur-[80px] saturate-140 border border-glass-border/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                      style={{clipPath:"url(#sq-md)", background:"var(--glass-bg)"}}>
                      {SORT_OPTIONS.map((opt) => (
                        <button key={opt.value}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[12px] transition-colors min-h-[36px] ${
                            sortMode === opt.value ? 'text-accent bg-accent-subtle' : 'text-text-secondary bg-transparent'
                          }`}
                          onClick={() => { setSortMode(opt.value); setShowSort(false); }}
                        ><span>{opt.label}</span>{sortMode===opt.value&&<span className="text-accent">✓</span>}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Login */}
              <a href="https://stat.357561.xyz/admin"
                className="flex items-center gap-1 h-9 px-3 text-xs font-medium rounded-full transition-colors border border-glass-border/10 bg-glass-bg/6 backdrop-blur-[24px] text-text-secondary"
              ><LogIn size={13} /><span className="hidden sm:inline">登录</span></a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div id="list-view" style={{ flex: 1 }}>
        <main className="container" style={{ paddingTop: "1.25rem", paddingBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {/* Stats Bar */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}><StatCard icon={<Clock size={22} />} label="当前时间" value={time} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}><StatCard icon={<Gauge size={22} />} label="在线服务器"
              value={<>{online}<span className="mx-1" style={{color:"var(--text-muted)"}}>/</span>{total}</>}
              sub={regions.length > 0 ? `${regions.length} 地区` : undefined} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}><StatCard icon={<ArrowUpDown size={22} />} label="流量 / 速率"
              value={<div className="flex items-center gap-2 text-xs"><span style={{color:"var(--accent)"}}>↑ {bytes(netOut)}/s</span><span style={{color:"var(--accent-2)"}}>↓ {bytes(netIn)}/s</span></div>}
              sub={<><span>{bytes(totalTx)}</span> / <span>{bytes(totalRx)}</span></>} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}><StatCard icon={<DollarSign size={22} />} label="总价值 / 剩余"
              value={<><span style={{color:"var(--accent)"}}>¥{totalCny.toFixed(2)}</span><div className="text-xs" style={{color:"var(--text-secondary)"}}>¥{remainCny.toFixed(2)}</div></>} /></motion.div>
          </motion.div>

          {/* Region Filters */}
          {regions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-[3px_6px] rounded-full w-fit bg-glass-bg/6 backdrop-blur-[24px] border border-glass-border/10">
              <FilterChip label="全部" active={filterRegion === null} onClick={() => setFilterRegion(null)} />
              {regions.map(([r]) => {
                const fc = flagEmoji(r);
                return (
                  <FilterChip key={r}
                    label={<>{fc && <img src={`https://flagcdn.com/${fc}.svg`} alt={r} className="w-4 h-3 object-cover rounded inline" loading="lazy" />}{fc?.toUpperCase() || r}</>}
                    active={filterRegion === r}
                    onClick={() => setFilterRegion(filterRegion === r ? null : r)} />
                );
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-20 text-text-muted">
              <div className="w-7 h-7 border-2 rounded-full animate-spin border-glass-border/10 border-t-accent" />
              <span>连接后端中…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-text-muted"><p>暂无节点</p></div>
          )}

          {/* Grid View */}
          {!loading && viewMode === "grid" && filtered.length > 0 && (
            <div className="grid gap-4" style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}>
              {filtered.map((node, i) => (
                <a key={node.uuid} href={`./detail?uuid=${node.uuid}`}>
                  <NodeCard node={node} index={i} />
                </a>
              ))}
            </div>
          )}

          {/* Table View */}
          {!loading && viewMode === "table" && filtered.length > 0 && (
            <div className="flex flex-col gap-3">
              {filtered.map((n) => (
                <a key={n.uuid} href={`./detail?uuid=${n.uuid}`}>
                  <div className="flex items-center gap-4 px-5 py-3 transition-all duration-300 hover:translate-y-[-2px] bg-glass-bg/6 backdrop-blur-[60px] saturate-120 border border-glass-border/10 shadow-[0_0_0_1px_rgba(45,158,107,0.04)_inset_0_1px_0_rgba(255,255,255,0.03)]"
                    style={{clipPath:"url(#sq-lg)"}}>
                    <div className="flex items-center gap-2 w-[110px] shrink-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${n.online ? "shadow-[0_0_5px_rgba(16,185,129,0.35)]" : ""}`}
                        style={{background: n.online ? "var(--accent)" : "var(--danger)"}} />
                      <span className="text-xs truncate text-text-primary">{n.name || n.uuid}</span>
                    </div>
                    <div className="w-px h-6 shrink-0 bg-glass-border/10" />
                    <div className="flex flex-1 gap-6 text-xs font-mono text-text-secondary">
                      <span>CPU {n.cpu_usage.toFixed(1)}%</span>
                      <span>MEM {n.memory_usage.toFixed(1)}%</span>
                      <span>DSK {n.disk_usage.toFixed(1)}%</span>
                      <span>↓ {bytes(n.network_in||0)}/s</span>
                      <span>↑ {bytes(n.network_out||0)}/s</span>
                      <span>{uptime(n.uptime_val)}</span>
                      <span>{n.expired_at ? new Date(n.expired_at).toLocaleDateString("zh-CN") : "-"}</span>
                      <span className="text-accent">{priceTag(n.price, n.currency)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="py-4 border-t border-glass-border/10 mt-6">
        <div className="container grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs text-text-muted">
          <span className="font-semibold">银河探针</span>
          <span className="font-mono">🛰️ 本站在线运行中 🌌</span>
          <a href="https://github.com/komari-monitor/komari" target="_blank" rel="noreferrer"
            className="justify-self-end hover:underline text-text-muted">Powered by Komari</a>
        </div>
      </footer>

      {/* Back to Top */}
      <button id="back-to-top"
        className="fixed bottom-6 right-6 z-20 w-[38px] h-[38px] flex items-center justify-center rounded-full transition-all duration-300 bg-glass-raised/10 backdrop-blur-[24px] border border-glass-border/10 text-text-secondary"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      ><ArrowUp size={15} /></button>
    </>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-[14px] transition-all duration-250 rounded-[12px] bg-glass-bg/6 backdrop-blur-[12px] border border-glass-border/10">
      <span className="text-text-muted shrink-0 transition-colors duration-300">{icon}</span>
      <div>
        <div className="font-medium mb-0.5 text-[11px] text-text-muted tracking-[0.02em]">{label}</div>
        <div className="font-bold font-mono text-[16px] text-text-primary tracking-[-0.01em]">{value}</div>
        {sub && <div className="font-mono mt-0.5 text-[12px] text-text-secondary">{sub}</div>}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 h-[30px] text-[13px] font-medium rounded-[12px] transition-colors cursor-pointer select-none border-none ${
        active ? "bg-accent-subtle text-accent" : "bg-transparent text-text-muted"
      }`}
    >{label}</button>
  );
}

// This is needed to support the dashboard page with multiple exports
export default function Dashboard() {
  return <PageContent />;
}
