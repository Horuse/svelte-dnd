<script lang="ts">
	import { onDestroy } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		code: string;
		class?: string;
	};

	const props = $props();
	const className = $derived((props as Props).class ?? '');
	const code = $derived((props as Props).code ?? '');

	let copied = $state(false);
	let timeoutId: number | null = null;
	let lastCode: string | null = null;

	async function handleCopy(value: string) {
		if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
			return;
		}

		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			if (timeoutId) {
				window.clearTimeout(timeoutId);
			}
			timeoutId = window.setTimeout(() => {
				copied = false;
				timeoutId = null;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy code snippet', error);
		}
	}

	onDestroy(() => {
		if (timeoutId) {
			window.clearTimeout(timeoutId);
			timeoutId = null;
		}
	});

	$effect(() => {
		if (lastCode === code) {
			return;
		}

		lastCode = code;
		copied = false;
		if (timeoutId) {
			window.clearTimeout(timeoutId);
			timeoutId = null;
		}
	});
</script>

<button
	type="button"
	class={'group transition-scale black-button size-7 rounded-lg duration-150 ease-out active:scale-[0.95]'}
	onclick={(event) => {
		event.stopPropagation();
		event.preventDefault();
		handleCopy(code);
	}}
	aria-label={copied ? 'Copied code' : 'Copy code'}
>
	<span class="sr-only">{copied ? 'Copied code' : 'Copy code'}</span>
	<span class={['transition-transform duration-150 ease-out', copied && 'scale-0 blur-[2px]']}>
		<svg class="size-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.503 4.627 5.5 6.75v10.504a3.25 3.25 0 0 0 3.25 3.25h8.616a2.251 2.251 0 0 1-2.122 1.5H8.75A4.75 4.75 0 0 1 4 17.254V6.75c0-.98.627-1.815 1.503-2.123ZM17.75 2A2.25 2.25 0 0 1 20 4.25v13a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-13A2.25 2.25 0 0 1 8.75 2h9Z" /></svg>
	</span>
	<span
		class={[
			'absolute transition-transform duration-150 ease-out',
			!copied && 'scale-0 blur-[2px]'
		]}
	>
		<svg class="size-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m8.5 16.586-3.793-3.793a1 1 0 0 0-1.414 1.414l4.5 4.5a1 1 0 0 0 1.414 0l11-11a1 1 0 0 0-1.414-1.414L8.5 16.586Z"/></svg>
	</span>
</button>
