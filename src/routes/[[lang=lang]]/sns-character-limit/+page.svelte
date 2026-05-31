<script lang="ts">
	import { page } from '$app/stores';
	import CharacterCounter from '$lib/components/tools/CharacterCounter.svelte';
	import RelatedTools from '$lib/components/RelatedTools.svelte';
	import { getRelatedTools } from '$lib/config/relatedTools.js';
	import { translations } from '$lib/i18n/translations';
    import ToolSteps from '$lib/components/ToolSteps.svelte';

	type PageCopy = {
		metaTitle: string;
		metaDesc: string;
		heroTitle: string;
		heroSub: string;
		pill1: string;
		pill2: string;
		pill3: string;
		// Tool UI
		placeholder: string;
		clearBtn: string;
		copyBtn: string;
		copiedBtn: string;
		// Primary stats
		statChars: string;
		statCharsNoSpace: string;
		statWords: string;
		statBytes: string;
		// Secondary stats
		statSentences: string;
		statParagraphs: string;
		statLines: string;
		statReadTime: string;
		statFullWidth: string;
		statHalfWidth: string;
		statNoPunct: string;
		statManuscript: string;
		// Dynamic labels
		readTimeMin: (n: number) => string;
		readTimeSec: string;
		manuscriptPage: (n: string) => string;
		privacyNote: string;
	};

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || 'en');
	let dict = $derived(translations[currentLangKey] ?? translations.en);
	const t = (key: string) => dict[key] ?? translations.en[key] ?? key;

	let copy: PageCopy = $derived({
		metaTitle:        t('scl.meta.title'),
		metaDesc:         t('scl.meta.desc'),
		heroTitle:        t('scl.hero.title'),
		heroSub:          t('scl.hero.sub'),
		pill1:            t('scl.pill.realtime'),
		pill2:            t('scl.pill.noUpload'),
		pill3:            t('scl.pill.free'),
		// Tool UI
		placeholder:      t('cc.placeholder'),
		clearBtn:         t('cc.btn.clear'),
		copyBtn:          t('cc.btn.copy'),
		copiedBtn:        t('cc.btn.copied'),
		// Primary stats
		statChars:        t('cc.stat.chars'),
		statCharsNoSpace: t('cc.stat.charsNoSpace'),
		statWords:        t('cc.stat.words'),
		statBytes:        t('cc.stat.bytes'),
		// Secondary stats
		statSentences:    t('cc.stat.sentences'),
		statParagraphs:   t('cc.stat.paragraphs'),
		statLines:        t('cc.stat.lines'),
		statReadTime:     t('cc.stat.readTime'),
		statFullWidth:    t('cc.stat.fullWidth'),
		statHalfWidth:    t('cc.stat.halfWidth'),
		statNoPunct:      t('cc.stat.noPunct'),
		statManuscript:   t('cc.stat.manuscript'),
		// Dynamic labels
		readTimeMin:      (n: number) => t('cc.readTime.min').replace('{n}', String(n)),
		readTimeSec:      t('cc.readTime.sec'),
		manuscriptPage:   (n: string) => t('cc.manuscript.page').replace('{n}', n),
		privacyNote:      t('cc.note.privacy'),
	});

	let hasFaq = $derived(
		Array.from({ length: 8 }, (_, i) => i + 1).every(
			(n) =>
				Boolean(translations[currentLangKey]?.[`faq.scl.${n}.q`]) &&
				Boolean(translations[currentLangKey]?.[`faq.scl.${n}.a`]),
		),
	);

	function markdownToHtml(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
	}

	let jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: copy.metaTitle,
			description: copy.metaDesc,
			applicationCategory: 'UtilitiesApplication',
			operatingSystem: 'All',
			browserRequirements: 'Requires JavaScript',
			offers: {
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'USD',
			},
		}),
	);

	let relatedTools = $derived(getRelatedTools('sns-character-limit', currentLangKey, t));
</script>

