<script lang="ts">
	import { page } from '$app/stores';
	import BarcodeGenerator from '$lib/components/tools/BarcodeGenerator.svelte';
	import { getRelatedTools } from '$lib/config/relatedTools.js';
	import { translations } from '$lib/i18n/translations';

	type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'JAN' | 'UPCA' | 'UPCE' | 'ITF14' | 'MSI' | 'pharmacode' | 'codabar';

	type PageCopy = {
		metaTitle: string;
		metaDesc: string;
		heroTitle: string;
		heroSub: string;
		pill1: string;
		pill2: string;
		pill3: string;
		modeLabel: string;
		modeSingle: string;
		modeBulk: string;
		valueLabel: string;
		valuePlaceholder: string;
		fileLabel: string;
		formatLabel: string;
		heightLabel: string;
		lineWidthLabel: string;
		showTextLabel: string;
		showTextOn: string;
		showTextOff: string;
		customTextLabel: string;
		customTextPlaceholder: string;
		outputLabel: string;
		generateButton: string;
		generateAllButton: string;
		addRow: string;
		download: string;
		downloadAll: string;
		newBarcode: string;
		resultTitle: string;
		resultBulkDone: string;
		privacyNote: string;
		errorEmpty: string;
		errorInvalid: string;
		errorGenerate: string;
		remove: string;
		formatOptions: { value: BarcodeFormat; label: string; sub: string }[];
	};

    const VALID_FORMATS: BarcodeFormat[] = [
        'CODE128','CODE39','EAN13','EAN8','JAN','UPCA','UPCE','ITF14','MSI','pharmacode','codabar'
    ];

    let initialFormat = $derived((): BarcodeFormat | undefined => {
        const raw = $page.url.searchParams.get('type')?.toUpperCase() as BarcodeFormat | undefined;
        return raw && VALID_FORMATS.includes(raw) ? raw : undefined;
    });

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || 'en');
	let dict = $derived(translations[currentLangKey] ?? translations.en);
	const t = (key: string) => dict[key] ?? translations.en[key] ?? key;

	let copy: PageCopy = $derived({
		metaTitle:        t('barcode.meta.title'),
		metaDesc:         t('barcode.meta.desc'),
		heroTitle:        t('barcode.hero.title'),
		heroSub:          t('barcode.hero.sub'),
		pill1:            t('barcode.pill.free'),
		pill2:            t('barcode.pill.noUpload'),
		pill3:            t('barcode.pill.bulk'),
		modeLabel:        t('barcode.mode.label'),
		modeSingle:       t('barcode.mode.single'),
		modeBulk:         t('barcode.mode.bulk'),
		valueLabel:       t('barcode.value.label'),
		valuePlaceholder: t('barcode.value.placeholder'),
		fileLabel:        t('barcode.file.label'),
		formatLabel:      t('barcode.format.label'),
		heightLabel:      t('barcode.height.label'),
		lineWidthLabel:   t('barcode.lineWidth.label'),
		showTextLabel:    t('barcode.showText.label'),
		showTextOn:       t('barcode.showText.on'),
		showTextOff:      t('barcode.showText.off'),
		customTextLabel:  t('barcode.customText.label'),
		customTextPlaceholder: t('barcode.customText.placeholder'),
		outputLabel:      t('barcode.output.label'),
		generateButton:   t('barcode.btn.generate'),
		generateAllButton:t('barcode.btn.generateAll'),
		addRow:           t('barcode.btn.addRow'),
		download:         t('barcode.btn.download'),
		downloadAll:      t('barcode.btn.downloadAll'),
		newBarcode:       t('barcode.btn.new'),
		resultTitle:      t('barcode.res.title'),
		resultBulkDone:   t('barcode.res.bulkDone'),
		privacyNote:      t('barcode.note.privacy'),
		errorEmpty:       t('barcode.error.empty'),
		errorInvalid:     t('barcode.error.invalid'),
		errorGenerate:    t('barcode.error.generate'),
		remove:           t('barcode.btn.remove'),
		formatOptions: [
			{ value: 'CODE128', label: 'CODE 128', sub: t('barcode.format.code128.sub') },
			{ value: 'CODE39',  label: 'CODE 39',  sub: t('barcode.format.code39.sub') },
			{ value: 'EAN13',   label: 'EAN-13',   sub: t('barcode.format.ean13.sub') },
			{ value: 'JAN',     label: 'JAN',       sub: t('barcode.format.jan.sub') },
			{ value: 'EAN8',    label: 'EAN-8',    sub: t('barcode.format.ean8.sub') },
			{ value: 'UPCA',    label: 'UPC-A',    sub: t('barcode.format.upca.sub') },
			{ value: 'ITF14',   label: 'ITF-14',   sub: t('barcode.format.itf14.sub') },
		],
	});

	let hasFaq = $derived(
		Array.from({ length: 8 }, (_, i) => i + 1).every(
			(n) =>
				Boolean(translations[currentLangKey]?.[`faq.barcode.${n}.q`]) &&
				Boolean(translations[currentLangKey]?.[`faq.barcode.${n}.a`]),
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

	let relatedTools = $derived(getRelatedTools('barcode-generator', currentLangKey, t));
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
				<div class="pill"><span class="pill-ico">🆓</span>{copy.pill1}</div>
				<div class="pill"><span class="pill-ico">🔒</span>{copy.pill2}</div>
				<div class="pill"><span class="pill-ico">⚡</span>{copy.pill3}</div>
			</div>
		</section>

		<BarcodeGenerator {copy} {relatedTools} initialFormat={initialFormat()} />

		{#if data.contentHtml}
			<section class="how-to-sec prose">
				{@html data.contentHtml}
			</section>
		{/if}

		{#if hasFaq}
			<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
				<h2>{t('faq.barcode.title')}</h2>
				<div class="faq-list">
					{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
						<details
							class="faq-item"
							itemscope
							itemprop="mainEntity"
							itemtype="https://schema.org/Question"
						>
							<summary class="faq-q" itemprop="name">
								{t(`faq.barcode.${n}.q`)}
							</summary>
							<div
								class="faq-a"
								itemscope
								itemprop="acceptedAnswer"
								itemtype="https://schema.org/Answer"
							>
								<span itemprop="text">
									{@html markdownToHtml(t(`faq.barcode.${n}.a`))}
								</span>
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}
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
	.how-to-sec :global(hr) { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
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
