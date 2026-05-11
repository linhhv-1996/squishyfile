<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
    import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';

    let currentLangKey = $derived($page.params.lang || 'en');
    let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
    let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let { data }: { data: PageData } = $props();
	let langPrefix = $derived($page.params.lang ? `/${$page.params.lang}` : '');
</script>

<svelte:head>
	<title>{t('blog.meta.title')}</title>
	<meta name="description" content={t('blog.meta.desc')} />
</svelte:head>

<main class="wrap">
	<div class="blog-container">

		<header class="blog-header">
			<h1>{t('blog.header.title')}</h1>
			<p>{t('blog.header.sub')}</p>
		</header>

		{#if data.posts.length > 0}
			<ul class="post-list">
				{#each data.posts as post}
					<li class="post-item">
						<a href="{langPrefix}/blog/{post.slug}" class="post-link">
							<div class="post-main">
								<h2 class="post-title">{post.title}</h2>
								<p class="post-desc">{post.description}</p>
							</div>
							<div class="post-right">
								<time class="post-date">{post.date}</time>
								<svg class="post-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
									<path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">{t('blog.empty')}</p>
		{/if}

	</div>
</main>

<style>
	.blog-container {
		padding: 30px 0 80px;
		animation: fadeUp 0.3s ease;
	}

	/* Header */
	.blog-header {
		margin-bottom: 40px;
	}

	.blog-header h1 {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.8px;
		color: var(--text);
		margin-bottom: 6px;
	}

	.blog-header p {
		font-size: 13px;
		color: var(--muted);
	}

	/* List */
	.post-list {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--border);
	}

	.post-item {
		border-bottom: 1px solid var(--border);
	}

	.post-link {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		padding: 22px 0;
		text-decoration: none;
	}

	.post-link:hover .post-title {
		color: var(--accent);
	}

	.post-link:hover .post-arrow {
		color: var(--accent);
		transform: translateX(3px);
	}

	/* Left */
	.post-main {
		flex: 1;
		min-width: 0;
	}

	.post-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text);
		letter-spacing: -0.2px;
		line-height: 1.35;
		margin-bottom: 5px;
		transition: color 0.15s;
	}

	.post-desc {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.55;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Right */
	.post-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 10px;
		flex-shrink: 0;
		padding-top: 2px;
	}

	.post-date {
		font-size: 11.5px;
		color: var(--muted);
		font-weight: 500;
		white-space: nowrap;
	}

	.post-arrow {
		color: var(--border);
		transition: color 0.15s, transform 0.15s;
	}

	/* Empty */
	.empty {
		padding: 48px 0;
		font-size: 13px;
		color: var(--muted);
		border-top: 1px solid var(--border);
	}

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	@media (max-width: 580px) {
		.blog-container { padding: 32px 0 60px; }
		.blog-header h1 { font-size: 24px; }
		.post-link { gap: 16px; padding: 18px 0; }
		.post-title { font-size: 14px; }
		.post-right { flex-direction: row; align-items: center; gap: 8px; padding-top: 0; }
	}
</style>
