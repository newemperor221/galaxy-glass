// API response types

export interface SiteData {
	sitename?: string;
	theme_settings?: {
		posterUrl?: string;
		videoUrl?: string;
	};
}

export interface ExchangeRateData {
	conversion_rates?: {
		CNY?: number;
	};
}

export interface OnlineCountData {
	online?: number;
}

export interface RawNode {
	uuid: string;
	name: string;
	region?: string;
	country_code?: string;
	host?: string;
	os?: string;
	cpu: number;
	memory_total: number;
	disk_total: number;
	price?: number;
	billing_cycle?: string;
	expired_at?: string;
	tags?: string[];
	updated_at?: string;
}

export interface RecentData {
	updated_at?: string;
	cpu?: { usage: number };
	ram?: { used: number };
	disk?: { used: number };
	network?: {
		up: number;
		down: number;
		totalUp: number;
		totalDown: number;
	};
	uptime?: number;
	load?: { load1: number; load5: number; load15: number };
	connections?: number;
	process?: number;
}

export interface MergedNode extends RawNode {
	cpu_usage: number;
	mem_used: number;
	disk_used: number;
	net_up: number;
	net_down: number;
	total_up: number;
	total_down: number;
	uptime_sec: number;
	load1?: number;
	load5?: number;
	load15?: number;
	connections?: number;
	process?: number;
	online: boolean;
}

export type SortMode =
	| 'default'
	| 'name'
	| 'region'
	| 'cpu'
	| 'mem'
	| 'disk'
	| 'down'
	| 'up'
	| 'uptime';

export interface SortOption {
	value: SortMode;
	label: string;
}
/* v3 */
