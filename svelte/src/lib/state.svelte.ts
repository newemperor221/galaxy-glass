import { loadNodes, getSiteData, getExchangeRate, getOnlineCount } from './api';
import type { MergedNode, SortMode } from './types';

// ── Reactive State (Svelte 5 runes — object pattern for export) ──
export const state = $state({
	nodes: [] as MergedNode[],
	loading: true,
	error: false,
	searchQuery: '',
	sortMode: 'default' as SortMode,
	filterRegion: null as string | null,
	viewMode: 'grid' as 'grid' | 'table' | 'detail',
	onlineCount: 0,
	exchangeRate: 6.82,
	siteName: 'GalaxyGlass'
});

// ── Actions ──
export async function refresh() {
	const [siteData, rateData, ocData] = await Promise.all([
		getSiteData(),
		getExchangeRate(),
		getOnlineCount()
	]);

	if (siteData?.sitename) state.siteName = siteData.sitename;
	if (rateData?.conversion_rates?.CNY) state.exchangeRate = rateData.conversion_rates.CNY;
	if (ocData?.online !== undefined) state.onlineCount = ocData.online;

	const result = await loadNodes();
	if (!result || result.length === 0) {
		state.error = true;
	} else {
		state.error = false;
		state.nodes = result;
	}
	state.loading = false;
}
/* v3 */
