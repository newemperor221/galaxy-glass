"use client";

import { useState, useEffect } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArrowUpDown, LogIn, ArrowUp, Clock, DollarSign, Activity, Search, LayoutGrid, List } from "lucide-react";
import NodeCard from "@/components/NodeCard";
import { fetchSiteInfo, fetchNodes, fetchRecentData, mergeNodeData, getExchangeRate } from "@/lib/api";
import { bytes, uptime, flagEmoji, priceTag } from "@/lib/utils";
import type { MergedNode, NodeData } from "@/lib/api";

type SortMode = "default" | "name" | "region" | "cpu" | "mem" | "disk" | "netIn" | "netOut" | "uptime";
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "默认" }, { value: "name", label: "名称" }, { value: "region", label: "地区" },
  { value: "cpu", label: "CPU" }, { value: "mem", label: "内存" }, { value: "disk", label: "磁盘" },
  { value: "netIn", label: "下行" }, { value: "netOut", label: "上行" }, { value: "uptime", label: "在线" },
];

// ── Outer shell: QueryClientProvider context first, then render children ──
export default function DashboardContent() {
  const [queryClient] = useState(() => new QueryClient({defaultOptions:{queries:{retry:2,staleTime:15000,refetchOnWindowFocus:true}}}));

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardInner />
    </QueryClientProvider>
  );
}

