<script lang="ts">
	import Header from '$lib/components/header.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import '../app.css';
	import { browser } from "$app/environment";
	import { themeStore } from '$lib/stores.js';

	const { children } = $props();

	if (browser) {
		if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
			document.documentElement.classList.add('dark')
			$themeStore = 'dark'
		} else {
			document.documentElement.classList.remove('dark')
			$themeStore = 'light'
		}
	}
</script>

<div class="flex h-screen w-full overflow-hidden">
	<Sidebar />

	<div class="flex flex-col w-full overflow-hidden">
		<Header/>

		<main class="overflow-y-auto w-full p-3 lg:p-6">
			{@render children()}
		</main>
	</div>
</div>
