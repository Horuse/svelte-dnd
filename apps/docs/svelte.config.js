import adapter from '@sveltejs/adapter-auto';
import { escapeSvelte, mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import { fileURLToPath } from 'node:url';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';


const markdownLayout = fileURLToPath(
	new URL('./src/lib/components/mdsvex.svelte', import.meta.url)
);

const themes = {
	light: 'github-light',
	dark: 'github-dark'
};

const highlighter = await createHighlighter({
	themes: Object.values(themes),
	langs: ['svelte', 'bash', 'json', 'typescript', 'html']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md', '.svx'],
	preprocess: [
		mdsvex({
			extensions: ['.md', '.svx'],
			layout: {
				_: markdownLayout
			},
			highlight: {
				highlighter: async (code, lang = 'text') => {
					const lightHtml = escapeSvelte(
						highlighter.codeToHtml(code, {
							lang,
							theme: themes.light
						})
					);
					const darkHtml = escapeSvelte(
						highlighter.codeToHtml(code, {
							lang,
							theme: themes.dark
						})
					);
					const htmlLightProp = JSON.stringify(lightHtml);
					const htmlDarkProp = JSON.stringify(darkHtml);
					const langProp = JSON.stringify(lang);
					const rawProp = JSON.stringify(code);
					return `<svelte:component this={Reflect.get(globalThis, "__MarkdownPre")} lang={${langProp}} htmlLight={${htmlLightProp}} htmlDark={${htmlDarkProp}} raw={${rawProp}} />`;
				}
			}
		}),
		vitePreprocess()
	],
	kit: {
		alias: {
			'$docs/*': 'src/docs/*'
		},
		adapter: adapter()
	}
};

export default config;
