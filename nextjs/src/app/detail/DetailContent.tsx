"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { NodeData, RecentDataPoint } from "@/lib/api";
import { fetchSiteInfo, fetchNodes, fetchRecentData } from "@/lib/api";
import { bytes, uptime, age, metricColorClass } from "@/lib/utils";

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

  const drawCharts = useCallback((pts: RecentDataPoint[], n: NodeData) => {
    const cpuPts = pts.map((r) => r.cpu?.usage || 0);
    const memPts = pts.map((r) => {
      const total = r.ram?.total || n.mem_total || 1;
      const used = r.ram?.used || 0;
      return total > 0 ? (used / total) * 100 : 0;
    });
    const upPts = pts.map((r) => r.network?.up || 0);
    const downPts = pts.map((r) => r.network?.down || 0);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        drawLine("chart-cpu", cpuPts, "#10b981", "rgba(16,185,129,0.15)");
        drawLine("chart-mem", memPts, "#a855f7", "rgba(168,85,247,0.15)");
        drawNet("chart-net", upPts, downPts, pts);
      })
    );
  }, []);

  useEffect(() => {
    if (!uuid) {
      setError("缺少节点 UUID 参数");
      setLoading(false);
      return;
    }

    // Background
    const poster = posterRef.current;
    const video = videoRef.current;
    if (poster && video) {
      poster.src = "https://img.357561.xyz/image-wallpaper2.png";
      video.src = "https://img.357561.xyz/wallpaper1.mp4";
      video.play().then(() => {
        video.style.opacity = "1";
        poster.style.opacity = "0";
      }).catch(() => {
        poster.style.opacity = "1";
      });
    }

    // Fetch data
    Promise.all([fetchSiteInfo(), fetchNodes(), fetchRecentData(uuid)])
      .then(([siteInfo, nodeList, recentData]) => {
        const n = nodeList.find((nd) => nd.uuid === uuid);
        if (!n) {
          setError("未找到该节点");
          setLoading(false);
          return;
        }
        setNode(n);
        setRecent(recentData);
        setNodeName(n.name || n.uuid);

        const region = n.region || "";
        const virt = n.virtualization || "";
        const os = (n.os || "").split(" ")[0];
        setNodeMeta([region, virt, os].filter(Boolean).join(" · "));

        const pts = [...recentData].reverse();
        drawCharts(pts, n);

        // Badges
        const cpuPts = pts.map((r) => r.cpu?.usage || 0);
        const memPts = pts.map((r) => {
          const total = r.ram?.total || n.mem_total || 1;
          const used = r.ram?.used || 0;
          return total > 0 ? (used / total) * 100 : 0;
        });
        const upPts = pts.map((r) => r.network?.up || 0);
        const downPts = pts.map((r) => r.network?.down || 0);

        const badgeCpu = document.getElementById("badge-cpu");
        const badgeMem = document.getElementById("badge-mem");
        const badgeNet = document.getElementById("badge-net");
        if (badgeCpu) badgeCpu.textContent = cpuPts.length ? cpuPts[cpuPts.length - 1].toFixed(1) + "%" : "—";
        if (badgeMem) badgeMem.textContent = memPts.length ? memPts[memPts.length - 1].toFixed(1) + "%" : "—";
        if (badgeNet)
          badgeNet.textContent = upPts.length
            ? "↑ " + bytes(upPts[upPts.length - 1]) + "/s · ↓ " + bytes(downPts[downPts.length - 1]) + "/s"
            : "—";

        setLoading(false);
      })
      .catch((err) => {
        setError("加载失败: " + err.message);
        setLoading(false);
      });

    // Resize handler
    const handleResize = () => {
      const pts = [...recent].reverse();
      drawCharts(pts, node!);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [uuid, recent, node, drawCharts]);

  // Scroll handler for navbar
  useEffect(() => {
    const handleScroll = () => {
      const nav = document.getElementById("detail-nav");
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!uuid) {
    useEffect(() => {
      window.location.href = "./";
    }, []);
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-white/35 text-sm">缺少参数，正在返回…</div>
      </div>
    );
  }

  const latest = recent[0] || {};
  const cpu = latest.cpu?.usage || 0;
  const memPct = node && node.mem_total && node.mem_total > 0
    ? ((latest.ram?.used || 0) / node.mem_total) * 100
    : 0;
  const diskPct = node && node.disk_total && node.disk_total > 0
    ? ((latest.disk?.used || 0) / node.disk_total) * 100
    : 0;
  const netUp = latest.network?.up || 0;
  const netDown = latest.network?.down || 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-[#0e152e]">
        <img ref={posterRef} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0" />
        <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 opacity-0" />
      </div>

      {/* Navbar */}
      <nav
        id="detail-nav"
        className="sticky top-0 z-20 border-b border-transparent transition-all duration-300"
      >
        <div className="max-w-[1124px] mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => (window.location.href = "./")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/12 transition-all"
          >
            <ArrowLeft size={14} />
            返回
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-white/90">{nodeName}</div>
            <div className="text-xs text-white/35 truncate">{nodeMeta}</div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1124px] mx-auto px-6 py-6">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-white/35">
            <div className="w-7 h-7 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
            <span>加载节点数据…</span>
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}

        {!loading && !error && node && (
          <div id="detail-content" className="grid grid-cols-[360px_1fr] gap-4 items-start max-lg:grid-cols-1">
            {/* Left */}
            <div className="flex flex-col gap-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 max-md:grid-cols-3 max-sm:grid-cols-2">
                <MetricCard label="CPU" value={cpu.toFixed(1) + "%"} bar={cpu} color={metricColorClass(cpu)} />
                <MetricCard label="内存" value={memPct.toFixed(1) + "%"} bar={memPct} color={metricColorClass(memPct)} />
                <MetricCard label="磁盘" value={diskPct.toFixed(1) + "%"} bar={diskPct} color={metricColorClass(diskPct)} />
                <MetricCard label="下行" value={bytes(netDown) + "/s"} />
                <MetricCard label="上行" value={bytes(netUp) + "/s"} />
                <MetricCard label="在线时长" value={uptime(latest.uptime || 0)} />
              </div>

              {/* System Info */}
              <div
                className="rounded-[22px] p-4"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(80px) saturate(180%) brightness(130%)",
                  WebkitBackdropFilter: "blur(80px) saturate(180%) brightness(130%)",
                  boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.10), 0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                {(() => {
                  const cpuCores = node.cpu_cores || "-";
                  const load1 = latest.load?.load1 ?? latest.load1 ?? null;
                  const load5 = latest.load?.load5 ?? latest.load5 ?? null;
                  const load15 = latest.load?.load15 ?? latest.load15 ?? null;
                  const trafficLimit = node.traffic_limit || 0;
                  const process = latest.process || "-";
                  const tcp = latest.connections?.tcp || "-";
                  const swapTotal = node.swap_total || 0;

                  const rows: { lbl: string; val: string; isLoad?: boolean; loadVals?: number[]; cpuCoresN?: number }[] = [
                    { lbl: "CPU 型号", val: node.cpu_name || "-" },
                    { lbl: "架构", val: node.arch || "-" },
                    { lbl: "虚拟化", val: node.virtualization || "-" },
                    { lbl: "操作系统", val: (node.os || "-").split(" ")[0] },
                    { lbl: "内核版本", val: node.kernel_version || "-" },
                    { lbl: "GPU", val: node.gpu_name && node.gpu_name !== "None" ? node.gpu_name : "-" },
                    { lbl: "内存总量", val: bytes(node.mem_total || 0) },
                    { lbl: "Swap 总量", val: swapTotal > 0 ? bytes(swapTotal) : "无" },
                    { lbl: "磁盘总量", val: bytes(node.disk_total || 0) },
                    { lbl: "流量限额", val: trafficLimit > 0 ? bytes(trafficLimit) : "无" },
                    { lbl: "到期时间", val: node.expired_at ? new Date(node.expired_at).toLocaleDateString("zh-CN") : "-" },
                    { lbl: "在线时长", val: uptime(latest.uptime || 0) },
                  ];
                  if (load1 !== null) {
                    rows.push({
                      lbl: "负载均值",
                      val: `${load1} / ${load5} / ${load15}`,
                      isLoad: true,
                      loadVals: [load1 ?? 0, load5 ?? 0, load15 ?? 0],
                      cpuCoresN: node.cpu_cores || 1,
                    });
                  }
                  rows.push(
                    { lbl: "进程数", val: String(process) },
                    { lbl: "TCP 连接", val: String(tcp) },
                    { lbl: "最后更新", val: age(latest.updated_at) }
                  );

                  return rows.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-b-0">
                      <span className="text-[11px] text-white/35">{r.lbl}</span>
                      {r.isLoad && r.loadVals ? (
                        <div className="flex gap-2">
                          {r.loadVals.map((v, j) => {
                            const cls = v >= (r.cpuCoresN || 1) * 2 ? "border-red-500 text-red-400" : v >= (r.cpuCoresN || 1) ? "border-amber-500 text-amber-400" : "border-white/10 text-white/50";
                            return (
                              <span key={j} className={`text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/6 border ${cls}`}>
                                {["1m", "5m", "15m"][j]} {v.toFixed(1)}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-white/80 text-right max-w-[60%] truncate">{r.val}</span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-6">
              <ChartCard title="CPU 占用率" badgeId="badge-cpu" canvasId="chart-cpu" color="#10b981" />
              <ChartCard title="内存占用率" badgeId="badge-mem" canvasId="chart-mem" color="#a855f7" />
              <ChartCard title="网络速率" badgeId="badge-net" canvasId="chart-net" color="multi" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, bar, color }: { label: string; value: string; bar?: number; color?: string }) {
  const barColor = color === "high" ? "bg-red-500" : color === "medium" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div
      className="p-3.5 rounded-[22px] flex flex-col gap-1.5"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(80px) saturate(180%) brightness(130%)",
        WebkitBackdropFilter: "blur(80px) saturate(180%) brightness(130%)",
        boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.10), 0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      <span className="text-xl font-bold font-mono leading-none text-white">{value}</span>
      {bar !== undefined && (
        <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, badgeId, canvasId, color }: { title: string; badgeId: string; canvasId: string; color: string }) {
  return (
    <div
      className="rounded-[22px] p-5 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(80px) saturate(180%) brightness(130%)",
        WebkitBackdropFilter: "blur(80px) saturate(180%) brightness(130%)",
        boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.10), 0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex justify-between items-center mb-3.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{title}</span>
        <span
          id={badgeId}
          className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/7 border border-white/10 text-white/50"
        >
          —
        </span>
      </div>
      <canvas id={canvasId} height={160} className="w-full" />
    </div>
  );
}

// Canvas chart drawing functions
function drawLine(canvasId: string, points: number[], color: string, bgColor: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = 160;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + "px";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (!points || points.length < 2) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("数据不足", w / 2, h / 2 + 4);
    return;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const padY = 14;
  const chartH = h - padY * 2;

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const y = padY + (1 - ratio) * chartH + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  });

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bgColor);
  grad.addColorStop(1, "rgba(0,0,0,0)");

  const linePoints = points.map((v, i) => ({
    x: i * stepX,
    y: padY + (1 - (v - min) / range) * chartH,
  }));

  ctx.beginPath();
  linePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(linePoints[linePoints.length - 1].x, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Glow line
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  linePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawNet(canvasId: string, upPoints: number[], downPoints: number[], pts: RecentDataPoint[]) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = 160;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + "px";
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const len = Math.min(upPoints.length, downPoints.length);
  if (len < 2) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("数据不足", w / 2, h / 2 + 4);
    return;
  }

  const all = [...upPoints.slice(0, len), ...downPoints.slice(0, len)];
  const max = Math.max(...all) || 1;
  const padY = 14;
  const chartH = h - padY * 2;
  const stepX = w / (len - 1);

  // Y-axis label
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(bytes(max) + "/s", 4, 10);

  // X-axis labels
  ctx.textAlign = "left";
  ctx.fillText(
    pts[0] ? new Date(pts[0].updated_at!).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
    4,
    h - 2
  );
  ctx.textAlign = "right";
  ctx.fillText(
    pts[len - 1]
      ? new Date(pts[len - 1].updated_at!).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      : "",
    w - 4,
    h - 2
  );

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const y = padY + (1 - ratio) * chartH + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  });

  function drawLinePts(data: number[], lineColor: string) {
    const linePts = data.slice(0, len).map((v, i) => ({
      x: i * stepX,
      y: padY + (1 - v / max) * chartH,
    }));
    const grad = ctx!.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, lineColor.replace(")", ",0.2)").replace("rgb", "rgba"));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx!.beginPath();
    linePts.forEach((p, i) => (i === 0 ? ctx!.moveTo(p.x, p.y) : ctx!.lineTo(p.x, p.y)));
    ctx!.lineTo(linePts[linePts.length - 1].x, h);
    ctx!.lineTo(0, h);
    ctx!.closePath();
    ctx!.fillStyle = grad;
    ctx!.fill();

    ctx!.shadowColor = lineColor;
    ctx!.shadowBlur = 6;
    ctx!.beginPath();
    linePts.forEach((p, i) => (i === 0 ? ctx!.moveTo(p.x, p.y) : ctx!.lineTo(p.x, p.y)));
    ctx!.strokeStyle = lineColor;
    ctx!.lineWidth = 2;
    ctx!.lineJoin = "round";
    ctx!.stroke();
    ctx!.shadowBlur = 0;
  }

  // Legend
  ctx.textAlign = "right";
  ctx.fillStyle = "#f97316";
  ctx.fillRect(w - 74, 4, 16, 2);
  ctx.fillText("↑ 上行", w - 10, 10);
  ctx.fillStyle = "#10b981";
  ctx.fillRect(w - 74, 16, 16, 2);
  ctx.fillText("↓ 下行", w - 10, 22);

  drawLinePts(upPoints, "#f97316");
  drawLinePts(downPoints, "#10b981");
}
