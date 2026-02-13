<script lang="ts">
	import ContentsList from '$docs/components/contentsList.svelte';

	const { children } = $props();
</script>

<div class="flex justify-center gap-8 max-w-7xl mx-auto px-4 py-8">
	<article class="prose prose-theme max-w-3xl min-w-0 flex-1">
		{@render children()}
	</article>

	<aside class="hidden xl:block w-56 shrink-0">
		<ContentsList contentSelector=".prose" scrollSelector="main" />
	</aside>
</div>