<script lang="ts">
	import ContentsList from '$lib/components/contentsList.svelte';
	import { page } from '$app/state';
	import { findManifestEntry } from '$lib/utils/docs-manifest';
	import { siteConfig } from '$lib/site-config';

	const props = $props();

	const origin = new URL(siteConfig.url).origin;
	const entry = $derived(findManifestEntry(page.url.pathname));
	const title = $derived(
		entry?.title ? `${entry.title} — ${siteConfig.name}` : `Examples — ${siteConfig.name}`
	);
	const description = $derived(entry?.description || siteConfig.description);
	const canonical = $derived(new URL(page.url.pathname, origin).href);
	const ogImage = $derived(new URL(siteConfig.ogImage, origin).href);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="article" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={siteConfig.name} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>


<div class="flex mb-32 justify-center gap-8 max-w-7xl mx-auto px-4 py-8">
	<article class="prose max-w-6xl min-w-0 flex-1">
		{@render props.children?.()}
	</article>

<!--	<aside class="hidden xl:block w-56 shrink-0">-->
<!--		<ContentsList contentSelector=".prose" scrollSelector="main" />-->
<!--	</aside>-->
</div>
