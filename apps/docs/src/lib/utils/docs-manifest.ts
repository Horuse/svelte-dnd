/**
 * Builds a lightweight manifest of every `+page.svx` file under
 * `src/routes/docs/**` and `src/routes/examples/**` from their YAML
 * frontmatter, without pulling the compiled mdsvex modules into the bundle.
 *
 * Used by `/llms.txt`, `/sitemap.xml`, and per-page SEO in docs/examples
 * layouts.
 */

const docsRaw = import.meta.glob('../../routes/docs/**/+page.svx', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>

const examplesRaw = import.meta.glob('../../routes/examples/**/+page.svx', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>

export type ManifestSection = 'Docs' | 'Components' | 'Migrations' | 'Examples'

export type ManifestEntry = {
	href: string
	title: string
	description: string
	section: ManifestSection
	source: string
	modified?: string
}

function parseFrontmatter(raw: string): Record<string, string> {
	const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
	if (!m) return {}
	const out: Record<string, string> = {}
	for (const line of m[1].split(/\r?\n/)) {
		const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.+?)\s*$/)
		if (kv) out[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '')
	}
	return out
}

function pathToHref(filePath: string): string {
	return filePath.replace(/^.*\/routes/, '').replace(/\/\+page\.svx$/, '')
}

function classify(href: string, override?: string): ManifestSection {
	if (override === 'Docs' || override === 'Components' || override === 'Migrations' || override === 'Examples') {
		return override
	}
	if (href.startsWith('/examples/')) return 'Examples'
	if (href.startsWith('/docs/components-api/')) return 'Components'
	if (href.startsWith('/docs/migrations/')) return 'Migrations'
	return 'Docs'
}

function buildEntry(filePath: string, raw: string): ManifestEntry {
	const fm = parseFrontmatter(raw)
	const href = pathToHref(filePath)
	const fallbackTitle = href.split('/').filter(Boolean).pop() ?? href
	return {
		href,
		title: fm.title || fallbackTitle,
		description: fm.description || '',
		section: classify(href, fm.category),
		source: filePath,
		modified: fm.modified || undefined
	}
}

function buildManifest(files: Record<string, string>): ManifestEntry[] {
	return Object.entries(files)
		.map(([p, raw]) => buildEntry(p, raw))
		.sort((a, b) => a.href.localeCompare(b.href))
}

export const docsManifest: ManifestEntry[] = buildManifest(docsRaw)
export const examplesManifest: ManifestEntry[] = buildManifest(examplesRaw)
export const allManifest: ManifestEntry[] = [...docsManifest, ...examplesManifest]

export function findManifestEntry(pathname: string | undefined): ManifestEntry | undefined {
	if (!pathname) return undefined
	const normalized = pathname.replace(/\/+$/, '') || '/'
	return allManifest.find((e) => e.href === normalized)
}

export function groupBySection(entries: ManifestEntry[]): Map<ManifestSection, ManifestEntry[]> {
	const groups = new Map<ManifestSection, ManifestEntry[]>()
	for (const e of entries) {
		const arr = groups.get(e.section) ?? []
		arr.push(e)
		groups.set(e.section, arr)
	}
	return groups
}
