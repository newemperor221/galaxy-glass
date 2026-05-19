<script lang="ts">
	import { state } from '$lib/state.svelte';
	import { Search, SlidersHorizontal, Grid3X3, List, ChevronDown, Check } from 'lucide-svelte';
	import { bytes, bytesPerSec, formatPrice, formatCNY } from '$lib/helpers';
	import type { SortMode, MergedNode } from '$lib/types';

	const sortOptions: { value: SortMode; label: string }[] = [
		{ value: 'default', label: '默认' },
		{ value: 'name', label: '名称' },
		{ value: 'region', label: '地区' },
		{ value: 'cpu', label: 'CPU 占用' },
		{ value: 'mem', label: '内存占用' },
		{ value: 'disk', label: '磁盘占用' },
		{ value: 'down', label: '下行速度' },
		{ value: 'up', label: '上行速度' },
		{ value: 'uptime', label: '在线时长' }
	];

	let sortOpen = $state(false);
	let searchOpen = $state(false);

	// Derived from state
	let filteredNodes = $derived.by((): MergedNode[] => {
		let list = [...state.nodes];
		if (state.filterRegion) list = list.filter((n) => n.region === state.filterRegion);
		if (state.searchQuery) {
			const q = state.searchQuery.toLowerCase();
			list = list.filter((n) => n.name.toLowerCase().includes(q));
		}
		switch (state.sortMode) {
			case 'name': list.sort((a, b) => (a.name||'').localeCompare(b.name||'')); break;
			case 'region': list.sort((a, b) => (a.region||'').localeCompare(b.region||'')); break;
			case 'cpu': list.sort((a, b) => b.cpu_usage - a.cpu_usage); break;
			case 'mem': list.sort((a, b) => (b.mem_used/b.memory_total) - (a.mem_used/a.memory_total)); break;
			case 'disk': list.sort((a, b) => (b.disk_used/b.disk_total) - (a.disk_used/a.disk_total)); break;
			case 'down': list.sort((a, b) => b.net_down - a.net_down); break;
			case 'up': list.sort((a, b) => b.net_up - a.net_up); break;
			case 'uptime': list.sort((a, b) => b.uptime_sec - a.uptime_sec); break;
		}
		return list;
	});
	let regions = $derived([...new Set(state.nodes.map((n) => n.region).filter(Boolean) as string[])].sort());
	let onlineNodes = $derived(state.nodes.filter((n) => n.online).length);
	let totalTraffic = $derived(state.nodes.reduce((s, n) => s + n.total_up + n.total_down, 0));
	let totalSpeed = $derived({ up: state.nodes.reduce((s, n) => s + n.net_up, 0), down: state.nodes.reduce((s, n) => s + n.net_down, 0) });
	let totalPrice = $derived(state.nodes.reduce((s, n) => s + (n.price || 0), 0));
	let remainingValue = $derived(state.nodes.reduce((s, n) => {
		if (!n.price || !n.expired_at) return s;
		const now = Date.now(), expire = new Date(n.expired_at).getTime();
		const remaining = Math.max(0, expire - now);
		const cycleMs = (n.billing_cycle === 'yearly' ? 365 : 30) * 86400 * 1000;
		return cycleMs > 0 ? s + (n.price * remaining) / cycleMs : s + n.price;
	}, 0));

	function toggleSearch() {
		searchOpen = !searchOpen;
		if (searchOpen) setTimeout(() => document.querySelector<HTMLInputElement>('#search-input')?.focus(), 100);
	}
</script>