<svelte:head>
	<title>{copy.metaTitle}</title>
	<meta property="og:title" content={copy.metaTitle} />
	<meta name="description" content={copy.metaDesc} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html copy.heroTitle}</h1>
			<p class="hero-sub">{copy.heroSub}</p>
			<div class="hero-pills">
				<div class="pill"><span class="pill-ico">⚡</span>{copy.pill1}</div>
				<div class="pill"><span class="pill-ico">🔒</span>{copy.pill2}</div>
				<div class="pill"><span class="pill-ico">🆓</span>{copy.pill3}</div>
			</div>
		</section>

		<div class="page-layout">
			<!-- ── Tool column ── -->
			<div class="tool-col">
				<CharacterCounter {copy} pageType="sns-character-limit" />

				<!-- ── How to use — 3 steps ── -->
				<ToolSteps
					title={t("steps.cc.title")}
					steps={[
						{
							title: t("steps.cc.1.title"),
							desc: t("steps.cc.1.desc"),
						},
						{
							title: t("steps.cc.2.title"),
							desc: t("steps.cc.2.desc"),
						},
						{
							title: t("steps.cc.3.title"),
							desc: t("steps.cc.3.desc"),
						},
					]}
				/>

				{#if hasFaq}
					<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
						<h2>{t('faq.scl.title')}</h2>
						<div class="faq-list">
							{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
								<details
									class="faq-item"
									itemscope
									itemprop="mainEntity"
									itemtype="https://schema.org/Question"
								>
									<summary class="faq-q" itemprop="name">
										{t(`faq.scl.${n}.q`)}
									</summary>
									<div
										class="faq-a"
										itemscope
										itemprop="acceptedAnswer"
										itemtype="https://schema.org/Answer"
									>
										<span itemprop="text">
											{@html markdownToHtml(t(`faq.scl.${n}.a`))}
										</span>
									</div>
								</details>
							{/each}
						</div>
					</section>
				{/if}

				<!-- ── Advanced tips — ẩn trong details, đặt sau FAQ ── -->
				<!-- {#if data.contentHtml}
					<section class="howto-sec">
						<h2 class="steps-title">{t("howto.section.title")}</h2>
						<details open class="howto-details">
							<summary class="howto-summary">
								{t("howto.toggle")}
							</summary>
							<section class="how-to-sec prose">{@html data.contentHtml}</section>
						</details>
					</section>
				{/if} -->
			</div>
			<!-- end .tool-col -->

			<!-- ── Sidebar column ── -->
			<aside class="sidebar-col">
				<RelatedTools
					label={t('relatedTools.label')}
					tools={relatedTools}
				/>
			</aside>
		</div>
		<!-- end .page-layout -->
	</div>
</main>

<style>
	.how-to-sec {
		margin-top: 0px;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}
	.how-to-sec :global(a) { color: #1550ae; }
	.how-to-sec :global(h1) { font-size: 1.35rem; font-weight: 650; color: var(--fg); margin: 0 0 20px; line-height: 1.3; }
	.how-to-sec :global(h2) { font-size: 1.05rem; font-weight: 600; color: var(--fg); margin: 15px 0 10px; }
	.how-to-sec :global(h3) { font-size: 0.95rem; font-weight: 600; color: var(--fg); margin: 20px 0 8px; }
	.how-to-sec :global(p) { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin: 0 0 12px; }
	.how-to-sec :global(ul), .how-to-sec :global(ol) { padding-left: 1.4em; margin: 8px 0 16px; }
	.how-to-sec :global(li) { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin-bottom: 6px; }
	.how-to-sec :global(li strong) { color: var(--fg); font-weight: 600; }
	.how-to-sec :global(strong) { color: var(--fg); font-weight: 600; }
	.how-to-sec :global(hr) { border: none; border-top: 1px solid var(--border); margin: 15px 0; }
	.how-to-sec :global(blockquote) {
		margin: 12px 0 16px; padding: 10px 14px;
		border-left: 3px solid var(--accent);
		background: var(--surface, rgba(0,0,0,0.03));
		border-radius: 0 6px 6px 0;
	}
	.how-to-sec :global(blockquote p) { margin: 0; font-size: 0.85rem; }
	.how-to-sec :global(table) { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 12px 0 20px; }
	.how-to-sec :global(th) { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--fg); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.how-to-sec :global(td) { padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--muted); }
	.how-to-sec :global(tr:last-child td) { border-bottom: none; }
</style>
