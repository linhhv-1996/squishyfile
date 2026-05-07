<script lang="ts">
	import { posts, formatDate } from '$lib/blog-posts';
	import { Clock, Tag, ArrowRight, Home, FileText } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Blog – NekoCompress</title>
	<meta name="description" content="Tips, guides, and tutorials on video compression, format conversion, and sharing videos on Discord, Gmail, and social media." />
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
			<span>Blog</span>
		</nav>

		<!-- Hero -->
		<section class="blog-hero">
			<h1>Video Tips & Guides</h1>
			<p>Practical guides on compressing, converting, and sharing videos on every platform.</p>
		</section>

		<!-- Post Grid -->
		<div class="post-grid">
			{#each posts as post}
				<a href="/blog/{post.slug}" class="post-card">
					<div class="post-cover" style="background: {post.cover}">
						<div class="post-tags">
							{#each post.tags.slice(0, 2) as tag}
								<span class="ptag">{tag}</span>
							{/each}
						</div>
					</div>
					<div class="post-body">
						<h2 class="post-title">{post.title}</h2>
						<p class="post-excerpt">{post.excerpt}</p>
						<div class="post-meta">
							<span class="post-date">{formatDate(post.date)}</span>
							<span class="post-read"><Clock size={12} strokeWidth={2} /> {post.readTime} min read</span>
						</div>
						<span class="post-cta">Read article <ArrowRight size={13} strokeWidth={2.5} /></span>
					</div>
				</a>
			{/each}
		</div>

		<!-- CTA Banner -->
		<div class="blog-cta">
			<div class="cta-text">
				<div class="cta-title">Ready to compress your video?</div>
				<div class="cta-sub">Free, private, no watermarks — right in your browser.</div>
			</div>
			<a href="/" class="cta-btn">Try NekoCompress →</a>
		</div>
	</div>
</main>

<footer>
	<div class="wrap">
		<p>© 2026 NekoCompress &nbsp;·&nbsp; <a href="/">Privacy Policy</a> &nbsp;·&nbsp; <a href="/">Terms of Service</a></p>
	</div>
</footer>

<style>
	/* ── HEADER (mirror from main page) ── */
	header {
		border-bottom: 1px solid var(--border);
		position: sticky; top: 0; z-index: 100;
		background: rgba(11,13,18,0.92);
		backdrop-filter: blur(16px);
	}
	.hinner {
		max-width: 840px; margin: 0 auto; padding: 0 24px;
		display: flex; align-items: center; gap: 20px;
		height: 54px;
	}
	.logo { display: flex; align-items: center; gap: 9px; text-decoration: none; flex-shrink: 0; }
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
		color: var(--muted); text-decoration: none; border-radius: var(--rsm);
		transition: all .15s; white-space: nowrap;
	}
	.hnav a:hover { color: var(--text); background: var(--surf2); }
	.hnav a.active { color: var(--text); }

	/* ── BREADCRUMB ── */
	.breadcrumb {
		display: flex; align-items: center; gap: 7px;
		padding: 18px 0 0; font-size: 12.5px; color: var(--muted);
	}
	.breadcrumb a {
		display: flex; align-items: center; gap: 4px;
		color: var(--muted); text-decoration: none; transition: color .15s;
	}
	.breadcrumb a:hover { color: var(--accent); }
	.bc-sep { color: var(--border); }

	/* ── BLOG HERO ── */
	.blog-hero { padding: 28px 0 32px; }
	.blog-hero h1 {
		font-size: 32px; font-weight: 800; letter-spacing: -.7px;
		background: linear-gradient(130deg, var(--text) 40%, #7aa6ff 100%);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
		margin-bottom: 8px;
	}
	.blog-hero p { color: var(--muted); font-size: 14px; }

	/* ── POST GRID ── */
	.post-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
		margin-bottom: 48px;
	}

	.post-card {
		display: flex; flex-direction: column;
		background: var(--surf); border: 1px solid var(--border);
		border-radius: var(--r); overflow: hidden;
		text-decoration: none;
		transition: border-color .2s, transform .2s, box-shadow .2s;
	}
	.post-card:hover {
		border-color: rgba(79,140,255,.5);
		transform: translateY(-3px);
		box-shadow: 0 12px 32px rgba(0,0,0,.25);
	}

	.post-cover {
		height: 140px; position: relative;
		display: flex; align-items: flex-end; padding: 12px 14px;
	}
	.post-tags { display: flex; gap: 6px; }
	.ptag {
		font-size: 10.5px; font-weight: 600;
		padding: 3px 9px; border-radius: 20px;
		background: rgba(0,0,0,.35); backdrop-filter: blur(8px);
		color: var(--text); border: 1px solid rgba(255,255,255,.08);
	}

	.post-body { padding: 18px; display: flex; flex-direction: column; flex: 1; gap: 8px; }

	.post-title {
		font-size: 15px; font-weight: 700; color: var(--text);
		line-height: 1.4; letter-spacing: -.2px;
	}
	.post-excerpt {
		font-size: 13px; color: var(--muted); line-height: 1.6;
		flex: 1;
		display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
	}
	.post-meta {
		display: flex; align-items: center; gap: 12px;
		font-size: 11.5px; color: var(--muted); margin-top: 4px;
	}
	.post-read { display: flex; align-items: center; gap: 4px; }
	.post-cta {
		display: flex; align-items: center; gap: 5px;
		font-size: 12.5px; font-weight: 600; color: var(--accent);
		margin-top: 2px;
	}

	/* ── CTA BANNER ── */
	.blog-cta {
		display: flex; align-items: center; justify-content: space-between;
		gap: 20px; padding: 24px 28px;
		background: linear-gradient(135deg, rgba(79,140,255,.08), rgba(124,92,252,.08));
		border: 1px solid rgba(79,140,255,.2);
		border-radius: var(--r); margin-bottom: 48px;
	}
	.cta-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
	.cta-sub { font-size: 13px; color: var(--muted); }
	.cta-btn {
		display: inline-flex; align-items: center; gap: 6px;
		padding: 10px 20px; flex-shrink: 0;
		background: linear-gradient(135deg, var(--accent), var(--accent2));
		border-radius: var(--rsm); color: #fff;
		font-size: 13.5px; font-weight: 700; text-decoration: none;
		white-space: nowrap; transition: opacity .15s;
	}
	.cta-btn:hover { opacity: .88; }

	/* ── FOOTER ── */
	footer {
		border-top: 1px solid var(--border); padding: 24px 0;
		text-align: center; color: var(--muted); font-size: 12px;
	}
	footer a { color: var(--muted); text-decoration: none; transition: color .15s; }
	footer a:hover { color: var(--text); }

	/* ── RESPONSIVE ── */
	@media (max-width: 640px) {
		.post-grid { grid-template-columns: 1fr; gap: 14px; }
		.blog-hero h1 { font-size: 24px; }
		.blog-cta { flex-direction: column; align-items: flex-start; }
		.cta-btn { width: 100%; justify-content: center; }
		.hinner { padding: 0 16px; }
	}
</style>