<!-- Stats Grid -->
<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div class="flex items-center gap-3 rounded-xl px-4 py-3.5 card-glow preset-glass-bg">
		<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: rgba(16,185,129,0.1);">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" style="color: #10b981;">
				<circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/>
			</svg>
		</div>
		<div>
			<div class="text-xs font-medium" style="color: rgba(240,253,244,0.45); letter-spacing: 0.04em;">时间</div>
			<div class="text-base font-bold font-mono" style="color: #f0fdf4;">{new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'})}</div>
		</div>
	</div>
	<div class="flex items-center gap-3 rounded-xl px-4 py-3.5 card-glow preset-glass-bg">
		<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: rgba(129,140,248,0.1);">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" style="color: #818cf8;">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
			</svg>
		</div>
		<div>
			<div class="text-xs font-medium" style="color: rgba(240,253,244,0.45); letter-spacing: 0.04em;">在线</div>
			<div class="text-base font-bold font-mono" style="color: #f0fdf4;">{onlineNodes}/{state.nodes.length}</div>
		</div>
	</div>
	<div class="flex items-center gap-3 rounded-xl px-4 py-3.5 card-glow preset-glass-bg">
		<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: rgba(245,158,11,0.1);">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" style="color: #f59e0b;">
				<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
			</svg>
		</div>
		<div>
			<div class="text-xs font-medium" style="color: rgba(240,253,244,0.45); letter-spacing: 0.04em;">流量</div>
			<div class="text-base font-bold font-mono" style="color: #f0fdf4;">{bytes(totalTraffic)}</div>
			<div class="text-xs font-mono" style="color: rgba(240,253,244,0.7);">↑{bytesPerSec(totalSpeed.up)} ↓{bytesPerSec(totalSpeed.down)}</div>
		</div>
	</div>
	<div class="flex items-center gap-3 rounded-xl px-4 py-3.5 card-glow preset-glass-bg">
		<div class="flex h-10 w-10 items-center justify-center rounded-lg" style="background: rgba(16,185,129,0.1);">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" style="color: #10b981;">
				<circle cx="12" cy="12" r="9"/><path d="M12 6v12"/><path d="M16.5 9.5a3.5 3.5 0 0 0-3.5-3.5h-2A3.5 3.5 0 0 0 7.5 9.5v0A3.5 3.5 0 0 0 11 13h2a3.5 3.5 0 0 1 3.5 3.5v0A3.5 3.5 0 0 1 13 20h-2a3.5 3.5 0 0 1-3.5-3.5"/>
			</svg>
		</div>
		<div>
			<div class="text-xs font-medium" style="color: rgba(240,253,244,0.45); letter-spacing: 0.04em;">价值</div>
			<div class="text-base font-bold font-mono" style="color: #f0fdf4;">{formatCNY(remainingValue, state.exchangeRate)}</div>
			<div class="text-xs font-mono" style="color: rgba(240,253,244,0.7);">@{state.exchangeRate.toFixed(2)} · {formatPrice(totalPrice)}</div>
		</div>
	</div>
</div>

<!-- Filters Bar -->
<div class="mb-5 flex flex-wrap items-center gap-2">
	<div class="flex flex-wrap gap-1.5 rounded-full preset-glass-chip px-1.5 py-1">
		<button onclick={() => state.filterRegion = null}
			class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
			style="color: {state.filterRegion === null ? '#10b981' : 'rgba(240,253,244,0.45)'};">全部</button>
		{#each regions as region}
			<button onclick={() => state.filterRegion = region}
				class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
				style="color: {state.filterRegion === region ? '#10b981' : 'rgba(240,253,244,0.45)'};">{region}</button>
		{/each}
	</div>

	<div class="ml-auto flex items-center gap-2">
		<div class="flex items-center rounded-full border transition-all duration-300"
			style="border-color: {searchOpen ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)'}; background: {searchOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}; backdrop-filter: blur(24px); max-width: {searchOpen ? '260px' : '36px'}; height: 36px; overflow: hidden;">
			<button onclick={toggleSearch} class="flex h-9 w-9 shrink-0 items-center justify-center">
				<Search size={15} style="color: {searchOpen ? '#10b981' : 'rgba(240,253,244,0.45)'};" />
			</button>
			<input id="search-input" bind:value={state.searchQuery} placeholder="搜索节点..."
				class="flex-1 bg-transparent text-sm outline-none"
				style="color: #f0fdf4; opacity: {searchOpen ? 1 : '0'};" />
		</div>

		<button onclick={() => state.viewMode = state.viewMode === 'grid' ? 'table' : 'grid'}
			class="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors hover:text-white"
			style="border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); color: rgba(240,253,244,0.7);">
			{#if state.viewMode === 'grid'}<List size={15} class="mr-1.5" /> 表格{:else}<Grid3X3 size={15} class="mr-1.5" /> 卡片{/if}
		</button>

		<div class="relative">
			<button onclick={() => sortOpen = !sortOpen}
				class="flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors hover:text-white"
				style="border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); color: rgba(240,253,244,0.7);">
				<SlidersHorizontal size={14} />{sortOptions.find(o => o.value === state.sortMode)?.label ?? '排序'}<ChevronDown size={12} />
			</button>
			{#if sortOpen}
				<div class="absolute right-0 z-50 mt-1.5 min-w-[150px] rounded-xl border p-1 shadow-lg"
					style="background: rgba(255,255,255,0.06); backdrop-filter: blur(20px) saturate(140%); border-color: rgba(255,255,255,0.1); box-shadow: 0 12px 40px rgba(0,0,0,0.5);">
					{#each sortOptions as opt}
						<button onclick={() => { state.sortMode = opt.value; sortOpen = false; }}
							class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors"
							style="color: {state.sortMode === opt.value ? '#10b981' : 'rgba(240,253,244,0.7)'}; background: {state.sortMode === opt.value ? 'rgba(16,185,129,0.1)' : 'transparent'};">
							{opt.label}{#if state.sortMode === opt.value}<Check size={14} />{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Content: Loading / Error / Nodes -->
{#if state.loading}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each Array(8) as _}
			<div class="flex flex-col gap-3 rounded-xl p-4" style="background: rgba(255,255,255,0.06); backdrop-filter: blur(48px); min-height: 160px; border: 1px solid rgba(16,185,129,0.06);">
				<div class="h-3.5 w-3/5 rounded-full" style="background: rgba(255,255,255,0.05);"></div>
				<div class="h-2.5 w-11/12 rounded-full" style="background: rgba(255,255,255,0.05);"></div>
				<div class="bar-bg mt-1"></div><div class="bar-bg"></div><div class="bar-bg"></div>
				<div class="mt-auto h-2.5 w-2/5 rounded-full" style="background: rgba(255,255,255,0.05);"></div>
			</div>
		{/each}
	</div>
{:else if state.error}
	<div class="flex flex-col items-center gap-3 py-12" style="color: #ef4444;">
		<div class="text-3xl">⚠️</div>
		<span class="text-sm">无法连接到服务器，请检查后端状态</span>
	</div>
{:else if filteredNodes.length === 0}
	<div class="flex items-center justify-center gap-2 py-12 text-sm" style="color: rgba(240,253,244,0.45);">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
		<span>没有匹配的节点</span>
	</div>
{:else if state.viewMode === 'grid'}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each filteredNodes as node, i}
			<a href="/detail/{node.uuid}"
				class="flex cursor-pointer flex-col gap-2.5 rounded-xl p-4 no-underline card-glow preset-glass-bg animate-card-in"
				style="animation-delay: {i * 0.04}s;">
				<div class="flex items-center gap-2">
					<div class={node.online ? 'online-dot' : 'offline-dot'}></div>
					<span class="min-w-0 flex-1 truncate text-sm font-semibold" style="color: #f0fdf4;">{node.name}</span>
					{#if node.region}<span class="shrink-0 text-xs" style="color: rgba(240,253,244,0.45);">{node.region}</span>{/if}
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex h-5 items-center gap-1.5">
						<span class="w-8 shrink-0 text-right text-[11px] font-bold" style="color: rgba(240,253,244,0.45);">CPU</span>
						<div class="bar-bg flex-1"><div class="bar-fill" style="transform: scaleX({Math.min(node.cpu_usage/100,1)});"></div></div>
						<span class="w-10 shrink-0 text-right text-[13px] font-semibold font-mono" style="color: #f0fdf4;">{node.cpu_usage.toFixed(1)}%</span>
					</div>
					<div class="flex h-5 items-center gap-1.5">
						<span class="w-8 shrink-0 text-right text-[11px] font-bold" style="color: rgba(240,253,244,0.45);">MEM</span>
						<div class="bar-bg flex-1"><div class="bar-fill mem" style="transform: scaleX({Math.min((node.mem_used/node.memory_total)||0,1)});"></div></div>
						<span class="w-10 shrink-0 text-right text-[13px] font-semibold font-mono" style="color: #f0fdf4;">{((node.mem_used/node.memory_total)*100||0).toFixed(1)}%</span>
					</div>
					<div class="flex h-5 items-center gap-1.5">
						<span class="w-8 shrink-0 text-right text-[11px] font-bold" style="color: rgba(240,253,244,0.45);">DSK</span>
						<div class="bar-bg flex-1"><div class="bar-fill disk" style="transform: scaleX({Math.min((node.disk_used/node.disk_total)||0,1)});"></div></div>
						<span class="w-10 shrink-0 text-right text-[13px] font-semibold font-mono" style="color: #f0fdf4;">{((node.disk_used/node.disk_total)*100||0).toFixed(1)}%</span>
					</div>
					<div class="flex h-[18px] items-center gap-1">
						<span class="w-8 shrink-0 text-right text-[11px] font-bold" style="color: rgba(240,253,244,0.45);">NET</span>
						<div class="flex gap-2 text-xs font-mono">
							<span style="color: #10b981;">↓{bytesPerSec(node.net_down)}</span>
							<span style="color: #818cf8;">↑{bytesPerSec(node.net_up)}</span>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-2 border-t pt-2 text-xs font-mono" style="border-color: rgba(255,255,255,0.1); color: rgba(240,253,244,0.45);">
					<span>{Math.floor(node.uptime_sec/86400)}天 {Math.floor((node.uptime_sec%86400)/3600)}时</span>
					{#if node.price}<span class="ml-auto rounded-full px-2 py-0.5 text-xs font-bold text-white" style="background: linear-gradient(135deg,#10b981,#818cf8);text-shadow:0 1px 2px rgba(0,0,0,0.2);">${node.price.toFixed(2)}</span>{/if}
				</div>
			</a>
		{/each}
	</div>
{:else}
	<div class="w-full overflow-x-auto">
		<div class="min-w-[800px]">
			<div class="grid gap-3 rounded-lg px-4 py-2.5 text-xs font-medium" style="grid-template-columns:40px 1fr 70px 70px 70px 70px 80px 80px 90px;color:rgba(240,253,244,0.45);background:rgba(255,255,255,0.04);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.06);">
				<span></span><span>名称</span><span>CPU</span><span>内存</span><span>磁盘</span><span>下行</span><span>上行</span><span>在线</span><span>价格</span>
			</div>
			{#each filteredNodes as node, i}
				<a href="/detail/{node.uuid}" class="grid gap-3 border-b px-4 py-2.5 text-xs font-mono no-underline transition-colors hover:opacity-80 animate-card-in"
					style="grid-template-columns:40px 1fr 70px 70px 70px 70px 80px 80px 90px;border-color:rgba(255,255,255,0.04);color:rgba(240,253,244,0.7);animation-delay:{i*0.02}s;">
					<div class={node.online?'online-dot':'offline-dot'} style="margin-top:2px;"></div>
					<span style="color:#f0fdf4;font-family:system-ui;">{node.name}</span>
					<span>{node.cpu_usage.toFixed(1)}%</span>
					<span>{((node.mem_used/node.memory_total)*100||0).toFixed(1)}%</span>
					<span>{((node.disk_used/node.disk_total)*100||0).toFixed(1)}%</span>
					<span style="color:#10b981;">{bytesPerSec(node.net_down)}</span>
					<span style="color:#818cf8;">{bytesPerSec(node.net_up)}</span>
					<span>{Math.floor(node.uptime_sec/86400)}天</span>
					<span>{node.price?`$${node.price.toFixed(2)}`:'—'}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
/* v3 */
