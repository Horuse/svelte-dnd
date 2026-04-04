<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		children,
		title
	} = $props<{
		class?: string;
		children?: Snippet;
		title?: string;
	}>();
</script>

<div class={cn('relative pl-10', className)}>
	{#if title}
		<div class="flex h-10 items-center">
			<div
				class="absolute -left-5 flex size-10 rounded-full"
			>
				<span
					class="card flex h-full w-full border text-lg border-primary items-center justify-center rounded-full bg-foreground  font-medium text-theme [counter-increment:step] before:content-[counter(step)]"
				>
				</span>
			</div>
			<h3 class="relative z-10 text-lg text-theme/90 leading-none font-medium tracking-tight">
				{title}
			</h3>
		</div>
	{:else}
		<div
			class="absolute -left-5 flex size-10 rounded-full"
		>
			<span
				class="card flex h-full w-full border text-lg border-primary items-center justify-center rounded-full bg-foreground  font-medium text-theme [counter-increment:step] before:content-[counter(step)]"
			>
			</span>
		</div>
	{/if}
	<div
		class={cn('text-base leading-relaxed tracking-normal text-neutral-500', !title && 'pt-2')}
	>
		{@render children?.()}
	</div>
</div>
