import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = await import(`../${params.path}/+page.svx?raw`);

	return new Response(file.default, {
		headers: {
			'Content-Type': 'text/markdown'
		}
	});
}