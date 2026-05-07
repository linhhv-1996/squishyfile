import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang || 'en';
	
	// Dùng Vite lấy tất cả file markdown dưới dạng Raw Text
	const files = import.meta.glob('/src/lib/contents/blog/**/*.md', { query: '?raw', import: 'default', eager: true });
	
	const posts = [];

	for (const path in files) {
		const rawContent = files[path] as string;
		
		// Tách đường dẫn để lấy ngôn ngữ và slug bài viết
		const pathParts = path.split('/');
		const slug = pathParts.pop()?.replace('.md', '');
		const fileLang = pathParts.pop();

		// Chỉ lấy bài viết của ngôn ngữ hiện tại
		if (fileLang === lang && slug) {
			// Bóc tách Frontmatter bằng Regex đơn giản
			const match = /---\r?\n([\s\S]+?)\r?\n---/.exec(rawContent);
			let metadata: Record<string, string> = {};
			
			if (match) {
				const fmText = match[1];
				fmText.split('\n').forEach(line => {
					const [key, ...value] = line.split(':');
					if (key && value.length) metadata[key.trim()] = value.join(':').trim();
				});
			}
			
			posts.push({
				slug,
				title: metadata.title || 'No Title',
				description: metadata.description || '',
				date: metadata.date || ''
			});
		}
	}

	// Sắp xếp bài mới nhất lên trên
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return { posts };
};
