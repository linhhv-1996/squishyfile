<script lang="ts">
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import { ArrowRight, ShieldCheck } from 'lucide-svelte';

	type Tool = { title: string; desc: string; href: string; tags: string[] };
	type ToolGroup = { title: string; tools: Tool[] };

	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);
	let tx = $derived((key: string, fb: string) => { const v = t(key); return v === key ? fb : v; });
	const pathFor = (p: string) => currentLangKey !== 'en' ? `/${currentLangKey}${p}` : p;

	let compressHref    = $derived(pathFor('/compress-video'));
	let pdfHref         = $derived(pathFor('/compress-pdf'));
	let pdfMergeHref    = $derived(pathFor('/pdf-merge'));
	let imageHref       = $derived(pathFor('/image-compressor'));
	let mp3Href         = $derived(pathFor('/video-to-mp3'));
	let convertHref     = $derived(pathFor('/video-converter'));
	let barcodeHref     = $derived(pathFor('/barcode-generator'));
	let charCounterHref = $derived(pathFor('/character-counter'));
	let manuscriptHref  = $derived(pathFor('/manuscript-counter'));
	let snsHref         = $derived(pathFor('/sns-character-limit'));
	let wordCounterHref = $derived(pathFor('/word-counter'));

	let videoCmp = $derived({ title: t('home.card.video.title'), desc: t('home.card.video.desc'), href: compressHref, tags: ['MP4','MOV','AVI','WebM','MKV'] } satisfies Tool);
	let pdfCmp   = $derived({ title: t('home.card.pdf.title'),   desc: t('home.card.pdf.desc'),   href: pdfHref,      tags: ['PDF', t('home.card.pdf.tag.password'), t('home.card.pdf.tag.fast')] } satisfies Tool);
	let imgCmp   = $derived({ title: t('home.card.image.title'), desc: t('home.card.image.desc'), href: imageHref,    tags: ['JPG','PNG','WebP','GIF'] } satisfies Tool);

	let groups = $derived([
		{ title: tx('home.group.compress','Compress'),        tools: [videoCmp, pdfCmp, imgCmp] },
		{ title: tx('home.group.pdf','PDF'),                  tools: [pdfCmp, { title: tx('home.card.pdfMerge.title','Merge PDF'), desc: tx('home.card.pdfMerge.desc','Combine multiple PDFs into one file directly in your browser.'), href: pdfMergeHref, tags: ['PDF','Merge','Combine'] }] },
		{ title: tx('home.group.videoAudio','Video & audio'), tools: [videoCmp, { title: t('home.card.convert.title'), desc: t('home.card.convert.desc'), href: convertHref, tags: ['MOV','MKV','AVI','WebM','MP4'] }, { title: t('home.card.mp3.title'), desc: t('home.card.mp3.desc'), href: mp3Href, tags: ['MP4','MOV','AVI','WebM','MP3'] }] },
		{ title: tx('home.group.text','Text'),                tools: [{ title: tx('related.characterCounter.title','Character Counter'), desc: tx('related.characterCounter.desc','Count characters, words, bytes and more in real time.'), href: charCounterHref, tags: [tx('cc.stat.chars','Characters'), tx('cc.stat.words','Words'), tx('cc.stat.bytes','Bytes')] }, { title: tx('related.wordCounter.title','Word Counter'), desc: tx('related.wordCounter.desc','Accurate word count with reading time estimate.'), href: wordCounterHref, tags: [tx('cc.stat.words','Words'), tx('cc.stat.chars','Characters'), tx('cc.stat.readTime','Read time')] }, { title: tx('related.manuscriptCounter.title','Manuscript Counter'), desc: tx('related.manuscriptCounter.desc','Convert your text to 400-char manuscript pages (原稿用紙).'), href: manuscriptHref, tags: ['原稿用紙','400',tx('cc.stat.manuscript','Manuscript')] }, { title: tx('related.snsCharacterLimit.title','SNS Character Limit'), desc: tx('related.snsCharacterLimit.desc','Check your text fits X, Instagram, YouTube and more.'), href: snsHref, tags: ['X','Instagram','YouTube','Meta'] }] },
		{ title: tx('home.group.generator','Generator'),      tools: [{ title: t('home.card.barcode.title'), desc: t('home.card.barcode.desc'), href: barcodeHref, tags: ['CODE 128','EAN-13','UPC-A','PNG','SVG'] }] },
	] satisfies ToolGroup[]);

	let featured = $derived([videoCmp, pdfCmp, imgCmp]);

	let searched = $derived(
		groups
			.map(g => ({ ...g, tools: g.tools.filter(tool => `${tool.title} ${tool.desc} ${tool.tags.join(' ')}`.toLowerCase().includes('')) }))
			.filter(g => g.tools.length > 0)
	);

	let visible = $derived(searched);
	let uniq = $derived(new Set(groups.flatMap(g => g.tools.map(t => t.href))).size);
