import adapter from '@sveltejs/adapter-auto';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki'

const highlighterPromise = createHighlighter({
	themes: ['github-dark'],
	langs: ['javascript', 'bash', 'typescript', 'css', 'html', 'svelte']
})

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx', '.md'],
	preprocess: [mdsvex({
		extensions: ['.svx', '.md'],
		highlight: {
			highlighter: async (code, lang = 'text') => {
				const highlighter = await highlighterPromise
				const html = highlighter.codeToHtml(code, {
					lang,
					theme: 'github-dark'
				});
				return `{@html \`${html}\` }`
			}
		},
	})],
	kit: {
		alias: {
			'$docs/*': 'src/docs/*',
		},
		adapter: adapter()
	}
};

export default config;
