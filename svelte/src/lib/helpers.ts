// ── Formatting Helpers ──
export function bytes(v: number): string {
	if (!v || v <= 0) return '0B';
	const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.min(Math.floor(Math.log(v) / Math.log(1024)), u.length - 1);
	return (v / Math.pow(1024, i)).toFixed(i < 2 ? 0 : 1) + u[i];
}

export function bytesPerSec(bps: number): string {
	return bytes(bps) + '/s';
}

export function uptimeStr(s: number): string {
	if (!s || s <= 0) return '—';
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	return (d > 0 ? d + ' 天 ' : '') + h + ' 时';
}

export function formatPrice(usd: number): string {
	return `$${usd.toFixed(2)}`;
}

export function formatCNY(usd: number, rate: number): string {
	return `¥${(usd * rate).toFixed(2)}`;
}

export function metricClass(p: number): string {
	return p >= 80 ? 'high' : p >= 60 ? 'medium' : 'low';
}

export function flagEmoji(r?: string): string {
	const m: Record<string, string> = {
		'🇺🇸': 'us', '🇯🇵': 'jp', '🇭🇰': 'hk', '🇳🇱': 'nl',
		'🇰🇵': 'kp', '🇩🇪': 'de', '🇸🇬': 'sg', '🇬🇧': 'gb',
		'🇰🇷': 'kr', '🇨🇳': 'cn', '🇷🇺': 'ru', '🇨🇦': 'ca', '🇦🇺': 'au'
	};
	return m[r || ''] || '';
}
/* v3 */
