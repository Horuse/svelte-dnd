import type { RequestHandler } from './$types'
import { docsManifest, examplesManifest } from '$lib/utils/docs-manifest'
import { siteConfig } from '$lib/site-config'

export const prerender = true

type SitemapEntry = {
	path: string
	lastmod?: string
	changefreq?: string
	priority?: string
}

const buildTimestamp = new Date().toISOString()

const staticPages: SitemapEntry[] = [
	{ path: '/', lastmod: buildTimestamp, changefreq: 'monthly', priority: '1.0' },
	{ path: '/llms.txt', lastmod: buildTimestamp, changefreq: 'monthly', priority: '0.4' }
]

const toAbsoluteUrl = (origin: string, path: string) => new URL(path, origin).href

const toLastmodIso = (modified: string | undefined): string => {
	if (!modified) return buildTimestamp
	const d = new Date(modified)
	return Number.isNaN(d.valueOf()) ? buildTimestamp : d.toISOString()
}

const createUrlEntry = (origin: string, entry: SitemapEntry) => {
	const loc = toAbsoluteUrl(origin, entry.path)
	const lastmod = entry.lastmod ?? buildTimestamp
	const changefreqTag = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''
	const priorityTag = entry.priority ? `<priority>${entry.priority}</priority>` : ''
	return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod>${changefreqTag}${priorityTag}</url>`
}

const dedupeEntries = (entries: SitemapEntry[]) => {
	const map = new Map<string, SitemapEntry>()
	for (const entry of entries) {
		if (!map.has(entry.path)) map.set(entry.path, entry)
	}
	return Array.from(map.values())
}

export const GET: RequestHandler = () => {
	const canonicalOrigin = new URL(siteConfig.url).origin

	const docEntries: SitemapEntry[] = docsManifest.map((doc) => ({
		path: doc.href,
		lastmod: toLastmodIso(doc.modified),
		changefreq: 'monthly',
		priority: '0.8'
	}))

	const exampleEntries: SitemapEntry[] = examplesManifest.map((ex) => ({
		path: ex.href,
		lastmod: toLastmodIso(ex.modified),
		changefreq: 'monthly',
		priority: '0.7'
	}))

	const uniqueEntries = dedupeEntries([...staticPages, ...docEntries, ...exampleEntries])

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
		uniqueEntries.map((entry) => createUrlEntry(canonicalOrigin, entry)).join('') +
		`</urlset>`

	return new Response(body, {
		headers: {
			'content-type': 'application/xml',
			'cache-control': 'public, max-age=3600'
		}
	})
}
