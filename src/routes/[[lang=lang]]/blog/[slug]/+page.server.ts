import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { marked } from 'marked';

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang || 'en';
	const slug = params.slug;

	try {
		// Import raw file cụ thể dựa vào lang và slug
		const modules = import.meta.glob('/src/lib/contents/blog/**/*.md', { query: '?raw', import: 'default' });
		const filePath = `/src/lib/contents/blog/${lang}/${slug}.md`;
		
		if (!modules[filePath]) {
			throw new Error('Not found');
		}

		// Chờ load nội dung file
		const rawContent = (await modules[filePath]()) as string;

		// Bóc tách Frontmatter và Nội dung Markdown
		const match = /---\r?\n([\s\S]+?)\r?\n---/.exec(rawContent);
		let metadata: Record<string, string> = {};
		let markdownContent = rawContent;

		if (match) {
			const fmText = match[1];
			// Cắt bỏ phần Frontmatter để lấy lõi content
			markdownContent = rawContent.slice(match[0].length);
			
			fmText.split('\n').forEach(line => {
				const [key, ...value] = line.split(':');
				if (key && value.length) metadata[key.trim()] = value.join(':').trim();
			});
		}

		// Dùng Marked để parse Markdown thuần sang HTML
		// Gọi trên server nên siêu nhẹ và cực chuẩn SEO
		const htmlContent = await marked.parse(markdownContent);

		return {
			meta: metadata,
			content: htmlContent
		};
	} catch (e) {
		throw error(404, ``);
	}
};
