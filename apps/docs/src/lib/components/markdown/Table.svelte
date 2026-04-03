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

<div class="card relative rounded-2xl bg-foreground border border-primary">
	<div class="w-full overflow-x-auto rounded-2xl">
		<table {...restProps} class={cn('w-full text-lg [&_code]:text-base', className)}>
			{@render children?.()}
		</table>
	</div>
</div>
