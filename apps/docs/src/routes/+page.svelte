<script lang="ts">
	import InstallTabs from '$lib/components/InstallTabs.svelte';
	import { ComponentPreview } from '$lib/components';
	import VerticalExampleCode from '$lib/examples/VerticalExample.svelte?raw';
	import VerticalExample from '$lib/examples/VerticalExample.svelte';
	import { siteConfig } from '$lib/site-config';

	const origin = new URL(siteConfig.url).origin;
	const title = `${siteConfig.name} — Drag and Drop for Svelte 5`;
	const canonical = `${origin}/`;
	const ogImage = new URL(siteConfig.ogImage, origin).href;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={siteConfig.description} />
	<meta name="keywords" content={siteConfig.keywords.join(', ')} />
	<meta name="author" content={siteConfig.author} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={siteConfig.description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={siteConfig.name} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={siteConfig.description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<div class="flex flex-col gap-14 max-w-4xl mx-auto w-full">

	<!-- Two-column hero -->
	<div class="grid grid-cols-2 gap-10 items-center pt-4">
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<h1 class="text-4xl font-mono font-black text-neutral-700 dark:text-neutral-200 tracking-tight leading-tight">
					@horuse/svelte-dnd
				</h1>
			</div>

			<p class="text-base text-neutral-500 leading-relaxed">
				A lightweight drag-and-drop library for <strong class="text-neutral-600 dark:text-neutral-300 font-semibold">Svelte 5</strong>.
				Vertical, horizontal, and grid layouts with smooth animations out of the box.
			</p>

			<ul class="flex flex-col gap-2.5">
				{#each [
					'Svelte 5 Runes — no legacy adapter',
					'Cross-container drag with slot collapse animation',
					'TypeScript + full event types',
					'Pointer & keyboard sensors built-in',
				] as feat}
					<li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
						<span class="font-bold">-</span>
						{feat}
					</li>
				{/each}
			</ul>

			<div class="flex gap-3">
				<a href="/docs/getting-started" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors">
					Getting Started
				</a>
			</div>
		</div>

		<img src="/preview.gif" class="rounded-xl border border-primary shadow-xl w-full" alt="svelte-dnd demo" />
	</div>

	<!-- Discover -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<a
				href="/examples/vertical"
				class="group hover:bg-primary transition-all hover:border-primary-hover bg-foreground gap-3 flex flex-col rounded-2xl p-6 border border-primary"
		>
			<div class="flex items-center gap-2.5">
				<h3 class="text-2xl font-bold text-neutral-700 dark:text-neutral-200">Examples</h3>
			</div>
			<p class="text-sm text-neutral-500 leading-relaxed">
				Live, runnable demos for every layout — vertical, horizontal, grid, multi-container, virtualized lists, custom ghost, and more.
			</p>
			<span class="text-sm mt-auto text-indigo-500 group-hover:translate-x-1 transition-transform">
				Browse examples →
			</span>
		</a>

		<a
				href="/llms.txt"
				class="group hover:bg-primary transition-all hover:border-primary-hover bg-foreground gap-3 flex flex-col rounded-2xl p-6 border border-primary">

			<div class="flex items-center gap-2.5">
				<h3 class="text-2xl font-bold text-neutral-700 dark:text-neutral-200">llms.txt</h3>
			</div>
			<p class="text-sm text-neutral-500 leading-relaxed">
				Drop the docs into Claude, ChatGPT, or Cursor. A concise index of every page in
				<span href="https://llmstxt.org" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">llms.txt</span>
				format.
			</p>
			<span class="text-sm mt-auto text-indigo-500 group-hover:translate-x-1 transition-transform">
				Open llms.txt →
			</span>
		</a>
	</div>

	<!-- Install -->
	<div class="flex flex-col gap-3">
		<h2 class="text-xl font-bold text-neutral-700 dark:text-neutral-300">Installation</h2>
		<InstallTabs pkg="@horuse/svelte-dnd" />
	</div>

	<!-- Quick start -->
	<div class="flex flex-col gap-3">
		<h2 class="text-xl font-bold text-neutral-700 dark:text-neutral-300">Quick start</h2>
		<ComponentPreview showPreview={false} sources={[{ name: 'VerticalExample.svelte', code: VerticalExampleCode, language: 'svelte' }]}>
		</ComponentPreview>
	</div>

</div>
