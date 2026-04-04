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

<thead
	{...restProps}
	class={cn('overflow-hidden rounded-t-lg border-b border-primary bg-foreground', className)}
>
	{@render children?.()}
</thead>
