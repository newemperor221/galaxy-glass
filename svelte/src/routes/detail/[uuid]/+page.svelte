<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from 'lucide-svelte';
	import type { RecentData, MergedNode } from '$lib/types';
	import { bytes, uptimeStr, metricClass } from '$lib/helpers';
	import { Chart, registerables } from 'chart.js';

	export const ssr = false;
	Chart.register(...registerables);

	const uuid = $derived($page.params.uuid);
	let node = $state<MergedNode | null>(null);
	let isLoading = $state(true);
	let errMsg = $state('');

	let cpuPoints = $state<number[]>([]);
	let memPoints = $state<number[]>([]);
	let upPoints = $state<number[]>([]);
	let downPoints = $state<number[]>([]);
	let timestamps = $state<string[]>([]);

	let cpuChart: Chart | null = null;
	let memChart: Chart | null = null;
	let netChart: Chart | null = null;
	let cpuCanvas: HTMLCanvasElement | undefined = $state();
	let memCanvas: HTMLCanvasElement | undefined = $state();
	let netCanvas: HTMLCanvasElement | undefined = $state();

	async function loadNodeDetail() {
		isLoading = true;
		errMsg = '';
		try {
			const { loadNodes } = await import('$lib/api');
			const allNodes = await loadNodes();
			const found = allNodes.find((n) => n.uuid === uuid);
			if (!found) { errMsg = '节点未找到'; isLoading = false; return; }
			node = found;

			const resp = await fetch(`/api/recent/${uuid}`);
			const data: { data: RecentData[] } = await resp.json();
			const recentData = data?.data ?? [];
			cpuPoints = recentData.map((d) => d.cpu?.usage ?? 0);
			memPoints = recentData.map((d) => (d.ram?.used ?? 0) / (found.memory_total ?? 1) * 100);
			upPoints = recentData.map((d) => d.network?.up ?? 0);
			downPoints = recentData.map((d) => d.network?.down ?? 0);
			timestamps = recentData.map((d) => d.updated_at ? new Date(d.updated_at).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) : '');

			requestAnimationFrame(() => createCharts());
		} catch { errMsg = '加载失败'; }
		isLoading = false;
	}

	function createCharts() {
		const ce = cpuCanvas, me = memCanvas, ne = netCanvas;
		if (!ce || !me || !ne) return;

		const commonOpts: any = {
			responsive: true, maintainAspectRatio: false,
			animation: { duration: 300 },
			plugins: {
				legend: { display: false },
				tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#f0fdf4', bodyColor: '#f0fdf4', cornerRadius: 8, padding: 8 }
			},
			scales: {
				x: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,253,244,0.35)', maxTicksLimit: 6, font: { size: 10 } } },
				y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(240,253,244,0.35)', font: { size: 10 }, maxTicksLimit: 5 } }
			}
		};

		cpuChart?.destroy();
		cpuChart = new Chart(ce, {
			type: 'line',
			data: {
				labels: timestamps,
				datasets: [{
					data: cpuPoints, borderColor: '#10b981',
					backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,130); g.addColorStop(0,'rgba(16,185,129,0.2)'); g.addColorStop(1,'rgba(16,185,129,0)'); return g; },
					fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2
				}]
			},
			options: { ...commonOpts, scales: { ...commonOpts.scales, y: { ...commonOpts.scales.y, min: 0, max: 100, ticks: { ...commonOpts.scales.y.ticks, callback: (v: any) => v + '%' } } } }
		});

		memChart?.destroy();
		memChart = new Chart(me, {
			type: 'line',
			data: {
				labels: timestamps,
				datasets: [{
					data: memPoints, borderColor: '#818cf8',
					backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,130); g.addColorStop(0,'rgba(129,140,248,0.2)'); g.addColorStop(1,'rgba(129,140,248,0)'); return g; },
					fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2
				}]
			},
			options: { ...commonOpts, scales: { ...commonOpts.scales, y: { ...commonOpts.scales.y, min: 0, max: 100, ticks: { ...commonOpts.scales.y.ticks, callback: (v: any) => v + '%' } } } }
		});

		netChart?.destroy();
		netChart = new Chart(ne, {
			type: 'line',
			data: {
				labels: timestamps,
				datasets: [
					{ label: '下行', data: downPoints, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2 },
					{ label: '上行', data: upPoints, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2 }
				]
			},
			options: {
				...commonOpts,
				plugins: {
					...commonOpts.plugins,
					legend: { display: true, position: 'top', align: 'end', labels: { color: 'rgba(240,253,244,0.7)', font: { size: 11 }, boxWidth: 10, boxHeight: 10, usePointStyle: true } }
				},
				scales: { ...commonOpts.scales, y: { ...commonOpts.scales.y, min: 0, ticks: { ...commonOpts.scales.y.ticks, callback: (v: any) => bytes(v) + '/s' } } }
			}
		});
	}

	const sysInfoItems = $derived(node ? [
		{ label: '主机名', value: node.host || '—' },
		{ label: '系统', value: node.os || '—' },
		{ label: 'CPU 核心', value: String(node.cpu) },
		{ label: '运行时间', value: uptimeStr(node.uptime_sec) },
		{ label: '更新于', value: node.updated_at ? new Date(node.updated_at).toLocaleTimeString('zh-CN') : '—' }
	] : []);

	let refreshInterval: ReturnType<typeof setInterval>;
	onMount(() => {
		loadNodeDetail();
		refreshInterval = setInterval(loadNodeDetail, 30000);
		return () => { clearInterval(refreshInterval); cpuChart?.destroy(); memChart?.destroy(); netChart?.destroy(); };
	});
