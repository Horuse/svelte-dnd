<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type ComponentProps = {
		class?: string;
		children?: Snippet;
		[prop: string]: unknown;
	};

	const { children, class: className = '', ...restProps }: ComponentProps = $props();

	const isBlock = (classValue: string | undefined, dataTheme: unknown) => {
		if (dataTheme !== undefined) return true;
		if (!classValue) return false;

		return classValue.split(/\s+/).some((token) => token.startsWith('language-'));
	};
</script>

{#if isBlock(typeof className === 'string' ? className : undefined, restProps['data-theme'])}
	<code
		{...restProps}
		class={cn('block font-mono text-sm leading-relaxed whitespace-pre', className)}
	>
		{@render children?.()}
	</code>
{:else}
	<code
		{...restProps}
		class={'rounded-lg relative box-decoration-clone inline w-fit bg-theme/10 text-theme/60 px-2 mx-1 py-0.5'}
	>
		{@render children?.()}
	</code>
{/if}