<script lang="ts">
	import { page } from '$app/state';
	import { sidebarOpen } from "$lib/stores.js";
	import {slide} from "svelte/transition";
	import {quintInOut} from "svelte/easing";

	const exampleLinks = [
		{ href: '/examples/vertical', label: 'Vertical List' },
		{ href: '/examples/horizontal', label: 'Horizontal List' },
		{ href: '/examples/grid', label: 'Grid' },
		{ href: '/examples/multi-container', label: 'Multi Container' },
		{ href: '/examples/target-zones', label: 'Target Zones' },
		{ href: '/examples/custom-ghost', label: 'Custom Ghost' },
		{ href: '/examples/sortable-containers', label: 'Sortable Containers' },
		{ href: '/examples/vertical-sortable-containers', label: 'Vertical Sortable' },
		{ href: '/examples/virtualization', label: 'Virtualization' },
	];

	type NavLink = {
		href: string;
		label: string;
		children?: { href: string; label: string }[];
	};

	const docsLinks: NavLink[] = [
		{ href: '/docs/getting-started', label: 'Getting Started' },
		{
			href: '/docs/dnd-controller-api',
			label: 'Controller API',
			children: [
				{ href: '/docs/dnd-controller-api', label: 'DndController' },
				{ href: '/docs/simulations', label: 'Simulations' },
				{ href: '/docs/sensors', label: 'Sensors' },
				{ href: '/docs/collision', label: 'Collisions' },
				{ href: '/docs/modifiers', label: 'Modifiers' },
				{ href: '/docs/behaviors', label: 'Behaviors' },
				{ href: '/docs/accessibility', label: 'Accessibility' },
				{ href: '/docs/custom-strategies', label: 'Strategies' },
			]
		},
		{
			href: '/docs/components-api',
			label: 'Components API',
			children: [
				{ href: '/docs/components-api/DndProvider', label: 'DndProvider' },
				{ href: '/docs/components-api/DndDraggable', label: 'DndDraggable' },
				{ href: '/docs/components-api/DndDroppable', label: 'DndDroppable' },
			]
		},
		{ href: '/docs/css-custom-props', label: 'CSS Custom Props' },
		{ href: '/docs/html-attributes', label: 'HTML Attributes' },
		{ href: '/docs/faq', label: 'FAQ' },
	{
		href: '/docs/migrations',
		label: 'Migrations',
		children: [
			{ href: '/docs/migrations/v0.3.0', label: 'From v0.3.0' },
		]
	},
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}

	function isParentActive(link: NavLink): boolean {
		if (isActive(link.href)) return true;
		return link.children?.some(child => isActive(child.href)) ?? false;
	}

	let openSections: Record<string, boolean> = $state(
		Object.fromEntries(docsLinks.filter(l => l.children).map(l => [l.href, true]))
	);

	function toggleSection(href: string) {
		openSections[href] = !openSections[href];
	}

	$effect(() => {
		docsLinks.forEach(link => {
			if (link.children?.some(child => isActive(child.href))) {
				openSections[link.href] = true;
			}
		});
	});

	function goto(value: string) {

	}
</script>

{#if $sidebarOpen}
	<aside transition:slide|local={{ duration: 300, easing: quintInOut, axis: 'x' }} class="flex absolute lg:relative h-screen flex-col whitespace-nowrap w-64 divide-y-2 divide-primary shrink-0 bg-foreground text-white border-r-2 border-primary overflow-y-auto">
		<div class="p-3 flex flex-col gap-3">
			<div class="flex items-center justify-between">
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
			<label class="shrink-0 bg-primary hover:bg-primary-hover p-2 px-3 rounded-xl text-neutral-500 w-full">
				<select onchange={(e) => {
					if(e.currentTarget.value) window.location.href = e.currentTarget.value
				}} class="w-full focus:outline-none">
					<option value="https://v1.svelte-dnd.vercel.app/">v1.0.0</option>
					<option value="https://svelte-dnd.vercel.app/">v0.3.0</option>
				</select>
			</label>
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
							{#if link.children}
								<button
									onclick={() => toggleSection(link.href)}
									class="sidebar-item w-full flex items-center justify-between"
									class:active={isParentActive(link)}
								>
									<span>{link.label}</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-4 h-4 shrink-0 transition-transform duration-200"
										class:rotate-180={openSections[link.href]}
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
								{#if openSections[link.href]}
									<ul transition:slide|global={{ duration: 200, easing: quintInOut }} class="flex flex-col gap-1 mt-1 ml-3 border-l border-primary pl-2">
										{#each link.children as child}
											<li>
												<a
												href={child.href}
												class:active={isActive(child.href)}
												class="sidebar-item text-sm"
												>
												{child.label}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							{:else}
								<a
								href={link.href}
								class:active={isActive(link.href)}
								class="sidebar-item"
								>
								{link.label}
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</nav>
	</aside>
{/if}