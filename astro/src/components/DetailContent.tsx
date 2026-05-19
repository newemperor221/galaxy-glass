"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchNodes, fetchRecentData } from "@/lib/api";
import { bytes, uptime, age, metricColorClass } from "@/lib/utils";
import UPlotChart from "@/components/UPlotChart";

export default function DetailContent({ uuid: initialUuid }: { uuid?: string }) {
  const [uuid, setUuid] = useState<string | null>(initialUuid || null);
  const [queryClient] = useState(() => new QueryClient({defaultOptions:{queries:{retry:2,staleTime:15000,refetchOnWindowFocus:true}}}));

  useEffect(() => {
    if (!uuid) {
      const params = new URLSearchParams(window.location.search);
      setUuid(params.get("uuid"));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DetailInner uuid={uuid} />
    </QueryClientProvider>
  );
}

function DetailInner({ uuid }: { uuid: string | null }) {

  // ── Fetch node ──
  const { data: node, isLoading: nodeLoading, error: nodeError } = useQuery({
    queryKey: ["node", uuid],
    queryFn: async () => {
      if (!uuid) return null;
      const nodes = await fetchNodes();
      return nodes.find(n => n.uuid === uuid) || null;
    },
    enabled: !!uuid,
    staleTime: 30_000,
  });

  // ── Fetch recent data ──
  const { data: recentData = [] } = useQuery({
    queryKey: ["recent", uuid],
    queryFn: async () => {
      if (!uuid) return [];
      return await fetchRecentData(uuid);
    },
    enabled: !!uuid,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  // Chart data
  const pts = [...recentData].reverse();
  const timestamps = pts.map(r => r.updated_at ? new Date(r.updated_at).getTime() / 1000 : 0);
  const cpuPts = pts.map(r => r.cpu?.usage || 0);
  const memPts = pts.map(r => { const t = r.ram?.total || node?.mem_total || 1; return t > 0 ? ((r.ram?.used||0) / t) * 100 : 0; });
  const upPts = pts.map(r => r.network?.up || 0);
  const downPts = pts.map(r => r.network?.down || 0);

  const latest = recentData[0] || {};
  const cpu = latest.cpu?.usage || 0;
  const memPct = node && node.mem_total ? ((latest.ram?.used||0) / node.mem_total) * 100 : 0;
  const diskPct = node && node.disk_total ? ((latest.disk?.used||0) / node.disk_total) * 100 : 0;
  const netUp = latest.network?.up || 0;
  const netDown = latest.network?.down || 0;

  const cpuCur = cpuPts.length ? cpuPts[cpuPts.length-1].toFixed(1)+"%" : "—";
  const memCur = memPts.length ? memPts[memPts.length-1].toFixed(1)+"%" : "—";
  const netCur = upPts.length ? "↑ "+bytes(upPts[upPts.length-1])+"/s · ↓ "+bytes(downPts[downPts.length-1])+"/s" : "—";

  if (!uuid) {
    return <div className="h-screen flex items-center justify-center" style={{color:"var(--text-muted)"}}>缺少参数</div>;
  }

  const nodeName = node?.name || node?.uuid || "加载中…";
  const region = node?.region||"";
  const virt = node?.virtualization||"";
  const osName = (node?.os||"").split(" ")[0];
  const nodeMeta = [region, virt, osName].filter(Boolean).join(" · ");

  const sysRows: {lbl:string;val:string;isLoad?:boolean;loadVals?:number[];cpuCoresN?:number}[] = [];
  if (node) {
    const load1 = latest.load?.load1 ?? latest.load1 ?? null;
    const load5 = latest.load?.load5 ?? latest.load5 ?? null;
    const load15 = latest.load?.load15 ?? latest.load15 ?? null;
    const swapTotal = node.swap_total||0;
    sysRows.push(
      {lbl:"CPU 型号",val:node.cpu_name||"-"},{lbl:"架构",val:node.arch||"-"},{lbl:"虚拟化",val:node.virtualization||"-"},
      {lbl:"操作系统",val:osName||"-"},{lbl:"内核版本",val:node.kernel_version||"-"},
      {lbl:"GPU",val:node.gpu_name&&node.gpu_name!=="None"?node.gpu_name:"-"},
      {lbl:"内存总量",val:bytes(node.mem_total||0)},
      {lbl:"Swap 总量",val:swapTotal>0?bytes(swapTotal):"无"},
      {lbl:"磁盘总量",val:bytes(node.disk_total||0)},
      {lbl:"流量限额",val:(node.traffic_limit||0)>0?bytes(node.traffic_limit||0):"无"},
      {lbl:"到期时间",val:node.expired_at?new Date(node.expired_at).toLocaleDateString("zh-CN"):"-"},
      {lbl:"在线时长",val:uptime(latest.uptime||0)},
    );
    if (load1 !== null) sysRows.push({lbl:"负载均值",val:`${load1} / ${load5} / ${load15}`,isLoad:true,loadVals:[load1??0,load5??0,load15??0],cpuCoresN:node.cpu_cores||1});
    sysRows.push({lbl:"进程数",val:String(latest.process||"-")},{lbl:"TCP 连接",val:String(latest.connections?.tcp||"-")},{lbl:"最后更新",val:age(latest.updated_at)});
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-20" style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
        <div className="max-w-[1124px] mx-auto px-4 py-2.5 flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-all" style={{borderRadius:6,border:"1px solid var(--border-default)",background:"var(--bg-card)",color:"var(--text-secondary)"}}>
            <ArrowLeft size={13}/>返回
          </a>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{color:"var(--text-primary)"}}>{nodeName}</div>
            <div className="text-xs truncate" style={{color:"var(--text-muted)"}}>{nodeMeta}</div>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-[1124px] mx-auto px-4 py-5">
        {nodeLoading && (
          <div className="flex flex-col items-center gap-4 py-16" style={{color:"var(--text-muted)"}}>
            <div className="w-6 h-6 rounded-full animate-spin" style={{border:"2px solid rgba(255,255,255,0.06)",borderTopColor:"var(--accent)"}}/>
            <span className="text-sm">加载中…</span>
          </div>
        )}

        {nodeError && <div className="text-center py-16" style={{color:"var(--danger)"}}>加载失败</div>}

        {!nodeLoading && !nodeError && node && (
          <div className="grid grid-cols-[360px_1fr] gap-4 items-start max-lg:grid-cols-1">
            {/* Left */}
            <div className="flex flex-col gap-4">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:"CPU",value:cpu.toFixed(1)+"%",bar:cpu,color:metricColorClass(cpu)},
                  {label:"内存",value:memPct.toFixed(1)+"%",bar:memPct,color:metricColorClass(memPct)},
                  {label:"磁盘",value:diskPct.toFixed(1)+"%",bar:diskPct,color:metricColorClass(diskPct)},
                  {label:"下行",value:bytes(netDown)+"/s"},
                  {label:"上行",value:bytes(netUp)+"/s"},
                  {label:"在线时长",value:uptime(latest.uptime||0)},
                ].map((m,i) => <MetricCard key={i} label={m.label} value={m.value} bar={m.bar} color={m.color}/>)}
              </div>

              {/* Sysinfo */}
              <div className="card overflow-hidden" style={{padding:"14px 16px"}}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{color:"var(--text-muted)"}}>系统信息</div>
                {sysRows.map((r,i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 px-2 relative">
                    {i<sysRows.length-1 && <div className="absolute bottom-0 left-2 right-2 h-px" style={{background:"var(--border-default)"}}/>}
                    <span className="text-[11px] shrink-0" style={{color:"var(--text-muted)"}}>{r.lbl}</span>
                    {r.isLoad && r.loadVals ? (
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {r.loadVals.map((v,j) => {
                          const cls = v>=(r.cpuCoresN||1)*2 ? "#f43f5e" : v>=(r.cpuCoresN||1) ? "#f59e0b" : "var(--text-secondary)";
                          return <span key={j} className="text-[10px] font-mono px-1.5 py-[1px]" style={{borderRadius:4,background:cls==="#f43f5e"?"rgba(244,63,94,0.10)":cls==="#f59e0b"?"rgba(245,158,11,0.10)":"rgba(255,255,255,0.03)",border:`1px solid ${cls}20`,color:cls}}>{["1m","5m","15m"][j]} {v.toFixed(1)}</span>;
                        })}
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-right max-w-[55%] truncate" style={{color:"var(--text-secondary)"}}>{r.val}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Charts */}
            <div className="flex flex-col gap-4">
              <ChartSection title="CPU 占用率" pts={cpuPts} stamps={timestamps} color="#10b981" badge={cpuCur} badgeColor="var(--accent)" unit="%" />
              <ChartSection title="内存占用率" pts={memPts} stamps={timestamps} color="#6366f1" badge={memCur} badgeColor="#6366f1" unit="%" />
              <ChartSection title="网络速率" pts={downPts} pts2={upPts} stamps={timestamps} color="#10b981" color2="#f59e0b" badge={netCur} badgeColor="var(--text-secondary)" unit="/s" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({label,value,bar,color}:{label:string;value:string;bar?:number;color?:string}) {
  const bc = color==="high"?"#f43f5e":color==="medium"?"#f59e0b":"#10b981";
  return (
    <div className="card p-3 flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{label}</span>
      <span className="text-xl font-bold font-mono leading-none" style={{color:"var(--text-primary)"}}>{value}</span>
      {bar!==undefined && (
        <div className="h-1 overflow-hidden" style={{borderRadius:3,background:"rgba(255,255,255,0.04)"}}>
          <div className="h-full" style={{width:`${Math.min(100,bar)}%`,background:bc,borderRadius:3,transition:"width 0.3s ease"}}/>
        </div>
      )}
    </div>
  );
}

function ChartSection({title,pts,pts2,stamps,color,color2,badge,badgeColor,unit}:{
  title:string;pts:number[];pts2?:number[];stamps?:number[];color:string;color2?:string;badge:string;badgeColor:string;unit:string;
}) {
  return (
    <div className="card" style={{padding:"16px 20px"}}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{title}</span>
        <span className="text-[10px] font-mono px-2 py-[2px]" style={{borderRadius:4,background:"rgba(255,255,255,0.03)",border:"1px solid var(--border-default)",color:badgeColor}}>{badge}</span>
      </div>
      <UPlotChart data={pts} data2={pts2} timestamps={stamps} color={color} color2={color2} showY unit={unit} height={130} />
    </div>
  );
}
