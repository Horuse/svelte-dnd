import type { RequestHandler } from './$types';
import { svxToMarkdown } from '$lib/utils/svx-to-markdown';

const rawFiles = import.meta.glob('../../../lib/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const GET: RequestHandler = async ({ params }) => {
	const file = await import(`../${params.path}/+page.svx?raw`);
	const content = svxToMarkdown(file.default, rawFiles, '../../../lib/');

	return new Response(content, {
		headers: { 'Content-Type': 'text/markdown' }
	});
};
