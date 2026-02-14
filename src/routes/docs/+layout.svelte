<script lang="ts">
	import ContentsList from '$docs/components/contentsList.svelte';

	const { children } = $props();
</script>

<div class="flex mb-32 justify-center gap-8 max-w-7xl mx-auto px-4 py-8">
	<article class="prose max-w-3xl min-w-0 flex-1">
		{@render children()}
	</article>

	<aside class="hidden xl:block w-56 shrink-0">
		<ContentsList contentSelector=".prose" scrollSelector="main" />
	</aside>
</div>