<script lang="ts">
	import { page } from '$app/state';
	import { sidebarOpen } from "$lib/stores.js";
	import {slide} from "svelte/transition";
	import {quintInOut} from "svelte/easing";

	const exampleLinks = [
		{ href: '/examples/vertical', label: 'Vertical List' },
		{ href: '/examples/horizontal', label: 'Horizontal List' },
		{ href: '/examples/multi-container', label: 'Multi Container' },
		{ href: '/examples/custom-ghost', label: 'Custom Ghost' },
		{ href: '/examples/sortable-containers', label: 'Sortable Containers' }
	];

	const docsLinks = [
		{ href: '/docs/getting-started', label: 'Getting Started' },
		{ href: '/docs/faq', label: 'FAQ' },
		{ href: '/docs/components-api', label: 'Components API' },
		{ href: '/docs/css-custom-props', label: 'CSS Custom Props' },
		{ href: '/docs/drag-controller-api', label: 'DragController API' },
		{ href: '/docs/simulations', label: 'Simulations' },
		{ href: '/docs/html-attributes', label: 'HTML Attributes' },
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}

</script>

{#if $sidebarOpen}
	<aside transition:slide|local={{ duration: 300, easing: quintInOut, axis: 'x' }} class="flex absolute lg:relative h-screen flex-col whitespace-nowrap w-64 divide-y-2 divide-primary shrink-0 bg-foreground text-white border-r-2 border-primary overflow-y-auto">
		<div class="flex h-14 items-center justify-between p-2 pl-5">
			<a href="/" class="text-theme font-bold">@horuse/svelte-dnd</a>
			<button
				onclick={() => ($sidebarOpen = false)}
				class="black-button size-9"
				aria-label="Close sidebar"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>

		<nav class="flex flex-col gap-6 p-2 py-3">
			<div>
				<h3 class="text-sm font-semibold ml-3 uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Examples</h3>
				<ul class="flex flex-col gap-1">
					{#each exampleLinks as link}
						<li>
							<a
								href={link.href}
								class:active={isActive(link.href)}
								class="sidebar-item"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>

			<div>
				<h3 class="text-sm font-semibold ml-3 uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Docs</h3>
				<ul class="flex flex-col gap-1">
					{#each docsLinks as link}
						<li>
							<a
								href={link.href}
								class:active={isActive(link.href)}
								class="sidebar-item"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</nav>


	</aside>
{/if}
