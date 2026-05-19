"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ArrowUpDown, LogIn, ArrowUp, Clock, Gauge, DollarSign, Activity } from "lucide-react";
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

  const glassBox = "rgba(6,12,26,0.75)";
  const glassBlur = "blur(24px) saturate(180%)";

  return (
    <>
      {/* Navbar */}
      <nav className="sticky top-0 z-20" style={{ backdropFilter: glassBlur, WebkitBackdropFilter: glassBlur, background: "rgba(4,8,20,0.6)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="container">
          <div className="flex items-center justify-between gap-2" style={{ padding: "0.6rem 0", height: 48 }}>
            <a href="./" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
              <div style={{width:26,height:26,borderRadius:8,background:"linear-gradient(135deg,#10b981,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>G</div>
              <span style={{fontSize:17,fontWeight:700,background:"linear-gradient(135deg, #10b981, #6366f1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>{siteName}</span>
            </a>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center overflow-hidden transition-all duration-300 sq-sm"
                style={{maxWidth:showSearch?240:36,height:36,border:"1px solid rgba(255,255,255,0.08)",background:glassBox,backdropFilter:"blur(16px)",borderRadius:12}}>
                <button className="w-9 h-9 flex items-center justify-center shrink-0 transition-colors" style={{color:showSearch?"#10b981":"rgba(255,255,255,0.35)"}} onClick={()=>setShowSearch(!showSearch)}><Search size={14}/></button>
                {showSearch && (
                  <input autoFocus placeholder="搜索节点…" className="flex-1 bg-transparent border-none outline-none text-xs pr-3" style={{color:"#fff",caretColor:"#10b981",minWidth:0}} value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)}/>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-all sq-sm" style={{borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:glassBox,backdropFilter:"blur(16px)",color:"rgba(255,255,255,0.55)"}} onClick={()=>setShowSort(!showSort)}><ArrowUpDown size={13}/><span className="hidden sm:inline">{SORT_OPTIONS.find(o=>o.value===sortMode)?.label}</span></button>
                {showSort && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={()=>setShowSort(false)}/>
                    <div className="absolute right-0 mt-2 min-w-[160px] z-20 p-[6px]" style={{borderRadius:12,background:glassBox,backdropFilter:"blur(32px) saturate(180%)",WebkitBackdropFilter:"blur(32px) saturate(180%)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 12px 48px rgba(0,0,0,0.5)"}}>
                      {SORT_OPTIONS.map((opt)=>(
                        <button key={opt.value} className="w-full flex items-center justify-between px-3 py-[10px] text-xs min-h-[38px] transition-all sq-sm" style={{borderRadius:8,background:sortMode===opt.value?"rgba(16,185,129,0.08)":"transparent",color:sortMode===opt.value?"#10b981":"rgba(255,255,255,0.55)"}} onClick={()=>{setSortMode(opt.value);setShowSort(false)}}>
                          <span>{opt.label}</span>
                          {sortMode===opt.value&&<span style={{color:"#10b981"}}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Login */}
              <a href="https://stat.357561.xyz/admin" className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-all sq-sm" style={{borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:glassBox,backdropFilter:"blur(16px)",color:"rgba(255,255,255,0.55)"}}><LogIn size={13}/><span className="hidden sm:inline">登录</span></a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div id="list-view" style={{flex:1}}>
        <main className="container" style={{paddingTop:"1.5rem",paddingBottom:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {/* Stats Bar */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:false,margin:"-50px"}}
            transition={{duration:0.5,ease:[0.16,1,0.3,1],staggerChildren:0.08}}>
            <motion.div variants={{hidden:{opacity:0,y:16},visible:{opacity:1,y:0}}}><StatCard icon={<Clock size={20}/>} label="当前时间" value={time}/></motion.div>
            <motion.div variants={{hidden:{opacity:0,y:16},visible:{opacity:1,y:0}}}><StatCard icon={<Activity size={20}/>} label="在线率" value={<>{online}<span className="mx-1" style={{color:"rgba(255,255,255,0.25)"}}>/</span>{total}</>} sub={regions.length>0?`${regions.length} 地区`:undefined}/></motion.div>
            <motion.div variants={{hidden:{opacity:0,y:16},visible:{opacity:1,y:0}}}><StatCard icon={<ArrowUpDown size={20}/>} label="实时流量" value={<div className="flex items-center gap-3 text-xs"><span style={{color:"#10b981",fontWeight:600}}>↑ {bytes(netOut)}/s</span><span style={{color:"#6366f1",fontWeight:600}}>↓ {bytes(netIn)}/s</span></div>} sub={<><span style={{opacity:0.6}}>{bytes(totalTx)}</span> / <span style={{opacity:0.6}}>{bytes(totalRx)}</span></>}/></motion.div>
            <motion.div variants={{hidden:{opacity:0,y:16},visible:{opacity:1,y:0}}}><StatCard icon={<DollarSign size={20}/>} label="资产 / 剩余" value={<><span style={{color:"#10b981",fontWeight:600}}>¥{totalCny.toFixed(2)}</span><div className="text-xs" style={{color:"rgba(240,253,244,0.5)"}}>¥{remainCny.toFixed(2)}</div></>}/></motion.div>
          </motion.div>

          {/* Region Filters */}
          {regions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-[4px_6px] w-fit" style={{borderRadius:12,background:glassBox,backdropFilter:"blur(16px) saturate(180%)",WebkitBackdropFilter:"blur(16px) saturate(180%)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <FilterChip label="全部" active={filterRegion===null} onClick={()=>setFilterRegion(null)}/>
              {regions.map(([r])=>{
                const fc=flagEmoji(r);
                return <FilterChip key={r} label={<>{fc&&<img src={`https://flagcdn.com/${fc}.svg`} alt={r} className="w-4 h-3 object-cover rounded inline" loading="lazy"/>}{fc?.toUpperCase()||r}</>} active={filterRegion===r} onClick={()=>setFilterRegion(filterRegion===r?null:r)}/>;
              })}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-24" style={{color:"rgba(255,255,255,0.25)"}}>
              <div className="w-8 h-8 rounded-full animate-spin" style={{border:"2px solid rgba(255,255,255,0.06)",borderTopColor:"#10b981"}}/>
              <span className="text-sm">连接后端中…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length===0 && (
            <div className="text-center py-24" style={{color:"rgba(255,255,255,0.25)"}}><p>暂无节点</p></div>
          )}

          {/* Grid View */}
          {!loading && viewMode==="grid" && filtered.length>0 && (
            <div className="grid gap-4" style={{gridTemplateColumns:"repeat(auto-fill, minmax(290px, 1fr))"}}>
              {filtered.map((node,i)=>(
                <a key={node.uuid} href={`./detail?uuid=${node.uuid}`}><NodeCard node={node} index={i}/></a>
              ))}
            </div>
          )}

          {/* Table View */}
          {!loading && viewMode==="table" && filtered.length>0 && (
            <div className="flex flex-col gap-3">
              {filtered.map((n)=>(
                <a key={n.uuid} href={`./detail?uuid=${n.uuid}`}>
                  <div className="flex items-center gap-4 px-5 py-3 transition-all duration-300 hover:translate-y-[-2px] sq-sm"
                    style={{borderRadius:12,background:glassBox,backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"}}>
                    <div className="flex items-center gap-2 w-[110px] shrink-0">
                      <span className={`w-2 h-2 rounded-full shrink-0`} style={{background:n.online?"#10b981":"#f43f5e",boxShadow:n.online?"0 0 6px rgba(16,185,129,0.35)":"none"}}/>
                      <span className="text-xs truncate" style={{color:"rgba(255,255,255,0.85)"}}>{n.name||n.uuid}</span>
                    </div>
                    <div className="w-px h-6 shrink-0" style={{background:"rgba(255,255,255,0.06)"}}/>
                    <div className="flex flex-1 gap-6 text-xs font-mono" style={{color:"rgba(255,255,255,0.45)"}}>
                      <span>CPU {n.cpu_usage.toFixed(1)}%</span>
                      <span>MEM {n.memory_usage.toFixed(1)}%</span>
                      <span>DSK {n.disk_usage.toFixed(1)}%</span>
                      <span>↓ {bytes(n.network_in||0)}/s</span>
                      <span>↑ {bytes(n.network_out||0)}/s</span>
                      <span>{uptime(n.uptime_val)}</span>
                      <span>{n.expired_at?new Date(n.expired_at).toLocaleDateString("zh-CN"):"-"}</span>
                      <span style={{color:"#10b981"}}>{priceTag(n.price,n.currency)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.04)",marginTop:"1.5rem"}}>
        <div className="container grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-4 text-xs" style={{color:"rgba(255,255,255,0.25)"}}>
          <span className="font-semibold" style={{background:"linear-gradient(135deg,#10b981,#6366f1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>银河探针</span>
          <span className="font-mono">🛰️ 运行中 🌌</span>
          <a href="https://github.com/komari-monitor/komari" target="_blank" rel="noreferrer" className="justify-self-end hover:opacity-80 transition-opacity">Powered by Komari</a>
        </div>
      </footer>

      {/* Back to Top */}
      <button id="back-to-top" className="fixed bottom-6 right-6 z-20 w-[40px] h-[40px] flex items-center justify-center transition-all duration-300 sq-sm hover:scale-105"
        style={{borderRadius:12,background:glassBox,backdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.45)",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}
        onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><ArrowUp size={16}/></button>
    </>
  );
}

function StatCard({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:React.ReactNode;sub?:React.ReactNode}) {
  const glassBox="rgba(6,12,26,0.75)";
  return (
    <motion.div variants={{hidden:{opacity:0,y:16},visible:{opacity:1,y:0}}}
      className="flex items-center gap-3 overflow-hidden sq-card group"
      style={{padding:"16px 18px",borderRadius:16,background:glassBox,backdropFilter:"blur(24px) saturate(180%)",WebkitBackdropFilter:"blur(24px) saturate(180%)",border:"1px solid rgba(255,255,255,0.06)",boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",minHeight:76,transition:"box-shadow 0.3s ease"}}>
      <span className="shrink-0 self-start mt-[3px] transition-colors duration-300 group-hover:text-[#10b981]" style={{color:"rgba(255,255,255,0.25)"}}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium mb-[3px] text-[11px] tracking-[0.04em]" style={{color:"rgba(255,255,255,0.35)"}}>{label}</div>
        <div className="font-bold font-mono text-[16px] tracking-[-0.01em]" style={{color:"rgba(255,255,255,0.90)"}}>{value}</div>
        {sub&&<div className="font-mono mt-[3px] text-[12px]" style={{color:"rgba(255,255,255,0.35)"}}>{sub}</div>}
      </div>
    </motion.div>
  );
}

function FilterChip({label,active,onClick}:{label:React.ReactNode;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 h-[30px] text-[13px] font-medium transition-all cursor-pointer select-none border-none overflow-hidden sq-chip ${
        active ? "" : ""
      }`}
      style={{
        borderRadius: 8,
        background: active ? "rgba(16,185,129,0.08)" : "transparent",
        border: active ? "1px solid rgba(16,185,129,0.15)" : "1px solid transparent",
        color: active ? "#10b981" : "rgba(255,255,255,0.35)",
        lineHeight: "1.3",
      }}
    >{label}</button>
  );
}

export default function Dashboard() {
  return <PageContent />;
}