// ── Inner: useQuery calls run safely inside QueryClientProvider context ──
function DashboardInner() {
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  useEffect(() => { getExchangeRate().then(setExchangeRate); }, []);
  useEffect(() => { const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-CN", { hour12: false })), 1000); return () => clearInterval(t); }, []);

  // ── TanStack Query ── (safe: QueryClientProvider context is up)
  const { data: rawNodes = [], isLoading, isError } = useQuery({
    queryKey: ["nodes"],
    queryFn: async () => {
      const nodes = await fetchNodes();
      const merged = await Promise.all(
        nodes.map(async (n: NodeData) => {
          const recent = await fetchRecentData(n.uuid);
          return mergeNodeData(n, recent);
        })
      );
      return merged;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: siteInfo } = useQuery({
    queryKey: ["siteInfo"],
    queryFn: fetchSiteInfo,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
  const siteName = siteInfo?.sitename || "银河探针";

  // Filter & sort
  const filtered = (() => {
    let arr = [...rawNodes];
    arr.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      let cmp = 0;
      switch (sortMode) {
        case "cpu": cmp = (b.cpu_usage||0) - (a.cpu_usage||0); break;
        case "mem": cmp = (b.memory_usage||0) - (a.memory_usage||0); break;
        case "disk": cmp = (b.disk_usage||0) - (a.disk_usage||0); break;
        case "netIn": cmp = (b.network_in||0) - (a.network_in||0); break;
        case "netOut": cmp = (b.network_out||0) - (a.network_out||0); break;
        case "uptime": cmp = (b.uptime_val||0) - (a.uptime_val||0); break;
        case "name": cmp = (a.name||a.uuid).localeCompare(b.name||b.uuid); break;
        case "region": cmp = (a.country_code||"").localeCompare(b.country_code||""); break;
      }
      return cmp || (a.name||a.uuid).localeCompare(b.name||b.uuid);
    });
    if (filterRegion) arr = arr.filter(n => n.region === filterRegion);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(n => [n.uuid,n.name,n.os,n.virtualization,n.cpu_name,...(n.tags_list||[])].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return arr;
  })();

  // Stats
  const online = rawNodes.filter(n => n.online).length;
  const total = rawNodes.length;
  const netIn = rawNodes.reduce((s,n) => s+(n.network_in||0), 0);
  const netOut = rawNodes.reduce((s,n) => s+(n.network_out||0), 0);
  const totalRx = rawNodes.reduce((s,n) => s+(n.network_total_received||0), 0);
  const totalTx = rawNodes.reduce((s,n) => s+(n.network_total_transmitted||0), 0);
  let totalCny = 0, remainCny = 0;
  rawNodes.forEach(n => {
    if (n.price) {
      const p = parseFloat(String(n.price));
      const pc = n.currency === "¥" ? p : p * exchangeRate;
      totalCny += pc;
      const bc = n.billing_cycle || 0;
      if (n.expired_at && bc > 0) {
        const daysLeft = Math.ceil((new Date(n.expired_at).getTime() - Date.now()) / 86400000);
        if (daysLeft > 0) remainCny += (pc / bc) * daysLeft;
      }
    }
  });

  const regionMap = new Map<string, number>();
  rawNodes.forEach(n => { const r = n.region||""; if (r) regionMap.set(r, (regionMap.get(r)||0) + 1); });
  const regions = [...regionMap.entries()].sort((a,b) => b[1]-a[1]);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      <nav className="sticky top-0 z-20" style={{background:"transparent"}}>
        <div className="container">
          <div className="flex items-center justify-between gap-2" style={{padding:"0.65rem 0",height:48}}>
            <a href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
              <div style={{width:24,height:24,borderRadius:6,background:"var(--accent-gradient)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>P</div>
              <span style={{fontSize:17,fontWeight:700,background:"var(--accent-gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{siteName}</span>
            </a>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <button className="flex items-center justify-center w-8 h-8 transition-all" style={{borderRadius:"var(--radius-full)",border:"1px solid var(--glass-border)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",color:viewMode==="table"?"var(--accent)":"var(--text-muted)"}} onClick={()=>setViewMode(viewMode==="table"?"grid":"table")} title={viewMode==="table"?"切换网格":"切换表格"}>
                {viewMode==="table" ? <List size={14}/> : <LayoutGrid size={14}/>}
              </button>
              {/* Search */}
              <div className="flex items-center overflow-hidden transition-all duration-200" style={{maxWidth:showSearch?200:36,height:36,border:"1px solid var(--glass-border)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:"var(--radius-full)"}}>
                <button className="w-9 h-9 flex items-center justify-center shrink-0" style={{color:showSearch?"var(--accent)":"var(--text-muted)"}} onClick={()=>setShowSearch(!showSearch)}><Search size={14}/></button>
                {showSearch && <input autoFocus placeholder="搜索节点…" className="flex-1 bg-transparent border-none outline-none text-xs pr-3" style={{color:"var(--text-primary)",caretColor:"var(--accent)",minWidth:0}} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>}
              </div>
              {/* Sort */}
              <div className="relative">
                <button className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-all" style={{borderRadius:"var(--radius-full)",border:"1px solid var(--glass-border)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",color:"var(--text-secondary)",minHeight:36}} onClick={()=>setShowSort(!showSort)}><ArrowUpDown size={13}/><span className="hidden sm:inline">{SORT_OPTIONS.find(o=>o.value===sortMode)?.label}</span></button>
                {showSort && <>
                  <div className="fixed inset-0 z-10" onClick={()=>setShowSort(false)}/>
                  <div className="absolute right-0 mt-1.5 min-w-[150px] z-20 p-1" style={{borderRadius:"var(--radius-md)",border:"1px solid var(--glass-border)",background:"var(--bg-glass)",backdropFilter:"blur(20px) saturate(140%)",WebkitBackdropFilter:"blur(20px) saturate(140%)",boxShadow:"0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"}}>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.value} className="w-full flex items-center justify-between px-3 py-2 text-xs transition-all" style={{borderRadius:"var(--radius-sm)",background:sortMode===opt.value?"rgba(45,158,107,0.10)":"transparent",color:sortMode===opt.value?"var(--accent)":"var(--text-secondary)",minHeight:36}} onClick={()=>{setSortMode(opt.value);setShowSort(false)}}>
                        <span>{opt.label}</span>{sortMode===opt.value&&<span style={{color:"var(--accent)"}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </>}
              </div>
              <a href="https://stat.357561.xyz/admin" className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-all" style={{borderRadius:"var(--radius-full)",border:"1px solid var(--glass-border)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",color:"var(--text-secondary)",minHeight:36}}><LogIn size={13}/><span className="hidden sm:inline">登录</span></a>
            </div>
          </div>
        </div>
      </nav>

      <div style={{flex:1}}>
        <main className="container" style={{paddingTop:"1rem",paddingBottom:"3rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>

          {/* Stats bar */}
          <div style={{display:"flex",alignItems:"center",gap:"var(--gap)"}}>
            <div className="card" style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:"var(--gap)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-md)",flex:1}}>
            <StatItem icon={<Clock size={15}/>} label="时间" value={time}/>
            <StatItem icon={<Activity size={15}/>} label="在线" value={<><span style={{color:"var(--accent)",fontWeight:600}}>{online}</span><span className="mx-1" style={{color:"var(--text-muted)"}}>/</span>{total}</>}/>
            <StatItem icon={<ArrowUpDown size={15}/>} label="实时流量" value={<span style={{fontSize:12}}><span style={{color:"#10b981"}}>↑{bytes(netOut)}/s</span> <span style={{color:"var(--text-muted)"}}>|</span> <span style={{color:"#6366f1"}}>↓{bytes(netIn)}/s</span></span>}/>
            <StatItem icon={<DollarSign size={15}/>} label="资产/剩余" value={<><span style={{color:"var(--accent)",fontWeight:600}}>¥{totalCny.toFixed(2)}</span><span className="ml-2 text-xs" style={{color:"var(--text-muted)"}}>¥{remainCny.toFixed(2)}</span></>}/>
          </div>
          </div>

          {/* Region filters */}
          {regions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-[3px_6px] w-fit" style={{borderRadius:"var(--radius-full)",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid var(--glass-border)"}}>
              <button onClick={()=>setFilterRegion(null)} className="inline-flex items-center px-3 h-[30px] text-xs font-medium transition-all cursor-pointer" style={{borderRadius:8,background:filterRegion===null?"rgba(45,158,107,0.10)":"transparent",color:filterRegion===null?"var(--accent)":"var(--text-muted)"}}>全部</button>
              {regions.map(([r])=>{const fc=flagEmoji(r);return <button key={r} onClick={()=>setFilterRegion(filterRegion===r?null:r)} className="inline-flex items-center gap-1 px-3 h-[30px] text-xs font-medium transition-all cursor-pointer" style={{borderRadius:8,background:filterRegion===r?"rgba(45,158,107,0.10)":"transparent",color:filterRegion===r?"var(--accent)":"var(--text-muted)"}}>{fc&&<img src={`https://flagcdn.com/${fc}.svg`} alt={r} className="w-4 h-3 object-cover rounded inline" loading="lazy"/>}{fc?.toUpperCase()||r}</button>})}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-16" style={{color:"var(--text-muted)"}}>
              <div className="w-6 h-6 rounded-full animate-spin" style={{border:"2px solid rgba(255,255,255,0.06)",borderTopColor:"var(--accent)"}}/>
              <span className="text-sm">加载中…</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && isError && (
            <div className="flex flex-col items-center gap-2 py-16" style={{color:"rgba(244,63,94,0.6)"}}>
              <span className="text-2xl">⚠️</span>
              <span className="text-sm">后端连接失败</span>
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length===0 && <div className="text-center py-16" style={{color:"var(--text-muted)"}}><p>暂无节点</p></div>}

          {/* Grid view */}
          {!isLoading && viewMode==="grid" && filtered.length>0 && (
            <div className="grid gap-3" style={{gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))"}}>
              {filtered.map((node,i) => <a key={node.uuid} href={`/detail?uuid=${node.uuid}`}><NodeCard node={node} index={i}/></a>)}
            </div>
          )}

          {/* Table view */}
          {!isLoading && viewMode==="table" && filtered.length>0 && (
            <div className="flex flex-col gap-1.5">
              {filtered.map(n => (
                <a key={n.uuid} href={`/detail?uuid=${n.uuid}`}>
                  <NodeRow node={n} />
                </a>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer style={{borderTop:"1px solid var(--glass-border)",marginTop:"auto"}}>
        <div className="container flex items-center justify-between py-4 text-xs" style={{color:"var(--text-muted)"}}>
          <span className="font-semibold" style={{background:"var(--accent-gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{siteName}</span>
          <span className="font-mono">🛰️ 运行中 🌌</span>
          <a href="https://github.com/komari-monitor/komari" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">Powered by Komari</a>
        </div>
      </footer>

      {/* Back to top */}
      <button className="fixed bottom-4 right-4 z-20 w-[38px] h-[38px] flex items-center justify-center transition-all hover:scale-105" style={{borderRadius:"50%",background:"var(--glass-strong)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--glass-border)",color:"var(--text-secondary)",boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}} onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><ArrowUp size={15}/></button>
    </div>
  );
}

function StatItem({icon,label,value}:{icon:React.ReactNode;label:string;value:React.ReactNode}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{color:"var(--text-muted)",flexShrink:0}}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] tracking-[0.02em]" style={{color:"var(--text-muted)",marginBottom:2}}>{label}</div>
        <div className="font-bold font-mono text-[16px] tracking-[-0.01em]" style={{color:"var(--text-primary)"}}>{value}</div>
      </div>
    </div>
  );
}

function Bar({pct,color}:{pct:number;color:string}) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-[6px] overflow-hidden" style={{borderRadius:"var(--radius-full)",background:"rgba(255,255,255,0.06)",width:60,minWidth:40}}>
      <div className="h-full" style={{width:`${w}%`,background:color,borderRadius:"var(--radius-full)",transition:"transform 0.4s ease",transformOrigin:"left"}}/>
    </div>
  );
}

function NodeRow({node}:{node:MergedNode}) {
  const cpu = node.cpu_usage || 0;
  const mem = node.memory_usage || 0;
  const disk = node.disk_usage || 0;
  const fc = flagEmoji(node.region);
  const barColor = (v:number, hi:string, mid:string, lo:string) => v>=90?hi: v>=70?mid: lo;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-all" style={{background:"var(--bg-glass)",backdropFilter:"blur(var(--blur-glass)) saturate(120%)",WebkitBackdropFilter:"blur(var(--blur-glass)) saturate(120%)",border:"1px solid var(--glass-border)",borderRadius:"var(--radius-md)",transition:"transform 0.2s ease, box-shadow 0.2s ease"}}>
      {/* Status dot */}
      <span className="w-2 h-2 rounded-full shrink-0" style={{background:node.online?"var(--accent)":"var(--danger)",boxShadow:node.online?"0 0 4px rgba(16,185,129,0.3)":"none"}}/>

      {/* Name + region flag */}
      <div className="flex items-center gap-1.5 min-w-0" style={{width:140}}>
        {fc && <img src={`https://flagcdn.com/${fc}.svg`} alt={node.region} className="w-4 h-3 object-cover rounded shrink-0" loading="lazy"/>}
        <span className="text-sm font-medium truncate" style={{color:"var(--text-primary)"}}>{node.name||node.uuid}</span>
      </div>

      {/* CPU */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono font-semibold w-[26px] text-right" style={{color:"var(--text-muted)"}}>CPU</span>
        <Bar pct={cpu} color={barColor(cpu,"#f43f5e","#f59e0b","#10b981")}/>
        <span className="text-[11px] font-mono w-[34px] tabular-nums" style={{color:"var(--text-secondary)"}}>{cpu.toFixed(1)}%</span>
      </div>

      {/* MEM */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono font-semibold w-[26px] text-right" style={{color:"var(--text-muted)"}}>MEM</span>
        <Bar pct={mem} color={barColor(mem,"#f43f5e","#f59e0b","#6366f1")}/>
        <span className="text-[11px] font-mono w-[34px] tabular-nums" style={{color:"var(--text-secondary)"}}>{mem.toFixed(1)}%</span>
      </div>

      {/* DSK */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono font-semibold w-[26px] text-right" style={{color:"var(--text-muted)"}}>DSK</span>
        <Bar pct={disk} color={barColor(disk,"#f43f5e","#f59e0b","#f59e0b")}/>
        <span className="text-[11px] font-mono w-[34px] tabular-nums" style={{color:"var(--text-secondary)"}}>{disk.toFixed(1)}%</span>
      </div>

      {/* Network */}
      <div className="flex items-center gap-2 ml-auto shrink-0 text-[11px] font-mono" style={{color:"var(--text-secondary)"}}>
        <span style={{color:"#10b981"}}>↑{bytes(node.network_out||0)}/s</span>
        <span style={{color:"#6366f1"}}>↓{bytes(node.network_in||0)}/s</span>
      </div>

      {/* Uptime */}
      <span className="text-[11px] font-mono shrink-0 w-[60px] text-right" style={{color:"var(--text-muted)"}}>{uptime(node.uptime_val)}</span>

      {/* Price */}
      {node.price && (
        <span className="text-[11px] font-mono font-semibold shrink-0 w-[56px] text-right" style={{color:"var(--accent)"}}>{priceTag(node.price, node.currency)}</span>
      )}
    </div>
  );
}
