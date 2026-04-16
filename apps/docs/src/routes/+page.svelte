<script lang="ts">
	import InstallTabs from '$lib/components/InstallTabs.svelte';
	import { ComponentPreview } from '$lib/components';
	import VerticalExampleCode from '$lib/examples/VerticalExample.svelte?raw';
	import VerticalExample from '$lib/examples/VerticalExample.svelte';
</script>

<div class="flex flex-col gap-14 max-w-4xl mx-auto w-full">

	<!-- Two-column hero -->
	<div class="grid grid-cols-2 gap-10 items-center pt-4">
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<h1 class="text-5xl font-black text-neutral-700 dark:text-neutral-200 tracking-tight leading-tight">
					svelte-dnd
				</h1>
				<span class="self-start mt-2 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 text-xs font-bold">beta</span>
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
					<li class="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
						<span class="text-indigo-500 font-bold mt-0.5 shrink-0">✓</span>
						{feat}
					</li>
				{/each}
			</ul>

			<div class="flex gap-3">
				<a href="/docs/getting-started" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors">
					Get Started →
				</a>
				<a href="/examples/vertical" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-second text-neutral-500 font-semibold text-sm hover:bg-second transition-colors">
					Examples
				</a>
			</div>
		</div>

		<img src="/preview.gif" class="rounded-xl border border-primary shadow-xl w-full" alt="svelte-dnd demo" />
	</div>

	<!-- Install -->
	<div class="flex flex-col gap-3">
		<h2 class="text-xl font-bold text-neutral-700 dark:text-neutral-300">Installation</h2>
		<InstallTabs pkg="@horuse/svelte-dnd@1.0.0-beta.1" />
	</div>

	<!-- Quick start -->
	<div class="flex flex-col gap-3">
		<h2 class="text-xl font-bold text-neutral-700 dark:text-neutral-300">Quick start</h2>
		<ComponentPreview showPreview={false} sources={[{ name: 'VerticalExample.svelte', code: VerticalExampleCode, language: 'svelte' }]}>
		</ComponentPreview>
	</div>

</div>
