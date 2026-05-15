<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import BlogCta from '$lib/components/BlogCta.svelte';

    let currentLangKey = $derived($page.params.lang || 'en');
    let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
    let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let { data }: { data: PageData } = $props();
	let langPrefix = $derived($page.params.lang ? `/${$page.params.lang}` : '');

	let jsonLd = $derived(JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		"headline": data.meta.title,
		"description": data.meta.description,
		"datePublished": data.meta.date,
		"author": {
			"@type": "Person",
			"name": "J.Julian"
		}
	}));
</script>

<svelte:head>
	<title>{data.meta.title} | Squishyfile Blog</title>
	<meta name="description" content="{data.meta.description}" />
	<meta property="og:title" content="{data.meta.title}" />
	<meta property="og:description" content="{data.meta.description}" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main class="wrap">
	<div class="article-container">

		<div class="article-inner">
			<header class="article-header">
				<a href="{langPrefix}/blog" class="back-link">
					<svg width="13" height="13" viewBox="0 0 14 14" fill="none">
						<path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					{t('blog.back')}
				</a>
				<h1 class="article-title">{data.meta.title}</h1>
				<div class="article-meta">
					<time class="meta-date">{data.meta.date}</time>
					<span class="meta-sep">·</span>
					<span class="meta-author">J.Julian</span>
					{#if data.meta.description}
						<span class="meta-sep">·</span>
						<span class="meta-desc">{data.meta.description}</span>
					{/if}
				</div>
			</header>

			<hr class="article-divider" />
		</div>

		<BlogCta tool={data.meta.tool} {t} {langPrefix} />

		<div class="article-inner">
			<article class="prose">
				{@html data.content}
			</article>
		</div>

	</div>
</main>

<style>
	.article-container {
		padding: 30px 0 80px;
		max-width: 680px;
		/* NO animation here — transform breaks position:sticky on children */
	}

	.article-inner {
		animation: fadeUp 0.3s ease;
	}

	/* Header */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		text-decoration: none;
		margin-bottom: 28px;
		transition: color 0.15s;
	}

	.back-link:hover { color: var(--accent); }

	.article-title {
		font-size: 32px;
		font-weight: 700;
		letter-spacing: -1px;
		line-height: 1.2;
		color: var(--text);
		margin-bottom: 12px;
	}

	.article-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.meta-date {
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
	}

	.meta-sep { color: var(--border); }

	.meta-author {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.meta-desc {
		font-size: 13px;
		color: var(--muted);
		font-style: italic;
	}

	/* Divider */
	.article-divider {
		border: none;
		border-top: 1px solid var(--border);
		margin: 25px 0;
	}

	/* Prose */
	.prose {
		color: var(--muted);
		line-height: 1.8;
		font-size: 14.5px;
	}

	.prose :global(h1) {
		font-size: 26px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.6px;
		line-height: 1.2;
		margin: 44px 0 14px;
	}

	.prose :global(h2) {
		font-size: 19px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.3px;
		margin: 36px 0 12px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border);
	}

	.prose :global(h3) {
		font-size: 15px;
		font-weight: 700;
		color: var(--text);
		margin: 24px 0 8px;
	}

	.prose :global(h4) {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin: 20px 0 8px;
	}

	.prose :global(p) { margin-bottom: 16px; }

	.prose :global(strong) { color: var(--text); font-weight: 700; }

	.prose :global(em) { color: #8a93b8; }

	.prose :global(a) {
		color: var(--accent);
		text-decoration: none;
		border-bottom: 1px solid rgba(79, 140, 255, 0.3);
		transition: border-color 0.15s, color 0.15s;
	}

	.prose :global(a:hover) {
		color: #fff;
		border-bottom-color: var(--accent);
	}

	.prose :global(ul),
	.prose :global(ol) {
		list-style: none;
		padding: 0;
		margin-bottom: 16px;
	}

	.prose :global(ul li),
	.prose :global(ol li) {
		position: relative;
		padding-left: 18px;
		margin-bottom: 7px;
	}

	.prose :global(ul li)::before {
		content: '';
		position: absolute;
		left: 0; top: 9px;
		width: 4px; height: 4px;
		border-radius: 50%;
		background: var(--accent);
		opacity: 0.6;
	}

	.prose :global(ol) { counter-reset: list-counter; }

	.prose :global(ol li)::before {
		content: counter(list-counter);
		counter-increment: list-counter;
		position: absolute;
		left: 0; top: 0;
		font-size: 11px;
		font-weight: 700;
		color: var(--accent);
		line-height: 1.8;
	}

	.prose :global(blockquote) {
		margin: 20px 0;
		padding: 14px 18px;
		border-left: 2px solid var(--accent);
		background: rgba(79, 140, 255, 0.04);
		border-radius: 0 var(--rsm) var(--rsm) 0;
	}

	.prose :global(blockquote p) {
		color: #8a93b8;
		font-style: italic;
		margin: 0;
	}

	.prose :global(code) {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 12.5px;
		background: var(--surf2);
		border: 1px solid var(--border);
		color: #a8c4ff;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.prose :global(pre) {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		padding: 18px 20px;
		overflow-x: auto;
		margin-bottom: 18px;
	}

	.prose :global(pre code) {
		background: none;
		border: none;
		padding: 0;
		font-size: 13px;
		color: var(--text);
	}

	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 18px;
		font-size: 13px;
	}

	.prose :global(th) {
		text-align: left;
		padding: 9px 12px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--muted);
		border-bottom: 1px solid var(--border);
	}

	.prose :global(td) {
		padding: 9px 12px;
		border-bottom: 1px solid rgba(35, 39, 55, 0.6);
		color: var(--muted);
	}

	.prose :global(tr:hover td) {
		background: var(--surf);
		color: var(--text);
	}

	.prose :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 20px 0;
		opacity: 0.5;
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: var(--r);
		border: 1px solid var(--border);
		margin: 8px 0;
	}

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	@media (max-width: 580px) {
		.article-container { padding: 32px 0 60px; }
		.article-title { font-size: 24px; letter-spacing: -0.6px; }
		.prose :global(h1) { font-size: 20px; }
		.prose :global(h2) { font-size: 16px; }
		.prose :global(pre) { padding: 14px 14px; }
	}
</style>
