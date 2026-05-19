// Komari API types + helpers

const API_BASE = "";

export interface SiteInfo { sitename?: string; theme_settings?: { posterUrl?: string; videoUrl?: string } }

export interface NodeData {
  uuid: string; name?: string; os?: string; arch?: string; virtualization?: string;
  kernel_version?: string; cpu_name?: string; cpu_cores?: number;
  mem_total?: number; disk_total?: number; swap_total?: number; traffic_limit?: number;
  price?: number; currency?: string; expired_at?: string; billing_cycle?: number;
  region?: string; country_code?: string; tags?: string; gpu_name?: string;
}

export interface RecentDataPoint {
  cpu?: { usage: number }; ram?: { total: number; used: number }; disk?: { total: number; used: number };
  network?: { up: number; down: number; totalDown?: number; totalUp?: number };
  uptime?: number; load?: { load1: number; load5: number; load15: number };
  load1?: number; load5?: number; load15?: number;
  process?: number; connections?: { tcp: number }; updated_at?: string;
}

export interface MergedNode extends NodeData {
  online: boolean; cpu_usage: number; memory_usage: number; memory_used: number; memory_total: number;
  disk_usage: number; disk_used: number; disk_total_val: number;
  network_in: number; network_out: number; network_total_received: number; network_total_transmitted: number;
  uptime_val: number; last_update: string | null; cpu_name_short?: string; tags_list: string[];
}

const ONLINE_THRESHOLD_MS = 150_000;

export function mergeNodeData(node: NodeData, recent: RecentDataPoint[]): MergedNode {
  if (!recent || recent.length === 0) {
    return { ...node, online: false, cpu_usage: 0, memory_usage: 0, memory_used: 0, memory_total: 0,
      disk_usage: 0, disk_used: 0, disk_total_val: 0, network_in: 0, network_out: 0,
      network_total_received: 0, network_total_transmitted: 0, uptime_val: 0, last_update: null,
      tags_list: [], cpu_name_short: undefined };
  }
  const latest = recent[0];
  const elapsed = latest.updated_at ? Date.now() - new Date(latest.updated_at).getTime() : Infinity;
  return {
    ...node,
    online: elapsed < ONLINE_THRESHOLD_MS,
    cpu_usage: latest.cpu?.usage || 0,
    memory_total: latest.ram?.total || 0,
    memory_used: latest.ram?.used || 0,
    memory_usage: latest.ram?.total && latest.ram.total > 0 ? (latest.ram.used! / latest.ram.total) * 100 : 0,
    disk_total_val: latest.disk?.total || 0,
    disk_used: latest.disk?.used || 0,
    disk_usage: latest.disk?.total && latest.disk.total > 0 ? (latest.disk.used! / latest.disk.total) * 100 : 0,
    network_in: latest.network?.down || 0,
    network_out: latest.network?.up || 0,
    network_total_received: latest.network?.totalDown || 0,
    network_total_transmitted: latest.network?.totalUp || 0,
    uptime_val: latest.uptime || 0,
    last_update: latest.updated_at || null,
    cpu_name_short: node.cpu_name?.trim(),
    tags_list: node.tags ? String(node.tags).split(",").filter((t) => t.trim()) : [],
  };
}

// Raw fetch functions (for TanStack Query)
export async function fetchSiteInfo(): Promise<SiteInfo> {
  try { const r = await fetch(`${API_BASE}/api/public`); const d = await r.json(); return d.data || {}; } catch { return {}; }
}

export async function fetchNodes(): Promise<NodeData[]> {
  try { const r = await fetch(`${API_BASE}/api/nodes`); const d = await r.json(); return d.data || []; } catch { return []; }
}

export async function fetchRecentData(uuid: string): Promise<RecentDataPoint[]> {
  try { const r = await fetch(`${API_BASE}/api/recent/${uuid}`); const d = await r.json(); return d.data || []; } catch { return []; }
}

// Exchange rate
export async function getExchangeRate(): Promise<number> {
  const key = "usd_cny_rate"; const tKey = "usd_cny_rate_time";
  const now = Date.now();
  const cached = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  const cachedTime = typeof localStorage !== "undefined" ? localStorage.getItem(tKey) : null;
  if (cached && cachedTime && now - parseInt(cachedTime) < 3600000) return parseFloat(cached);
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const d = await r.json();
    if (typeof localStorage !== "undefined") { localStorage.setItem(key, d.rates.CNY); localStorage.setItem(tKey, String(now)); }
    return d.rates.CNY;
  } catch { return cached ? parseFloat(cached) : 7.2; }
}