</script>

{#if isLoading}
	<div class="flex items-center justify-center gap-2 py-12 text-sm" style="color: rgba(240,253,244,0.45);">
		<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4"/></svg>
		<span>加载中...</span>
	</div>
{:else if errMsg}
	<div class="flex flex-col items-center gap-3 py-12 text-sm" style="color: #ef4444;">
		<span>⚠️ {errMsg}</span>
		<button onclick={() => goto('/')} class="rounded-full px-4 py-2 text-xs font-medium transition-colors" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">返回首页</button>
	</div>
{:else if node}
	<div class="sticky top-14 z-40 mb-4 flex items-center gap-2.5 py-2">
		<button onclick={() => goto('/')} class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors" style="background:rgba(255,255,255,0.06);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);color:rgba(240,253,244,0.7);">
			<ArrowLeft size={15} /> 返回
		</button>
		<div class="flex items-center gap-2">
			<div class={node.online?'online-dot':'offline-dot'}></div>
			<span class="text-sm font-semibold" style="color:#f0fdf4;">{node.name}</span>
		</div>
		<span class="text-xs font-mono" style="color:rgba(240,253,244,0.45);">{node.host||''} · {node.os||''}</span>
		<span class="ml-auto text-xs" style="color:rgba(240,253,244,0.45);">{node.region||''}</span>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-3 gap-3">
				<div class="rounded-xl px-3.5 py-3 preset-glass-bg card-glow">
					<div class="text-[11px] font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.04em;">CPU 使用</div>
					<div class="mt-1 text-base font-bold font-mono" style="color:#f0fdf4;">{node.cpu_usage.toFixed(1)}%</div>
					<div class="mt-1.5 bar-bg"><div class="bar-fill {metricClass(node.cpu_usage)}" style="transform:scaleX({Math.min(node.cpu_usage/100,1)});"></div></div>
					<div class="mt-1 text-[11px] font-mono" style="color:rgba(240,253,244,0.45);">核心: {node.cpu}</div>
				</div>
				<div class="rounded-xl px-3.5 py-3 preset-glass-bg card-glow">
					<div class="text-[11px] font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.04em;">内存</div>
					<div class="mt-1 text-base font-bold font-mono" style="color:#f0fdf4;">{bytes(node.mem_used)}</div>
					<div class="mt-1.5 bar-bg"><div class="bar-fill mem" style="transform:scaleX({Math.min((node.mem_used/node.memory_total)||0,1)});"></div></div>
					<div class="mt-1 text-[11px] font-mono" style="color:rgba(240,253,244,0.45);">总量: {bytes(node.memory_total)}</div>
				</div>
				<div class="rounded-xl px-3.5 py-3 preset-glass-bg card-glow">
					<div class="text-[11px] font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.04em;">磁盘</div>
					<div class="mt-1 text-base font-bold font-mono" style="color:#f0fdf4;">{bytes(node.disk_used)}</div>
					<div class="mt-1.5 bar-bg"><div class="bar-fill disk" style="transform:scaleX({Math.min((node.disk_used/node.disk_total)||0,1)});"></div></div>
					<div class="mt-1 text-[11px] font-mono" style="color:rgba(240,253,244,0.45);">总量: {bytes(node.disk_total)}</div>
				</div>
			</div>

			<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">CPU 历史</span>
					<span class="text-xs font-mono font-semibold" style="color:#10b981;">{cpuPoints.length>0?cpuPoints[cpuPoints.length-1].toFixed(1):'0.0'}%</span>
				</div>
				<canvas bind:this={cpuCanvas} style="height:130px;width:100%;"></canvas>
			</div>

			<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">内存历史</span>
					<span class="text-xs font-mono font-semibold" style="color:#818cf8;">{memPoints.length>0?memPoints[memPoints.length-1].toFixed(1):'0.0'}%</span>
				</div>
				<canvas bind:this={memCanvas} style="height:130px;width:100%;"></canvas>
			</div>

			<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">网络流量</span>
					<div class="flex items-center gap-3 text-xs font-mono font-semibold">
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full" style="background:#10b981;"></span>↓{bytes(node.net_down)}/s</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full" style="background:#f59e0b;"></span>↑{bytes(node.net_up)}/s</span>
					</div>
				</div>
				<canvas bind:this={netCanvas} style="height:130px;width:100%;"></canvas>
			</div>
		</div>

		<div class="flex flex-col gap-4">
			<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
				<div class="mb-3 text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">系统信息</div>
				<div class="grid grid-cols-2 gap-x-4">
					{#each sysInfoItems as item}
						<div class="flex justify-between gap-2.5 border-b py-1.5 text-xs" style="border-color:rgba(255,255,255,0.1);">
							<span class="shrink-0" style="color:rgba(240,253,244,0.45);">{item.label}</span>
							<span class="truncate text-right font-mono" style="color:#f0fdf4;">{item.value}</span>
						</div>
					{/each}
				</div>
				<div class="mt-3 border-t pt-3" style="border-color:rgba(255,255,255,0.1);">
					<div class="flex gap-3 text-xs">
						<div class="flex items-center gap-1">
							<span style="color:rgba(240,253,244,0.45);">负载:</span>
							{#if node.load1 !== undefined}
								<span class="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={node.load1<1?'background:rgba(16,185,129,0.15);color:#10b981;':node.load1<2?'background:rgba(245,158,11,0.15);color:#f59e0b;':'background:rgba(239,68,68,0.15);color:#ef4444;'}>{node.load1.toFixed(1)}</span>
								<span style="color:rgba(240,253,244,0.45);">{node.load5?.toFixed(1)}/{node.load15?.toFixed(1)}</span>
							{:else}<span style="color:rgba(240,253,244,0.45);">—</span>{/if}
						</div>
						<div class="flex items-center gap-1 ml-3">
							<span style="color:rgba(240,253,244,0.45);">连接:</span>
							<strong style="color:#f0fdf4;">{node.connections??'—'}</strong>
						</div>
					</div>
				</div>
			</div>

			<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
				<div class="mb-2 text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">流量统计</div>
				<div class="space-y-2">
					<div class="flex items-center gap-1.5 text-xs font-mono">
						<span class="font-bold" style="color:#f59e0b;">↑</span>
						<span style="color:#f0fdf4;">{bytes(node.total_up)}</span>
						<span class="ml-auto text-[11px]" style="color:rgba(240,253,244,0.45);">上传总量</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs font-mono">
						<span class="font-bold" style="color:#10b981;">↓</span>
						<span style="color:#f0fdf4;">{bytes(node.total_down)}</span>
						<span class="ml-auto text-[11px]" style="color:rgba(240,253,244,0.45);">下载总量</span>
					</div>
					<div class="mt-1 bar-bg"><div class="bar-fill" style="transform:scaleX({Math.min(node.total_up/(node.total_up+node.total_down||1),1)});background:linear-gradient(90deg,#f59e0b,#10b981);"></div></div>
					<div class="text-[11px]" style="color:rgba(240,253,244,0.45);">上传占比</div>
				</div>
			</div>

			{#if node.price}
				<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
					<div class="mb-2 text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">计费信息</div>
					<div class="flex flex-wrap gap-2">
						<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono" style="border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f0fdf4;">💲 ${node.price.toFixed(2)} / {node.billing_cycle||'月'}</span>
						{#if node.expired_at}<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-mono" style="border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.04);color:#ef4444;">📅 {new Date(node.expired_at).toLocaleDateString('zh-CN')}</span>{/if}
					</div>
				</div>
			{/if}

			{#if node.tags&&node.tags.length>0}
				<div class="rounded-xl p-3.5 preset-glass-bg card-glow">
					<div class="mb-1.5 text-xs font-medium" style="color:rgba(240,253,244,0.45);letter-spacing:0.03em;">标签</div>
					<div class="flex flex-wrap gap-1.5">
						{#each node.tags as tag}
							<span class="rounded-full border px-2.5 py-1 text-xs" style="border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);backdrop-filter:blur(24px);color:#f0fdf4;">{tag}</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
/* v3 */
