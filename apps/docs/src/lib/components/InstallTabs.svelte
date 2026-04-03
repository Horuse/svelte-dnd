<script lang="ts">
	import CopyCodeButton from './markdown/CopyCodeButton.svelte';
	import { packageManagers, packageManagerStore, type PackageManagerSvelte } from '../stores/package-manager.svelte.ts';
	import { getHighlighter } from '$lib/utils/highlighter';
	import ShikiCodeBlock from '$lib/components/ShikiCodeBlock.svelte';

	type Props = {
		pkg: string;
		isDev?: boolean;
	};

	let { pkg, isDev = false }: Props = $props();

	const commands: Record<PackageManagerSvelte, string> = $derived({
		npm: `npm ${isDev ? 'install -D' : 'install'} ${pkg}`,
		pnpm: `pnpm add ${isDev ? '-D ' : ''}${pkg}`,
		bun: `bun add ${isDev ? '-D ' : ''}${pkg}`,
		yarn: `yarn add ${isDev ? '-D ' : ''}${pkg}`
	});

	const activeCommand = $derived(commands[packageManagerStore.active]);

	let highlightedCommands = $state({
		npm: null,
		pnpm: null,
		bun: null,
		yarn: null
	});

	$effect(() => {
		getHighlighter().then((highlighter) => {
			for (const pm of packageManagers) {
				const cmd = commands[pm];
				highlightedCommands[pm] = {
					light: highlighter.codeToHtml(cmd, {
						lang: 'bash',
						theme: 'github-light'
					}),
					dark: highlighter.codeToHtml(cmd, {
						lang: 'bash',
						theme: 'github-dark'
					})
				};
			}
		});
	});
</script>

<div class="w-full rounded-2xl border border-primary p-2 bg-foreground">
	<div class="flex items-center justify-between border-b border-border">
		<div class="flex items-center">
			{#each packageManagers as pm (pm)}
				<button
					onclick={() => (packageManagerStore.active = pm)}
					class={[
						"relative px-4 transition-all py-2 text-sm font-medium outline-none select-none",
						packageManagerStore.active === pm ? 'text-theme/70 bg-primary rounded-xl' : 'text-neutral-500 hover:text-theme'
					]}
				>
					{pm}
				</button>
			{/each}
		</div>
		<CopyCodeButton code={activeCommand} class="mr-4" />
	</div>
	<div class="min-h-12.5 p-4 [&>div]:mt-0 [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none [&>div]:[box-shadow:none]!">
		{#if highlightedCommands[packageManagerStore.active]}
			<ShikiCodeBlock
				code=""
				htmlLight={highlightedCommands[packageManagerStore.active]!.light}
				htmlDark={highlightedCommands[packageManagerStore.active]!.dark}
				unstyled={true}
			/>
		{:else}
			<code class="block font-mono text-sm leading-relaxed whitespace-pre text-foreground">
				{activeCommand}
			</code>
		{/if}
	</div>
</div>