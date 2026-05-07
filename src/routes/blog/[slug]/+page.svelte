<script lang="ts">
	import { formatDate } from '$lib/blog-posts';
	import { Clock, ArrowLeft, Home, FileText, Tag } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.post.title} – NekoCompress Blog</title>
	<meta name="description" content={data.post.excerpt} />
	<meta property="og:title" content={data.post.title} />
	<meta property="og:description" content={data.post.excerpt} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<header>
	<div class="hinner">
		<a href="/" class="logo">
			<div class="logo-ico"><FileText size={15} strokeWidth={2.2} /></div>
			<span class="logo-name">Neko<span>Compress</span></span>
		</a>
		<nav class="hnav">
			<a href="/">Home</a>
			<a href="/blog" class="active">Blog</a>
		</nav>
	</div>
</header>

<main>
	<div class="wrap">
		<!-- Breadcrumb -->
		<nav class="breadcrumb">
			<a href="/"><Home size={13} strokeWidth={2} /> Home</a>
			<span class="bc-sep">›</span>
			<a href="/blog">Blog</a>
			<span class="bc-sep">›</span>
			<span class="bc-cur">{data.post.title}</span>
		</nav>

		<article class="article">
			<header class="art-header">
				<div class="art-tags">
					{#each data.post.tags as tag}
						<span class="atag"><Tag size={11} strokeWidth={2} />{tag}</span>
					{/each}
				</div>
				<h1 class="art-title">{data.post.title}</h1>
				<p class="art-excerpt">{data.post.excerpt}</p>
				<div class="art-meta">
					<span>{formatDate(data.post.date)}</span>
					<span class="art-dot">·</span>
					<span class="art-read"><Clock size={13} strokeWidth={2} /> {data.post.readTime} min read</span>
				</div>
			</header>

			<div class="art-cover" style="background: {data.post.cover}"></div>

			<div class="art-body">
				{@html data.html}
			</div>

			<div class="art-cta">
				<div class="cta-title">Compress or convert your video for free</div>
				<div class="cta-sub">No uploads, no watermarks, no account required.</div>
				<a href="/" class="cta-btn">Open NekoCompress →</a>
			</div>

			<div class="art-back">
				<a href="/blog" class="back-link"><ArrowLeft size={15} strokeWidth={2.2} /> Back to all articles</a>
			</div>
		</article>
	</div>
</main>

<footer>
	<div class="wrap">
		<p>© 2026 NekoCompress &nbsp;·&nbsp; <a href="/">Privacy Policy</a> &nbsp;·&nbsp; <a href="/">Terms of Service</a></p>
	</div>
</footer>

<style>
	header {
		border-bottom: 1px solid var(--border);
		position: sticky; top: 0; z-index: 100;
		background: rgba(11,13,18,0.92);
		backdrop-filter: blur(16px);
	}
	.hinner {
		max-width: 840px; margin: 0 auto; padding: 0 24px;
		display: flex; align-items: center; gap: 20px; height: 54px;
	}
	.logo { display: flex; align-items: center; gap: 9px; text-decoration: none; }
	.logo-ico {
		width: 30px; height: 30px;
		background: linear-gradient(135deg, var(--accent), var(--accent2));
		border-radius: 8px; display: grid; place-items: center; color: #fff;
	}
	.logo-name { font-weight: 800; font-size: 17px; color: var(--text); letter-spacing: -.3px; }
	.logo-name span { color: var(--accent); }
	.hnav { display: flex; align-items: center; gap: 2px; flex: 1; }
	.hnav a {
		padding: 6px 12px; font-size: 13px; font-weight: 500;
		color: var(--muted); text-decoration: none; border-radius: var(--rsm); transition: all .15s;
	}
	.hnav a:hover { color: var(--text); background: var(--surf2); }
	.hnav a.active { color: var(--text); }

	.breadcrumb {
		display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
		padding: 18px 0 0; font-size: 12.5px; color: var(--muted);
	}
	.breadcrumb a {
		display: flex; align-items: center; gap: 4px;
		color: var(--muted); text-decoration: none; transition: color .15s;
	}
	.breadcrumb a:hover { color: var(--accent); }
	.bc-sep { color: var(--border); }
	.bc-cur {
		color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px;
	}

	.article { max-width: 680px; margin: 0 auto; padding-bottom: 60px; }

	.art-header { padding: 32px 0 24px; }
	.art-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
	.atag {
		display: inline-flex; align-items: center; gap: 4px;
		font-size: 11px; font-weight: 600; padding: 4px 10px;
		background: rgba(79,140,255,.1); border: 1px solid rgba(79,140,255,.2);
		border-radius: 20px; color: var(--accent);
	}
	.art-title {
		font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -.6px;
		color: var(--text); margin-bottom: 12px;
	}
	.art-excerpt { font-size: 15px; color: var(--muted); line-height: 1.65; margin-bottom: 14px; }
	.art-meta { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); }
	.art-dot { color: var(--border); }
	.art-read { display: flex; align-items: center; gap: 5px; }

	.art-cover { height: 6px; border-radius: 3px; margin-bottom: 36px; }

	.art-body { font-size: 15px; line-height: 1.75; color: var(--text); }

	:global(.art-body h2) {
		font-size: 20px; font-weight: 800; color: var(--text);
		margin: 36px 0 12px; letter-spacing: -.3px;
		padding-bottom: 8px; border-bottom: 1px solid var(--border);
	}
	:global(.art-body h3) { font-size: 16px; font-weight: 700; color: var(--text); margin: 24px 0 8px; }
	:global(.art-body p) { margin-bottom: 16px; color: var(--text); }
	:global(.art-body strong) { color: var(--text); font-weight: 700; }
	:global(.art-body a) { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
	:global(.art-body a:hover) { color: #7aa6ff; }
	:global(.art-body code) {
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		font-size: 13px; padding: 2px 6px;
		background: var(--surf2); border: 1px solid var(--border); border-radius: 4px; color: #c9d1d9;
	}
	:global(.art-body pre) {
		background: var(--surf2); border: 1px solid var(--border); border-radius: var(--r);
		padding: 16px 18px; overflow-x: auto; margin-bottom: 20px;
	}
	:global(.art-body pre code) { background: none; border: none; padding: 0; font-size: 13px; line-height: 1.7; color: #c9d1d9; }
	:global(.art-body ul) { margin: 0 0 18px 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
	:global(.art-body li) { color: var(--text); line-height: 1.65; }

	:global(.art-body .table-wrap) {
		overflow-x: auto; margin-bottom: 24px;
		border: 1px solid var(--border); border-radius: var(--r);
	}
	:global(.art-body table) { width: 100%; border-collapse: collapse; }
	:global(.art-body th) {
		background: var(--surf2); padding: 10px 14px;
		font-size: 12px; font-weight: 700; text-transform: uppercase;
		letter-spacing: .5px; color: var(--muted); text-align: left;
	}
	:global(.art-body td) { padding: 10px 14px; font-size: 13.5px; color: var(--text); border-top: 1px solid var(--border); }
	:global(.art-body tr:hover td) { background: rgba(255,255,255,.02); }

	.art-cta {
		margin: 48px 0 32px;
		background: linear-gradient(135deg, rgba(79,140,255,.08), rgba(124,92,252,.08));
		border: 1px solid rgba(79,140,255,.2); border-radius: var(--r); padding: 28px;
	}
	.cta-title { font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 5px; }
	.cta-sub { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
	.cta-btn {
		display: inline-flex; align-items: center; gap: 6px; padding: 10px 22px;
		background: linear-gradient(135deg, var(--accent), var(--accent2));
		border-radius: var(--rsm); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; transition: opacity .15s;
	}
	.cta-btn:hover { opacity: .88; }

	.art-back { padding-top: 8px; }
	.back-link {
		display: inline-flex; align-items: center; gap: 6px;
		font-size: 13px; font-weight: 600; color: var(--muted); text-decoration: none; transition: color .15s;
	}
	.back-link:hover { color: var(--accent); }

	footer {
		border-top: 1px solid var(--border); padding: 24px 0;
		text-align: center; color: var(--muted); font-size: 12px;
	}
	footer a { color: var(--muted); text-decoration: none; transition: color .15s; }
	footer a:hover { color: var(--text); }

	@media (max-width: 580px) {
		.art-title { font-size: 22px; }
		.hinner { padding: 0 16px; }
		.bc-cur { max-width: 150px; }
		:global(.art-body h2) { font-size: 17px; }
	}
</style>
