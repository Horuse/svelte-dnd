/**
 * Transforms raw .svx content into clean markdown for LLM consumption.
 * Replaces <ComponentPreview sources={[...]}> blocks with fenced code blocks,
 * and removes Svelte <script> blocks.
 *
 * @param content - raw .svx file content
 * @param rawFiles - result of import.meta.glob with { query: '?raw', eager: true },
 *                   keys must be relative to the calling file (e.g. '../../../lib/**\/*')
 * @param libPrefix - the glob key prefix that corresponds to '$lib/' (e.g. '../../../lib/')
 */
export function svxToMarkdown(
	content: string,
	rawFiles: Record<string, string>,
	libPrefix: string
): string {
	const rawImports = resolveRawImports(content, rawFiles, libPrefix);
	content = replaceComponentPreviews(content, rawImports);
	content = cleanSvelteScriptBlocks(content);
	return content;
}

function resolveRawImports(
	content: string,
	rawFiles: Record<string, string>,
	libPrefix: string
): Map<string, string> {
	const result = new Map<string, string>();
	const re = /import\s+(\w+)\s+from\s+'(\$lib\/[^']+)\?raw'/g;
	let m;
	while ((m = re.exec(content)) !== null) {
		const [, varName, libPath] = m;
		const globKey = libPath.replace('$lib/', libPrefix);
		const fileContent = rawFiles[globKey];
		if (fileContent !== undefined) {
			result.set(varName, fileContent);
		}
	}
	return result;
}

function replaceComponentPreviews(content: string, rawImports: Map<string, string>): string {
	return content.replace(/<ComponentPreview[\s\S]*?<\/ComponentPreview>/g, (block) => {
		const sourcesMatch = block.match(/sources=\{\[([\s\S]*?)\]\}/);
		if (!sourcesMatch) return '';

		const sourcesStr = sourcesMatch[1];
		const sourceRe = /\{\s*name:\s*'([^']+)'\s*,\s*code:\s*(\w+)(?:\s*,\s*language:\s*'([^']+)')?\s*\}/g;
		let out = '';
		let s;
		while ((s = sourceRe.exec(sourcesStr)) !== null) {
			const [, name, codeVar, lang = 'svelte'] = s;
			const code = rawImports.get(codeVar);
			if (code !== undefined) {
				out += `\`\`\`${lang}\n// ${name}\n${code}\n\`\`\`\n\n`;
			}
		}
		return out;
	});
}

function cleanSvelteScriptBlocks(content: string): string {
	return content.replace(/<script[\s\S]*?<\/script>\s*/g, '');
}
