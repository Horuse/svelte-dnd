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

<a
	{...restProps}
	class={cn(
		'text-base font-medium tracking-normal text-indigo-500 underline decoration-dotted underline-offset-4 transition-[color] duration-150 ease-out hover:text-indigo-400',
		className
	)}
>
	{@render children?.()}
</a>
