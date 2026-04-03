<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import CopyCodeButton from './CopyCodeButton.svelte';

	type ComponentProps = {
		class?: string;
		children?: Snippet;
		code?: string;
		unstyled?: boolean;
		[prop: string]: unknown;
	};

	const props = $props();
	const className = $derived((props as ComponentProps).class ?? '');
	const code = $derived((props as ComponentProps).code ?? '');
	const unstyled = $derived((props as ComponentProps).unstyled ?? false);
	const children = $derived((props as ComponentProps).children);
	const restProps = $derived(() => {
		const {
			class: _class,
			children: _children,
			code: _code,
			unstyled: _unstyled,
			...rest
		} = props as ComponentProps;
		return rest;
	});
</script>

<div
	{...restProps}
	class={'group/pre relative rounded-2xl border border-border bg-foreground border-primary p-4 font-mono text-base font-normal text-foreground'}
>
	<div class="overflow-x-auto">
		{@render children?.()}
	</div>
	{#if code}
		<button class="absolute top-2 right-2">
			<CopyCodeButton {code} />
		</button>
	{/if}
</div>

<style>
    :global(.shiki) {
        background-color: transparent !important;
        font-size: 14px;
        font-weight: 400;
    }
</style>