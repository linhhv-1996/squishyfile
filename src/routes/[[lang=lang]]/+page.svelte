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

	let q           = $state('');
	let activeGroup = $state<string | null>(null);

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

	let searched = $derived(
		groups
			.map(g => ({ ...g, tools: g.tools.filter(tool => `${tool.title} ${tool.desc} ${tool.tags.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())) }))
			.filter(g => g.tools.length > 0)
	);

	let visible = $derived(activeGroup ? searched.filter(g => g.title === activeGroup) : searched);
	let uniq    = $derived(new Set(groups.flatMap(g => g.tools.map(t => t.href))).size);

	function pick(name: string | null) { activeGroup = name; q = ''; }
</script>

<svelte:head>
	<title>{t('meta.title')}</title>
	<meta property="og:title" content={t('meta.title')} />
	<meta name="description" content={t('meta.desc')} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<main>
	<div class="wrap wrap-home">

		<!-- 1. Hero -->
		<section class="hero" aria-labelledby="site-title">
			<h1 id="site-title">{@html t('hero.title')}</h1>
			<p>{t('hero.sub')}</p>
		</section>

		<!-- 2. Search -->
		<div class="search-row">
			<label class="search">
				<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
					<path d="M9.5 6a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-.64 3.36a4.5 4.5 0 1 1 .71-.71l2.43 2.43a.5.5 0 0 1-.7.7L8.86 9.36Z" fill="currentColor"/>
				</svg>
				<input
					bind:value={q}
					type="search"
					placeholder={tx('home.search.placeholder','Search — video, pdf, image, barcode…')}
					oninput={() => { if (q) activeGroup = null; }}
				/>
				{#if q}
					<button class="clear" onclick={() => q = ''} aria-label="Clear">✕</button>
				{/if}
			</label>
		</div>

		<!-- 3. Category tabs -->
		<nav class="tabs" aria-label="Filter by category">
			<button class="tab" class:on={!activeGroup && !q} onclick={() => pick(null)}>
				{tx('home.tools.all','All')}<em>{uniq}</em>
			</button>
			{#each groups as g}
				<button class="tab" class:on={activeGroup === g.title} onclick={() => pick(g.title)}>
					{g.title}<em>{g.tools.length}</em>
				</button>
			{/each}
		</nav>

		<!-- 4. Tool list -->
		<section class="dir" aria-label="Tools">
			{#if visible.length}
				{#each visible as g}
					<div class="grp">
						{#if !activeGroup}
							<h2 class="glabel">{g.title}</h2>
						{/if}
						<ul>
							{#each g.tools as tool}
								<li>
									<a class="row" href={tool.href}>
										<span class="ri">
											<strong>{tool.title}</strong>
											<span>{tool.desc}</span>
										</span>
										<span class="tags">
											{#each tool.tags.slice(0,4) as tag}<span>{tag}</span>{/each}
										</span>
										<ArrowRight class="arr" size={14} strokeWidth={2} aria-hidden="true" />
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			{:else}
				<p class="empty">{tx('home.search.empty','No tools found.')}</p>
			{/if}
		</section>

		<!-- 5. Privacy note -->
		<div class="pnote">
			<ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
			<p>{@html t('note.privacy')}</p>
		</div>

		<!-- 6. FAQ -->
		<section class="faq" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t('faq.home.title')}</h2>
			<div class="faq-list">
				{#each [1,2,3,4,5,6] as n}
					<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
						<summary itemprop="name">{t(`faq.home.${n}.q`)}</summary>
						<div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
							<span itemprop="text">{t(`faq.home.${n}.a`)}</span>
						</div>
					</details>
				{/each}
			</div>
		</section>

	</div>
</main>

<style>
	main { font-family: 'DM Sans', sans-serif; }

	/* 1. Hero */
	.hero {
		padding: 22px 0 20px;
		border-bottom: 1px solid var(--border);
	}
	.hero h1 {
		margin: 0 0 8px;
		font-size: clamp(28px, 4vw, 42px);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
		color: var(--text);
	}
	.hero p {
		margin: 0;
		font-size: 16px;
		line-height: 1.6;
		color: var(--muted);
	}

	/* 2. Search */
	.search-row {
		padding: 0 16px 10px 0;
		border-bottom: 1px solid var(--border);
	}
	.search {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}
	.search svg {
		position: absolute;
		left: 12px;
		color: var(--muted);
		pointer-events: none;
		flex-shrink: 0;
	}
	.search input {
		width: 100%;
		height: 40px;
		padding: 0 40px 0 36px;
		font: inherit;
		font-size: 15px;
		color: var(--text);
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: 8px;
		outline: none;
		transition: border-color .1s, background .1s;
	}
	.search input:focus { background: var(--bg); border-color: var(--text); }
	.clear {
		position: absolute;
		right: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		font-size: 10px;
		color: var(--muted);
		background: var(--border);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		line-height: 1;
	}
	.clear:hover { color: var(--text); }

	/* 3. Tabs */
	.tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 0px;
		border: none;
		overflow-x: auto;
		scrollbar-width: none;
		margin-top: 10px;
	}
	.tabs::-webkit-scrollbar { display: none; }
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 32px;
		padding: 0 12px;
		font: inherit;
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 500;
		color: var(--muted);
		background: none;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		white-space: nowrap;
		transition: background .1s, color .1s, border-color .1s;
	}
	.tab:hover { background: var(--surf); color: var(--text); }
	.tab.on {
		background: var(--surf);
		color: var(--text);
		border-color: var(--border);
		font-weight: 600;
	}
	.tab em {
		font-family: 'DM Mono', monospace;
		font-style: normal;
		font-size: 10.5px;
		color: var(--muted);
	}
	.tab.on em { color: var(--text); }

	/* 4. Tool list */
	.dir { padding-top: 20px; }
	.grp + .grp { margin-top: 26px; }
	.glabel {
		margin: 0 0 6px;
		font-family: 'DM Mono', monospace;
		font-size: 10.5px;
		font-weight: 500;
		letter-spacing: .07em;
		text-transform: uppercase;
		color: var(--muted);
	}
	ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
	li { border-bottom: 1px solid var(--border); }

	.row {
		display: grid;
		grid-template-columns: minmax(0,1fr) auto 18px;
		align-items: center;
		gap: 16px;
		padding: 14px 4px;
		color: var(--text);
		text-decoration: none;
		border-radius: 4px;
		transition: background .1s;
	}
	.row:hover { background: var(--surf); }
	.row:focus-visible { outline: 2px solid var(--text); outline-offset: 1px; }

	.ri { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
	.ri strong { font-size: 15px; font-weight: 600; letter-spacing: -.01em; color: var(--text); }
	.ri span { font-size: 13.5px; color: var(--muted); line-height: 1.5; }

	.tags { display: flex; gap: 4px; flex-shrink: 0; }
	.tags span {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 7px;
		font-family: 'DM Mono', monospace;
		font-size: 11.5px;
		font-weight: 500;
		color: var(--muted);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	:global(.arr) { color: var(--muted); transition: transform .1s, color .1s; }
	.row:hover :global(.arr) { color: var(--text); transform: translateX(2px); }

	.empty { padding: 18px; font-size: 13px; color: var(--muted); background: var(--surf); border: 1px solid var(--border); border-radius: 8px; }

	/* 5. Privacy note */
	.pnote {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-top: 28px;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}
	.pnote :global(svg) { flex-shrink: 0; margin-top: 2px; color: var(--muted); }
	.pnote p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--muted); }

	/* 6. FAQ */
	.faq { margin-top: 32px; padding-top: 28px; border-top: 1px solid var(--border); }
	.faq h2 { margin: 0 0 12px; font-size: 13px; font-weight: 700; letter-spacing: -.01em; color: var(--text); }
	.faq-list { border-top: 1px solid var(--border); }
	.faq-list details { border-bottom: 1px solid var(--border); }
	.faq-list summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 4px;
		font-size: 15px;
		font-weight: 500;
		color: var(--text);
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	.faq-list summary::-webkit-details-marker { display: none; }
	.faq-list summary::after { content: '+'; font-size: 18px; font-weight: 300; color: var(--muted); flex-shrink: 0; transition: transform .15s; }
	.faq-list details[open] > summary::after { transform: rotate(45deg); }
	.faq-list div { padding: 0 4px 14px; font-size: 14px; line-height: 1.65; color: var(--muted); }

	/* Mobile */
	@media (max-width: 500px) {
		.tags { display: none; }
		.row { grid-template-columns: minmax(0,1fr) 18px; gap: 10px; }
	}
</style>
