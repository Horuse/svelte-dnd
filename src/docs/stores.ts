import { writable } from 'svelte/store';
import { browser } from '$app/environment'
import { withoutTransition } from './utils/transition.js'

export const sidebarOpen = writable(true);



const themeStorage = browser ? window.localStorage.getItem('theme') : 'dark'

export const themeStore = writable<string>(themeStorage || 'dark')

themeStore.subscribe((value) => {
    if (browser) {
        window.localStorage.setItem('theme', value)

        withoutTransition(() => (value == 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')))
    }
})
