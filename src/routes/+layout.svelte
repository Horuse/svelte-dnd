<script lang="ts">
	import Header from '$docs/components/header.svelte';
	import Sidebar from '$docs/components/sidebar.svelte';
	import '../app.css';
	import { browser } from "$app/environment";
	import { themeStore } from '$docs/stores.js';

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

<div class="flex h-screen overflow-hidden">
	<Sidebar />

	<div class="flex flex-col flex-1 overflow-hidden">
		<Header/>

		<main class="flex-1 overflow-y-auto p-6">
			{@render children()}
		</main>
	</div>
</div>
