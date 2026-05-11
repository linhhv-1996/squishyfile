// src/routes/sitemap.xml/+server.ts
// Generates /sitemap.xml dynamically at request time.
// Reads blog slugs from the filesystem (works in Node adapter).
// For static/Cloudflare adapter → use generate-sitemap.ts script instead.

import { languages } from '$lib/i18n/languages';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

// ── Config ────────────────────────────────────────────────────────────────────

const SITE_URL = 'https://squishyfile.com';

/** Static pages (empty string = homepage) */
const STATIC_PAGES = ['', 'compress-video', 'compress-pdf', 'blog'] as const;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Hreflang {
  lang: string;
  href: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** English → no lang prefix; others → /<lang>/... */
function url(lang: string, ...segments: string[]): string {
  const parts = lang === 'en' ? segments : [lang, ...segments];
  return `${SITE_URL}/${parts.filter(Boolean).join('/')}`;
}

/** Lấy slug và ngày chỉnh sửa cuối của bài viết blog */
function getBlogData(langKey: string): { slug: string; lastmod: string }[] {
  const dir = path.resolve(`src/lib/contents/blog/${langKey}`);
  if (!fs.existsSync(dir)) return [];
  
  return fs
    .readdirSync(dir)
    .filter(f => /\.mdx?$/.test(f))
    .map(f => {
      const filePath = path.join(dir, f);
      const stats = fs.statSync(filePath);
      // Chuyển mtime thành định dạng YYYY-MM-DD chuẩn SEO
      const lastmod = stats.mtime.toISOString().split('T')[0]; 
      
      return {
        slug: f.replace(/\.mdx?$/, ''),
        lastmod
      };
    });
}

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;');
}

/** Hàm tạo thẻ URL hỗ trợ cả hreflang và lastmod */
function urlTag(loc: string, changefreq: string, priority: string, hreflangs?: Hreflang[], lastmod?: string) {
  const lines = [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
  ];

  if (lastmod) {
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
  }

  lines.push(
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`
  );

  // Thêm các thẻ hreflang nếu có
  if (hreflangs && hreflangs.length > 0) {
    for (const h of hreflangs) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${h.lang}" href="${xmlEscape(h.href)}" />`);
    }
  }

  lines.push('  </url>');
  return lines.join('\n');
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const GET: RequestHandler = () => {
  const entries: string[] = [];

  // 1. Static pages × all languages (CÓ HREFLANG)
  for (const lang of languages) {
    for (const page of STATIC_PAGES) {
      const isHome = page === '';
      const currentUrl = url(lang.key, page);
      
      // Tạo danh sách hreflang cho TẤT CẢ các ngôn ngữ của trang tĩnh này
      const alternateLinks: Hreflang[] = languages.map(l => ({
        lang: l.hreflang, // ĐÃ SỬA: Lấy thẳng hreflang cực xịn từ file của bạn!
        href: url(l.key, page) // URL thì vẫn lấy key để nối đường dẫn (/zh, /pt)
      }));

      // (Tùy chọn tốt cho SEO) Thêm thẻ x-default trỏ về bản tiếng Anh
      const hasEnglish = languages.some(l => l.key === 'en');
      if (hasEnglish) {
        alternateLinks.push({
          lang: 'x-default',
          href: url('en', page)
        });
      }

      entries.push(urlTag(
        currentUrl,
        isHome ? 'weekly' : 'monthly',
        isHome ? '1.0' : '0.8',
        alternateLinks // Chèn hreflang vào đây
      ));
    }
  }

  // 2. Blog posts — each language has its own independent posts (KHÔNG HREFLANG, CÓ LASTMOD)
  for (const lang of languages) {
    const blogs = getBlogData(lang.key);
    for (const blog of blogs) {
      entries.push(urlTag(
        url(lang.key, 'blog', blog.slug), 
        'monthly', 
        '0.6', 
        undefined, // Bỏ trống hreflang vì blog là độc lập
        blog.lastmod // Truyền ngày cập nhật file vào
      ));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      // Cache 1 hour on CDN, revalidate in background
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
