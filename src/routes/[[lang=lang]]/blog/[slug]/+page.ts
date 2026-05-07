import { getPost } from '$lib/blog-posts';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Lightweight markdown → HTML (runs only at load time — consistent SSR/client)
function mdToHtml(md: string): string {
	const lines = md.trim().split('\n');
	const out: string[] = [];
	let inTable = false, tableHasHead = false, inList = false;
	let inCodeBlock = false, codeLang = '', codeLines: string[] = [];

	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const inline = (s: string) =>
		s
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`(.+?)`/g, '<code>$1</code>')
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

	const flushList = () => { if (inList) { out.push('</ul>'); inList = false; } };
	const flushTable = () => {
		if (inTable) {
			if (tableHasHead) out.push('</tbody>');
			out.push('</table></div>');
			inTable = false; tableHasHead = false;
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const line = raw.trimEnd();

		if (line.startsWith('```')) {
			if (!inCodeBlock) { flushList(); flushTable(); inCodeBlock = true; codeLang = line.slice(3).trim(); codeLines = []; }
			else { inCodeBlock = false; out.push(`<pre><code class="language-${esc(codeLang)}">${esc(codeLines.join('\n'))}</code></pre>`); }
			continue;
		}
		if (inCodeBlock) { codeLines.push(raw); continue; }

		if (line.startsWith('## ')) { flushList(); flushTable(); out.push(`<h2>${inline(esc(line.slice(3)))}</h2>`); continue; }
		if (line.startsWith('### ')) { flushList(); flushTable(); out.push(`<h3>${inline(esc(line.slice(4)))}</h3>`); continue; }

		if (line.startsWith('|')) {
			const cells = line.split('|').slice(1, -1).map(c => c.trim());
			if (!inTable) {
				flushList();
				const next = lines[i + 1] ?? '';
				if (next.match(/^\|[\s\-|]+\|$/)) {
					out.push('<div class="table-wrap"><table><thead><tr>' + cells.map(c => `<th>${inline(esc(c))}</th>`).join('') + '</tr></thead><tbody>');
					inTable = true; tableHasHead = true; i++;
				} else {
					out.push('<div class="table-wrap"><table><tbody><tr>' + cells.map(c => `<td>${inline(esc(c))}</td>`).join('') + '</tr>');
					inTable = true;
				}
			} else {
				out.push('<tr>' + cells.map(c => `<td>${inline(esc(c))}</td>`).join('') + '</tr>');
			}
			continue;
		}
		if (inTable) flushTable();

		if (line.startsWith('- ') || line.startsWith('* ')) {
			if (!inList) { flushTable(); out.push('<ul>'); inList = true; }
			out.push(`<li>${inline(esc(line.slice(2)))}</li>`);
			continue;
		}
		if (inList) flushList();
		if (line === '') { flushList(); flushTable(); continue; }
		out.push(`<p>${inline(esc(line))}</p>`);
	}
	flushList(); flushTable();
	return out.join('\n');
}

export const load: PageLoad = ({ params }) => {
	const post = getPost(params.slug);
	if (!post) error(404, { message: 'Article not found' });
	return { post, html: mdToHtml(post.content) };
};
