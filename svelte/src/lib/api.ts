import type { SiteData, ExchangeRateData, OnlineCountData, RawNode, MergedNode, RecentData } from './types';

const BASE = '';
const TIMEOUT = 15000;
const TAB_ID = `t${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

async function fetchJSON<T>(url: string): Promise<T | null> {
	try {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
		const r = await fetch(url, { signal: ctrl.signal });
		clearTimeout(timer);
		return (await r.json()) as T;
	} catch {
		return null;
	}
}

export async function getSiteData(): Promise<SiteData | null> {
	return fetchJSON<SiteData>(`${BASE}/api/public`);
}

export async function getExchangeRate(): Promise<ExchangeRateData | null> {
	return fetchJSON<ExchangeRateData>(`${BASE}/api/proxy/exchange-rate`);
}

export async function getOnlineCount(): Promise<OnlineCountData | null> {
	return fetchJSON<OnlineCountData>(`${BASE}/api/proxy/online-count?t=${TAB_ID}`);
}

async function getRawNodes(): Promise<RawNode[]> {
	const data = await fetchJSON<{ data: RawNode[] }>(`${BASE}/api/nodes`);
	return data?.data ?? [];
}

async function getRecent(uuid: string): Promise<RecentData | null> {
	const data = await fetchJSON<{ data: RecentData[] }>(`${BASE}/api/recent/${uuid}`);
	return data?.data?.[0] ?? null;
}

function mergeNode(node: RawNode, recent: RecentData | null): MergedNode {
	const r = recent ?? {};
	return {
		...node,
		cpu_usage: r.cpu?.usage ?? 0,
		mem_used: r.ram?.used ?? 0,
		disk_used: r.disk?.used ?? 0,
		net_up: r.network?.up ?? 0,
		net_down: r.network?.down ?? 0,
		total_up: r.network?.totalUp ?? 0,
		total_down: r.network?.totalDown ?? 0,
		uptime_sec: r.uptime ?? 0,
		load1: r.load?.load1,
		load5: r.load?.load5,
		load15: r.load?.load15,
		connections: r.connections,
		process: r.process,
		online: !!r.updated_at,
		updated_at: r.updated_at ?? node.updated_at
	};
}

export async function loadNodes(): Promise<MergedNode[]> {
	const raw = await getRawNodes();
	const merged = await Promise.all(
		raw.map(async (node) => {
			const recent = await getRecent(node.uuid);
			return mergeNode(node, recent);
		})
	);
	return merged;
}

export { TAB_ID };
/* v3 */
