import type { RequestHandler } from './$types'
import { allManifest, groupBySection, type ManifestSection } from '$lib/utils/docs-manifest'
import { siteConfig } from '$lib/site-config'

export const prerender = true

const SECTION_ORDER: ManifestSection[] = ['Docs', 'Components', 'Migrations', 'Examples']

export const GET: RequestHandler = () => {
	const groups = groupBySection(allManifest)

	const lines: string[] = []
	lines.push(`# ${siteConfig.pkg}`)
	lines.push('')
	lines.push(siteConfig.tagline)
	lines.push('')

	for (const section of SECTION_ORDER) {
		const items = groups.get(section)
		if (!items?.length) continue
		lines.push(`## ${section}`)
		lines.push('')
		for (const e of items) {
			// /docs/* has a SvelteKit handler that serves raw markdown at `<href>.md`.
			const href = e.href.startsWith('/docs/') ? `${e.href}.md` : e.href
			const desc = e.description ? `: ${e.description}` : ''
			lines.push(`- [${e.title}](${href})${desc}`)
		}
		lines.push('')
	}

	return new Response(lines.join('\n'), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	})
}
