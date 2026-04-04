<script lang="ts">
	import ContentsList from '$lib/components/contentsList.svelte';

	const props = $props();
</script>


<div class="flex mb-32 justify-center gap-8 max-w-7xl mx-auto px-4 py-8">
	<article class="prose max-w-6xl min-w-0 flex-1">
		{@render props.children?.()}
	</article>

<!--	<aside class="hidden xl:block w-56 shrink-0">-->
<!--		<ContentsList contentSelector=".prose" scrollSelector="main" />-->
<!--	</aside>-->
</div>