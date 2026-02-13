<script>
    import { sidebarOpen, themeStore } from "$docs/stores.js";
    import { blur } from "svelte/transition";
</script>

<header class="flex h-14 items-center p-2 gap-3 text-white bg-foreground border-b-2 border-primary">
    {#if !$sidebarOpen}
        <button
                transition:blur
                onclick={() => ($sidebarOpen = true)}
                class="black-button size-9"
                aria-label="Open sidebar"
        >
            <svg class="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0Z"/></svg>
        </button>
    {/if}

    <button class="ml-auto black-button size-9" aria-label="Theme toggle" onclick={() => ($themeStore == 'light' ? ($themeStore = 'dark') : ($themeStore = 'light'))}>
        <svg class="h-5 w-5 fill-current" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm0-2V4a8 8 0 1 1 0 16Z" /></svg>
    </button>
</header>