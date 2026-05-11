<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig } from '$lib/site-config.js';

	type VersionEntry = { label: string; url: string };

	const FALLBACK: VersionEntry[] = [
		{ label: siteConfig.version, url: siteConfig.url + '/' }
	];

	const SOURCE_URL =
		'https://raw.githubusercontent.com/Horuse/svelte-dnd/main/versions.json';

	let versions = $state<VersionEntry[]>(FALLBACK);

	onMount(async () => {
		try {
			const res = await fetch(SOURCE_URL, { cache: 'no-cache' });
			if (!res.ok) return;
			const data = (await res.json()) as VersionEntry[];
			if (Array.isArray(data) && data.length > 0) versions = data;
		} catch {
			// keep fallback
		}
	});
</script>

<label class="shrink-0 bg-primary hover:bg-primary-hover p-2 px-3 rounded-xl text-neutral-500 w-full">
	<select
		onchange={(e) => {
			if (e.currentTarget.value) window.location.href = e.currentTarget.value;
		}}
		class="w-full focus:outline-none"
	>
		{#each versions as v (v.label)}
			<option value={v.url} selected={v.label === siteConfig.version}>{v.label}</option>
		{/each}
	</select>
</label>
