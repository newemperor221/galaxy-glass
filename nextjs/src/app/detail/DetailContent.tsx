"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { NodeData, RecentDataPoint } from "@/lib/api";
import { fetchSiteInfo, fetchNodes, fetchRecentData } from "@/lib/api";
import { bytes, uptime, age, metricColorClass } from "@/lib/utils";
import LineChart from "@/components/LineChart";

export default function DetailContent() {
  const searchParams = useSearchParams();
  const uuid = searchParams.get("uuid");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [node, setNode] = useState<NodeData | null>(null);
  const [recent, setRecent] = useState<RecentDataPoint[]>([]);
  const [nodeName, setNodeName] = useState("加载中…");
  const [nodeMeta, setNodeMeta] = useState("");

  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cpuPts, setCpuPts] = useState<number[]>([]);
  const [memPts, setMemPts] = useState<number[]>([]);
  const [upPts, setUpPts] = useState<number[]>([]);
  const [downPts, setDownPts] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState<string>("");
  const [timeEnd, setTimeEnd] = useState<string>("");

  const glassBox = "rgba(6,12,26,0.75)";
  const glassBlur = "blur(24px) saturate(180%)";

  useEffect(() => {
    if (!uuid) {
      setError("缺少节点 UUID 参数");
      setLoading(false);
      return;
    }

    const poster = posterRef.current;
    const video = videoRef.current;
    if (poster && video) {
      poster.src = "https://img.357561.xyz/image-wallpaper2.png";
      video.src = "https://img.357561.xyz/wallpaper1.mp4";
      video.play().then(() => { video.style.opacity = "1"; poster.style.opacity = "0"; }).catch(() => { poster.style.opacity = "1"; });
    }

    Promise.all([fetchSiteInfo(), fetchNodes(), fetchRecentData(uuid)])
      .then(([siteInfo, nodeList, recentData]) => {
        const n = nodeList.find((nd: NodeData) => nd.uuid === uuid);
        if (!n) { setError("未找到该节点"); setLoading(false); return; }
        setNode(n);
        setNodeName(n.name || n.uuid);
        const region = n.region || "";
        const virt = n.virtualization || "";
        const os = (n.os || "").split(" ")[0];
        setNodeMeta([region, virt, os].filter(Boolean).join(" · "));

        const pts = [...recentData].reverse();
        setCpuPts(pts.map((r) => r.cpu?.usage || 0));
        setMemPts(pts.map((r) => { const t = r.ram?.total || n.mem_total || 1; const u = r.ram?.used || 0; return t > 0 ? (u / t) * 100 : 0; }));
        setUpPts(pts.map((r) => r.network?.up || 0));
        setDownPts(pts.map((r) => r.network?.down || 0));
        if (pts.length > 0) {
          const fmt = (d: string) => new Date(d).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
          setTimeStart(fmt(pts[0].updated_at!));
          setTimeEnd(fmt(pts[pts.length - 1].updated_at!));
        }
        setLoading(false);
      })
      .catch((err) => { setError("加载失败: " + err.message); setLoading(false); });
  }, [uuid]);

  if (!uuid) {
    return <div className="h-screen flex items-center justify-center"><div style={{color:"rgba(255,255,255,0.3)"}}>缺少参数，正在返回…</div></div>;
  }

  const latest = recent[0] || {};
  const cpu = latest.cpu?.usage || 0;
  const memPct = node && node.mem_total && node.mem_total > 0 ? ((latest.ram?.used || 0) / node.mem_total) * 100 : 0;
  const diskPct = node && node.disk_total && node.disk_total > 0 ? ((latest.disk?.used || 0) / node.disk_total) * 100 : 0;
  const netUp = latest.network?.up || 0;
  const netDown = latest.network?.down || 0;

  const cpuCur = cpuPts.length ? cpuPts[cpuPts.length - 1].toFixed(1) + "%" : "—";
  const memCur = memPts.length ? memPts[memPts.length - 1].toFixed(1) + "%" : "—";
  const netCur = upPts.length ? "↑ " + bytes(upPts[upPts.length - 1]) + "/s · ↓ " + bytes(downPts[downPts.length - 1]) + "/s" : "—";

  const cardStyle = (p: string, r: number) => ({
    borderRadius: r,
    padding: p,
    background: glassBox,
    backdropFilter: glassBlur,
    WebkitBackdropFilter: glassBlur,
    boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  }) as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0" style={{background:"#040814"}}>
        <img ref={posterRef} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0"/>
        <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0"/>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-20" style={{backdropFilter:glassBlur,WebkitBackdropFilter:glassBlur,background:"rgba(4,8,20,0.6)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div className="max-w-[1124px] mx-auto px-6 py-3 flex items-center gap-3">
          <button onClick={() => (window.location.href = "./")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs transition-all sq-sm"
            style={{borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:glassBox,backdropFilter:"blur(16px)",color:"rgba(255,255,255,0.5)"}}>
            <ArrowLeft size={14}/>返回
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{color:"rgba(255,255,255,0.85)"}}>{nodeName}</div>
            <div className="text-xs truncate" style={{color:"rgba(255,255,255,0.30)"}}>{nodeMeta}</div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1124px] mx-auto px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20" style={{color:"rgba(255,255,255,0.25)"}}>
            <div className="w-8 h-8 rounded-full animate-spin" style={{border:"2px solid rgba(255,255,255,0.06)",borderTopColor:"#10b981"}}/>
            <span>加载节点数据…</span>
          </div>
        )}

        {error && <div className="text-center py-20" style={{color:"#f43f5e"}}>{error}</div>}

        {!loading && !error && node && (
          <div id="detail-content" className="grid grid-cols-[360px_1fr] gap-4 items-start max-lg:grid-cols-1">
            {/* Left */}
            <div className="flex flex-col gap-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-3 max-sm:grid-cols-2">
                {[
                  {label:"CPU",value:cpu.toFixed(1)+"%",bar:cpu,color:metricColorClass(cpu)},
                  {label:"内存",value:memPct.toFixed(1)+"%",bar:memPct,color:metricColorClass(memPct)},
                  {label:"磁盘",value:diskPct.toFixed(1)+"%",bar:diskPct,color:metricColorClass(diskPct)},
                  {label:"下行",value:bytes(netDown)+"/s"},
                  {label:"上行",value:bytes(netUp)+"/s"},
                  {label:"在线时长",value:uptime(latest.uptime||0)},
                ].map((m,i)=>(
                  <MetricCard key={i} label={m.label} value={m.value} bar={m.bar} color={m.color}/>
                ))}
              </div>

              {/* System Info */}
              <div className="overflow-hidden sq-card" style={cardStyle("18px 20px", 16)}>
                {(()=>{
                  const cpuCores=node.cpu_cores||"-";
                  const load1=latest.load?.load1??latest.load1??null;
                  const load5=latest.load?.load5??latest.load5??null;
                  const load15=latest.load?.load15??latest.load15??null;
                  const trafficLimit=node.traffic_limit||0;
                  const process=latest.process||"-";
                  const tcp=latest.connections?.tcp||"-";
                  const swapTotal=node.swap_total||0;

                  const rows:{lbl:string;val:string;isLoad?:boolean;loadVals?:number[];cpuCoresN?:number}[]=[
                    {lbl:"CPU 型号",val:node.cpu_name||"-"},
                    {lbl:"架构",val:node.arch||"-"},
                    {lbl:"虚拟化",val:node.virtualization||"-"},
                    {lbl:"操作系统",val:(node.os||"-").split(" ")[0]},
                    {lbl:"内核版本",val:node.kernel_version||"-"},
                    {lbl:"GPU",val:node.gpu_name&&node.gpu_name!=="None"?node.gpu_name:"-"},
                    {lbl:"内存总量",val:bytes(node.mem_total||0)},
                    {lbl:"Swap 总量",val:swapTotal>0?bytes(swapTotal):"无"},
                    {lbl:"磁盘总量",val:bytes(node.disk_total||0)},
                    {lbl:"流量限额",val:trafficLimit>0?bytes(trafficLimit):"无"},
                    {lbl:"到期时间",val:node.expired_at?new Date(node.expired_at).toLocaleDateString("zh-CN"):"-"},
                    {lbl:"在线时长",val:uptime(latest.uptime||0)},
                  ];
                  if(load1!==null) rows.push({lbl:"负载均值",val:`${load1} / ${load5} / ${load15}`,isLoad:true,loadVals:[load1??0,load5??0,load15??0],cpuCoresN:node.cpu_cores||1});
                  rows.push({lbl:"进程数",val:String(process)},{lbl:"TCP 连接",val:String(tcp)},{lbl:"最后更新",val:age(latest.updated_at)});

                  return rows.map((r,i)=>(
                    <div key={i} className="flex justify-between items-center py-[8px] px-[2px] relative">
                      {i<rows.length-1 && (
                        <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{background:"linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.04) 10%, rgba(255,255,255,0.04) 90%, transparent 96%)"}}/>
                      )}
                      <span className="text-[11px] shrink-0" style={{color:"rgba(255,255,255,0.30)"}}>{r.lbl}</span>
                      {r.isLoad&&r.loadVals?(
                        <div className="flex gap-2 flex-wrap justify-end">
                          {r.loadVals.map((v,j)=>{
                            const cls=v>=(r.cpuCoresN||1)*2 ? "#f43f5e" : v>=(r.cpuCoresN||1) ? "#f59e0b" : "rgba(255,255,255,0.35)";
                            return <span key={j} className="text-[10px] font-mono px-2 py-[3px] rounded-md" style={{background:cls==="#f43f5e"?"rgba(244,63,94,0.10)":cls==="#f59e0b"?"rgba(245,158,11,0.10)":"rgba(255,255,255,0.04)",border:`1px solid ${cls}25`,color:cls}}>{["1m","5m","15m"][j]} {v.toFixed(1)}</span>;
                          })}
                        </div>
                      ):(
                        <span className="text-xs font-mono text-right max-w-[60%] truncate" style={{color:"rgba(255,255,255,0.70)"}}>{r.val}</span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Right - Charts */}
            <div className="flex flex-col gap-5">
              {[
                {title:"CPU 占用率",pts:cpuPts,color:"#10b981",badge:cpuCur,badgeColor:"#10b981",unit:"%"},
                {title:"内存占用率",pts:memPts,color:"#6366f1",badge:memCur,badgeColor:"#6366f1",unit:"%"},
                {title:"网络速率",pts:downPts,pts2:upPts,color:"#10b981",color2:"#f59e0b",badge:netCur,badgeColor:"rgba(255,255,255,0.5)",unit:"/s"},
              ].map((chart,i)=>(
                <div key={i} className="overflow-hidden sq-card" style={cardStyle("22px 24px", 16)}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{color:"rgba(255,255,255,0.40)"}}>{chart.title}</span>
                    <span className="text-[10px] font-mono px-3 py-[3px] rounded-md" style={{borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:chart.badgeColor}}>{chart.badge}</span>
                  </div>
                  {chart.pts2 !== undefined ? (
                    <LineChart data={chart.pts} data2={chart.pts2} color={chart.color} color2={chart.color2} showY unit={chart.unit} timeStart={timeStart} timeEnd={timeEnd}/>
                  ) : (
                    <LineChart data={chart.pts} color={chart.color} showY unit={chart.unit} timeStart={timeStart} timeEnd={timeEnd}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({label,value,bar,color}:{label:string;value:string;bar?:number;color?:string}) {
  const barColor = color==="high" ? "#f43f5e" : color==="medium" ? "#f59e0b" : "#10b981";
  return (
    <div className="p-[16px_18px] flex flex-col gap-[10px] overflow-hidden sq-card group" style={{
      borderRadius:14,
      background:"rgba(6,12,26,0.75)",
      backdropFilter:"blur(24px) saturate(180%)",
      WebkitBackdropFilter:"blur(24px) saturate(180%)",
      boxShadow:"0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
      border:"1px solid rgba(255,255,255,0.06)",
      transition:"box-shadow 0.3s ease",
    }}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{color:"rgba(255,255,255,0.30)"}}>{label}</span>
      <span className="text-[22px] font-bold font-mono leading-none" style={{color:"rgba(255,255,255,0.90)"}}>{value}</span>
      {bar!==undefined && (
        <div className="h-[3px] overflow-hidden" style={{borderRadius:9999,background:"rgba(255,255,255,0.04)"}}>
          <div className="h-full rounded-full" style={{width:`${Math.min(100,bar)}%`,background:barColor,boxShadow:barColor==="#10b981"?"0 0 6px rgba(16,185,129,0.3)":barColor==="#f59e0b"?"0 0 6px rgba(245,158,11,0.3)":"0 0 6px rgba(244,63,94,0.3)"}}/>
        </div>
      )}
    </div>
  );
}
