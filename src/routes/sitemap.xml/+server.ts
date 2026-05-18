// src/routes/sitemap.xml/+server.ts
// export const prerender = true;

import { languages } from '$lib/i18n/languages';
import type { RequestHandler } from './$types';

// ── Config ────────────────────────────────────────────────────────────────────

const SITE_URL = 'https://squishyfile.com';
const STATIC_PAGES = ['', 
	'compress-video', 
	'compress-pdf', 
	'video-to-mp3',
	'video-converter', 
	'mov-to-mp4',
	'avi-to-mp4',
	'mkv-to-mp4',
	'webm-to-mp4',
	'blog'
	] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function url(lang: string, ...segments: string[]): string {
	const parts = lang === 'en' ? segments : [lang, ...segments];
	return `${SITE_URL}/${parts.filter(Boolean).join('/')}`;
}

function xmlEscape(s: string) {
	return s.replace(/&/g, '&amp;');
}

function urlTag(loc: string, changefreq: string, priority: string, lastmod?: string) {
	const lines = [
		'  <url>',
		`    <loc>${xmlEscape(loc)}</loc>`,
	];

	if (lastmod) {
		lines.push(`    <lastmod>${lastmod}</lastmod>`);
	}

	lines.push(
		`    <changefreq>${changefreq}</changefreq>`,
		`    <priority>${priority}</priority>`,
		'  </url>'
	);

	return lines.join('\n');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const GET: RequestHandler = () => {
	const entries: string[] = [];

	// 1. Static pages
	for (const lang of languages) {
		for (const page of STATIC_PAGES) {
			const isHome = page === '';
			entries.push(urlTag(
				url(lang.key, page),
				isHome ? 'weekly' : 'monthly',
				isHome ? '1.0' : '0.8'
			));
		}
	}

	// 2. Blog posts - Dùng lại y hệt logic trong +page.server.ts của bạn
	const files = import.meta.glob('/src/lib/contents/blog/**/*.md', { query: '?raw', import: 'default', eager: true });

	for (const path in files) {
		const rawContent = files[path] as string;
		const pathParts = path.split('/');
		const slug = pathParts.pop()?.replace('.md', '');
		const fileLang = pathParts.pop();

		if (fileLang && slug) {
			// Bóc Frontmatter y như cách bạn làm
			const match = /---\r?\n([\s\S]+?)\r?\n---/.exec(rawContent);
			let lastmod: string | undefined = undefined;

			if (match) {
				const fmText = match[1];
				fmText.split('\n').forEach(line => {
					const [key, ...value] = line.split(':');
					if (key?.trim() === 'date' && value.length) {
						// Format lại tí cho chắc ăn ngày tháng hợp chuẩn sitemap (YYYY-MM-DD)
						// Thường date của bạn đang viết kiểu '2023-10-25' thì lấy luôn cũng được
						lastmod = value.join(':').trim(); 
					}
				});
			}

			entries.push(urlTag(
				url(fileLang, 'blog', slug),
				'monthly',
				'0.6',
				lastmod
			));
		}
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
		},
	});
};