</script>

<svelte:head>
	<title>{t('meta.title')}</title>
	<meta property="og:title" content={t('meta.title')} />
	<meta name="description" content={t('meta.desc')} />
</svelte:head>

<main>
	<div class="wrap wrap-home">

		<!-- 1. Hero -->
		<section class="hero" aria-labelledby="site-title">
			<div class="hero-copy">
				<div class="hero-badge">
					<span class="hero-badge-dot"></span>
					{tx('home.eyebrow', 'Private browser tools')}
				</div>
				<h1 id="site-title">{@html t('hero.title')}</h1>
				<p class="hero-sub">{t('hero.sub')}</p>
				<div class="hero-actions" aria-label="Popular tools">
					<a href={compressHref} class="action-pill">{t('home.card.video.title')}</a>
					<a href={pdfHref}      class="action-pill">{t('home.card.pdf.title')}</a>
					<a href={imageHref}    class="action-pill">{t('home.card.image.title')}</a>
				</div>
			</div>

			<div class="hero-panel" aria-label="Featured tools">
				{#each featured as tool, i}
					<a class="feature" href={tool.href} style={`--i:${i + 1}`}>
						<span class="feature-top">
							<strong>{tool.title}</strong>
							<ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
						</span>
						<span class="feature-desc">{tool.desc}</span>
						<em>{tool.tags.slice(0,3).join(' · ')}</em>
					</a>
				{/each}
			</div>
		</section>

		<!-- 2. Tool directory -->
		<section class="dir" aria-label="Tools">
			{#each visible as g}
				<div class="grp">
					<div class="grp-head">
						<h2 class="glabel">{g.title}</h2>
						<span class="grp-count">{g.tools.length}</span>
					</div>
					<ul>
						{#each g.tools as tool}
							<li>
								<a class="row" href={tool.href}>
									<span class="ri">
										<strong>{tool.title}</strong>
										<span>{tool.desc}</span>
									</span>
									<span class="tags">
										{#each tool.tags.slice(0,3) as tag}<span>{tag}</span>{/each}
									</span>
									<ArrowRight class="arr" size={14} strokeWidth={2} aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</section>

		<!-- 3. Privacy note -->
		<div class="pnote">
			<ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
			<p>{@html t('note.privacy')}</p>
		</div>

		<!-- 4. FAQ -->
		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t('faq.home.title')}</h2>
			<div class="faq-list">
				{#each [1,2,3,4,5,6] as n}
					<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
						<summary class="faq-q" itemprop="name">{t(`faq.home.${n}.q`)}</summary>
						<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
							<span itemprop="text">{t(`faq.home.${n}.a`)}</span>
						</div>
					</details>
				{/each}
			</div>
		</section>

	</div>
</main>

<style>
	/* ─── Layout ───────────────────────────────────────────────── */
	.wrap-home {
		max-width: 990px;
		margin: 0 auto;
		padding: 20px 16px 56px;
	}

	/* ─── Hero ──────────────────────────────────────────────────── */
	.hero {
		display: grid;
		grid-template-columns: 1fr minmax(280px, 360px);
		gap: 24px;
		align-items: center;
		padding: 28px 0 24px;
		border-bottom: 1px solid var(--border);
		margin-bottom: 24px;
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		width: fit-content;
		padding: 3px 10px;
		font-size: 11px;
		font-weight: 500;
		color: var(--muted);
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: 999px;
		letter-spacing: .02em;
	}

	.hero-badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #1d9e75;
		flex-shrink: 0;
	}

	.hero h1 {
		margin: 0;
		font-size: clamp(22px, 3.2vw, 34px);
		font-weight: 700;
		letter-spacing: -.025em;
		line-height: 1.18;
		color: var(--text);
	}

	.hero-sub {
		margin: 0;
		font-size: 14px;
		line-height: 1.65;
		color: var(--muted);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}

	.action-pill {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 12px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		text-decoration: none;
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: 999px;
		transition: border-color .12s, background .12s;
	}
	.action-pill:hover {
		border-color: var(--border-hover);
		background: var(--surf2);
	}

	/* Featured cards panel */
	.hero-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.feature {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 13px 14px;
		color: var(--text);
		text-decoration: none;
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		transition: border-color .12s, background .12s;
	}
	.feature:hover {
		border-color: var(--border-hover);
		background: var(--surf2);
	}

	.feature-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.feature strong {
		font-size: 13.5px;
		font-weight: 650;
		letter-spacing: -.01em;
		color: var(--text);
	}
	.feature-top :global(svg) {
		color: var(--muted);
		flex-shrink: 0;
		transition: transform .12s, color .12s;
	}
	.feature:hover .feature-top :global(svg) {
		color: var(--text);
		transform: translateX(2px);
	}
	.feature-desc {
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.feature em {
		font-style: normal;
		font-size: 11px;
		color: var(--muted);
		opacity: .8;
	}

	/* ─── Tool directory ────────────────────────────────────────── */
	.dir {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.grp {
		display: flex;
		flex-direction: column;
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
	}

	.grp-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 11px 14px;
		background: var(--surf2);
		border-bottom: 1px solid var(--border);
	}

	.glabel {
		margin: 0;
		font-size: 12.5px;
		font-weight: 650;
		letter-spacing: .01em;
		color: var(--text);
		text-transform: uppercase;
	}

	.grp-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		font-size: 11px;
		font-weight: 500;
		color: var(--muted);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 999px;
	}

	ul { list-style: none; margin: 0; padding: 0; }
	li + li { border-top: 1px solid var(--border); }

	.row {
		display: grid;
		grid-template-columns: minmax(0,1fr) auto 16px;
		align-items: center;
		gap: 10px;
		min-height: 78px;
		padding: 12px 14px;
		color: var(--text);
		text-decoration: none;
		transition: background .1s;
	}
	.row:hover { background: var(--surf2); }
	.row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

	.ri { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
	.ri strong {
		font-size: 13.5px;
		font-weight: 650;
		letter-spacing: -.01em;
		color: var(--text);
	}
	.ri span {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-size: 12.5px;
		color: var(--muted);
		line-height: 1.45;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 3px;
		max-width: 130px;
		flex-shrink: 0;
	}
	.tags span {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 6px;
		font-size: 11px;
		font-weight: 500;
		color: var(--muted);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 999px;
		white-space: nowrap;
	}

	:global(.arr) {
		color: var(--muted);
		flex-shrink: 0;
		transition: transform .12s, color .12s;
	}
	.row:hover :global(.arr) {
		color: var(--text);
		transform: translateX(2px);
	}

	/* ─── Privacy note ──────────────────────────────────────────── */
	.pnote {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-top: 12px;
		padding: 12px 14px;
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
	}
	.pnote :global(svg) { flex-shrink: 0; margin-top: 2px; color: var(--muted); }
	.pnote p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--muted); }

	/* ─── FAQ (reuse global classes from app.css) ────────────────── */
	.faq-sec { margin-top: 12px; }

	/* ─── Responsive ────────────────────────────────────────────── */
	@media (max-width: 860px) {
		.hero { grid-template-columns: 1fr; gap: 20px; }
		.hero-panel { flex-direction: row; }
		.feature { flex: 1; }
		.dir { grid-template-columns: 1fr; }
	}

	@media (max-width: 600px) {
		.wrap-home { padding: 14px 12px 40px; }
		.hero { padding: 18px 0 18px; }
		.hero-panel { flex-direction: column; }
		.row { grid-template-columns: minmax(0,1fr) 16px; min-height: 68px; gap: 8px; }
		.tags { display: none; }
	}
</style>
