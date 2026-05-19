<script lang="ts">
	import './+layout.css';
	import { state, refresh } from '$lib/state.svelte';
	import { onMount } from 'svelte';
	import { ChevronUp } from 'lucide-svelte';

	let scrolled = $state(false);

	let onlineNodes = $derived(state.nodes.filter((n) => n.online).length);
	let totalNodes = $derived(state.nodes.length);

	onMount(() => {
		refresh();
		const interval = setInterval(refresh, 30000);
		const onlineInterval = setInterval(async () => {
			const api = await import('$lib/api');
			const oc = await api.getOnlineCount();
			if (oc?.online !== undefined) state.onlineCount = oc.online;
		}, 60000);

		const scrollHandler = () => {
			scrolled = window.scrollY > 25;
		};
		window.addEventListener('scroll', scrollHandler);

		return () => {
			clearInterval(interval);
			clearInterval(onlineInterval);
			window.removeEventListener('scroll', scrollHandler);
		};
	});
</script>

<!-- Video Wallpaper Layer -->
<div class="fixed inset-0 -z-10 overflow-hidden">
	<picture>
		<source media="(min-width: 768px)" srcset="https://img.357561.xyz/image-wallpaper2.png" />
		<img
			src="https://img.357561.xyz/image-wallpaper2.png"
			alt="background"
			class="h-full w-full object-cover opacity-100 transition-opacity duration-600"
			style="filter: brightness(0.5)"
		/>
	</picture>
	<video
		src="https://img.357561.xyz/wallpaper1.mp4"
		class="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-600"
		style="filter: brightness(0.5)"
		muted
		loop
		playsinline
		autoplay
	></video>
</div>

<!-- Navbar -->
<nav class="sticky top-0 z-50 preset-glass-nav border-b" style="border-color: rgba(255,255,255,0.06);">
	<div class="mx-auto flex h-14 items-center gap-4 px-6" style="max-width: 1280px;">
		<a href="/" class="flex items-center gap-2 font-semibold no-underline" style="color: #f0fdf4; font-size: 15px;">
			{state.siteName}
		</a>

		<!-- Online Pill -->
		<div class="ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
			style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981;">
			<div class="online-dot" style="animation: pulse-dot 2s ease-in-out infinite;"></div>
			<span>{onlineNodes}/{totalNodes} 在线</span>
		</div>
	</div>
</nav>

<!-- Main Content -->
<main class="mx-auto px-6 py-6" style="max-width: 1280px;">
	{@render children()}
</main>

<!-- Footer -->
<footer class="border-t py-6 text-center text-xs" style="border-color: rgba(255,255,255,0.06); color: rgba(240,253,244,0.45);">
	<div class="mx-auto flex flex-col items-center gap-2 px-6 sm:flex-row sm:justify-between" style="max-width: 1280px;">
		<span style="font-weight: 600; color: #10b981;">{state.siteName}</span>
		<span>运行中 · 守护星辰</span>
		<span>Powered by GalaxyGlass v3</span>
	</div>
</footer>

<!-- Back to Top -->
{#if scrolled}
	<button
		onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		class="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:scale-110"
		style="background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #10b981; backdrop-filter: blur(20px);"
	>
		<ChevronUp size={20} />
	</button>
{/if}

<style>
	@keyframes pulse-dot {
		0%, 100% { opacity: 1; box-shadow: 0 0 4px #10b981; }
		50% { opacity: 0.6; box-shadow: 0 0 12px #10b981; }
	}
</style>
/* v3 */
