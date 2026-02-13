<script>
    import { sidebarOpen, themeStore } from "$docs/stores.js";
</script>

<header class="flex h-14 items-center p-2 gap-3 text-white bg-foreground border-b-2 border-primary">
    {#if !$sidebarOpen}
        <button
                onclick={() => ($sidebarOpen = true)}
                class="black-button size-9"
                aria-label="Open sidebar"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
        </button>
    {/if}

    <button class="ml-auto black-button size-9" aria-label="Theme toggle" onclick={() => ($themeStore == 'light' ? ($themeStore = 'dark') : ($themeStore = 'light'))}>
        <svg class="h-5 w-5 fill-current" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm0-2V4a8 8 0 1 1 0 16Z" /></svg>
    </button>
</header>