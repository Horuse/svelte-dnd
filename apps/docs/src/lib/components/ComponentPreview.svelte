<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { getHighlighter } from '$lib/utils/highlighter';
	import ShikiCodeBlock from './ShikiCodeBlock.svelte';
	import CopyCodeButton from './markdown/CopyCodeButton.svelte';
	import { packageManagerStore } from '$lib/stores/package-manager.svelte.ts';

	type SourceTab = {
		name: string;
		code: string;
		language?: string;
	};

	type ComponentProps = {
		code?: string;
		language?: string;
		label?: string;
		children?: Snippet;
		codeSlot?: Snippet;
		sources?: SourceTab[];
		class?: string;
		collapsible?: boolean;
		defaultExpanded?: boolean;
		showPreview?: boolean;
		[key: string]: unknown;
	};

	const {
		children,
		codeSlot,
		code: providedCode,
		language: providedLanguage,
		label: providedLabel,
		sources: providedSources,
		class: className = '',
		collapsible = false,
		defaultExpanded = false,
		showPreview = true,
		...restProps
	}: ComponentProps = $props();

	let expanded = $state(defaultExpanded);

	let previewKey = $state(0);

	const tabs = $derived(
		(() => {
			const normalized =
				providedSources?.filter((tab): tab is SourceTab => Boolean(tab?.code)) ?? [];

			if (normalized.length > 0) {
				return normalized;
			}

			if (providedCode) {
				return [
					{
						name: providedLabel ?? 'Code',
						code: providedCode,
						language: providedLanguage
					}
				];
			}

			return [];
		})() as SourceTab[]
	);

	let activeTab = $state(0);

	$effect(() => {
		void tabs;
		if (activeTab > tabs.length - 1) {
			activeTab = 0;
		}
	});

	const activeSource = $derived((tabs.at(activeTab) ?? null) as SourceTab | null);

	let highlightedSources = $state<Record<string, { light: string; dark: string }>>({});

	$effect(() => {
		getHighlighter().then((highlighter) => {
			tabs.forEach((tab) => {
				if (!highlightedSources[tab.name]) {
					const lang = tab.language ?? 'typescript';
					const light = highlighter.codeToHtml(tab.code, {
						lang,
						theme: 'github-light'
					});
					const dark = highlighter.codeToHtml(tab.code, {
						lang,
						theme: 'github-dark'
					});
					highlightedSources[tab.name] = { light, dark };
				}
			});
		});
	});
</script>

	<section class="flex h-full relative flex-col">
		{#if showPreview}
			<div class="flex w-full flex-1 flex-col p-4 lg:p-8 border rounded-2xl">
				{#key previewKey}
					{@render children?.()}
				{/key}
			</div>
		{/if}
		<div
			class="{showPreview ? 'mt-4' : ''} flex flex-1 flex-col overflow-hidden rounded-2xl border border-primary bg-foreground"
		>
			{#if tabs.length}
				<div class="flex items-center bg-foreground text-sm">
					<div class="flex flex-1 p-2 items-center overflow-x-auto">
						{#each tabs as tab, index (tab.name)}
							<button
								type="button"
								class={[
									"relative px-4 transition-all py-2 text-sm font-medium outline-none select-none",
									index === activeTab ? 'text-theme/70 bg-primary rounded-xl' : 'text-neutral-500 hover:text-theme'
								]}
								onclick={() => (activeTab = index)}
							>
								{tab.name}
							</button>
						{/each}
					</div>
					<div class="mr-3 w-fit flex-none">
						{#if activeSource}
							<CopyCodeButton class="size-6" code={activeSource.code} />
						{/if}
					</div>
				</div>
			{/if}
			<div class="relative" class:max-h-64={collapsible && !expanded} class:overflow-hidden={collapsible && !expanded}>
				<div class="overflow-auto p-4 text-sm *:mt-0 *:rounded-none *:border-0 *:bg-transparent *:p-0 *:inset-shadow-none">
					{#if activeSource}
						{#if highlightedSources[activeSource.name]}
							<ShikiCodeBlock
								code=""
								htmlLight={highlightedSources[activeSource.name].light}
								htmlDark={highlightedSources[activeSource.name].dark}
								unstyled={true}
							/>
						{:else}
							<pre class="p-4">{activeSource.code}</pre>
						{/if}
					{:else}
						{@render codeSlot?.()}
					{/if}
				</div>
				{#if collapsible && !expanded}
					<div class="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-foreground to-transparent pointer-events-none"></div>
					<div class="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
						<button onclick={() => (expanded = true)} class="black-button p-1 px-3 text-xs gap-2">
							<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
							Expand
						</button>
					</div>
				{/if}
				{#if collapsible && expanded}
					<div class="flex justify-center pb-2 pt-1">
						<button onclick={() => (expanded = false)} class="black-button p-1 px-3 text-xs gap-2">
							<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
							</svg>
							Collapse
						</button>
					</div>
				{/if}
			</div>
		</div>
	</section>