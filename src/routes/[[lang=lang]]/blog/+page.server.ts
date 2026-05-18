import type { PageServerLoad } from './$types';

type FrontmatterValue = string | Record<string, string>;

function parseFrontmatter(fmText: string) {
	const metadata: Record<string, FrontmatterValue> = {};
	let currentObjectKey: string | null = null;

	fmText.split('\n').forEach((line) => {
		if (!line.trim()) return;

		const isNestedLine = /^\s+/.test(line);
		const [rawKey, ...rawValue] = line.split(':');

		const key = rawKey.trim();
		const value = rawValue.join(':').trim();

		if (!key) return;

		if (isNestedLine && currentObjectKey) {
			const current = metadata[currentObjectKey];

			if (!current || typeof current === 'string') {
				metadata[currentObjectKey] = {};
			}

			(metadata[currentObjectKey] as Record<string, string>)[key] = value;
			return;
		}

		if (!value) {
			metadata[key] = {};
			currentObjectKey = key;
			return;
		}

		metadata[key] = value;
		currentObjectKey = null;
	});

	return metadata;
}

function getString(value: FrontmatterValue | undefined, fallback = '') {
	return typeof value === 'string' ? value : fallback;
}

export const load: PageServerLoad = async ({ params }) => {
	const lang = params.lang || 'en';

	// Dùng Vite lấy tất cả file markdown dưới dạng Raw Text
	const files = import.meta.glob('/src/lib/contents/blog/**/*.md', {
		query: '?raw',
		import: 'default',
		eager: true
	});

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
			let metadata: Record<string, FrontmatterValue> = {};

			if (match) {
				metadata = parseFrontmatter(match[1]);
			}

			posts.push({
				slug,
				title: getString(metadata.title, 'No Title'),
				description: getString(metadata.description),
				date: getString(metadata.date)
			});
		}
	}

	// Sắp xếp bài mới nhất lên trên
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return { posts };
};
