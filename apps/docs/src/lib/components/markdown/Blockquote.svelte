<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type ComponentProps = {
		class?: string;
		children?: Snippet;
		[prop: string]: unknown;
	};

	const { children, class: className = '', ...restProps }: ComponentProps = $props();
</script>

<blockquote
	{...restProps}
	class={cn(
		'bg-foreground rounded-2xl border border-primary px-5 py-3 text-base font-normal text-foreground-muted',
		className
	)}
>
	{@render children?.()}
</blockquote>