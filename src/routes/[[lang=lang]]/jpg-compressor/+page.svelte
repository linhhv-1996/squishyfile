<script lang="ts">
	import { page } from "$app/stores";
	import ImageCompressor from "$lib/components/tools/ImageCompressor.svelte";
	import { translations } from "$lib/i18n/translations";

	type PageCopy = {
		metaTitle: string;
		metaDesc: string;
		heroTitle: string;
		heroSub: string;
		pill1: string;
		pill2: string;
		pill3: string;

		dropTitle: string;
		dropSub: string;
		browse: string;
		hint: string;

		formatLabel: string;
		qualityLabel: string;
		maxWidthLabel: string;

		compressButton: string;
		loadingLabel: string;
		compressingLabel: string;
		doneLabel: string;
		keepOpen: string;
		selectImageError: string;

		resultTitle: string;
		resultSub: string;
		download: string;
		downloadAll: string;
		newFile: string;

		original: string;
		compressed: string;
		saved: string;
		format: string;

		privacyNote: string;
		fileTypeFallback: string;
		remove: string;
		addLabel: string;
	};

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || "en");
	let dict = $derived(translations[currentLangKey] ?? translations.en);

	function t(key: string, fallback: string) {
		const value = dict[key] ?? translations.en[key];
		return value && value !== key ? value : fallback;
	}

	let copy: PageCopy = $derived({
		metaTitle: t("jpgCompressor.meta.title", "JPG Compressor Online – Reduce JPEG File Size"),
		metaDesc: t(
			"jpgCompressor.meta.desc",
			"Compress JPG and JPEG images online for free. Reduce photo file size locally in your browser while keeping clear image quality."
		),
		heroTitle: t("jpgCompressor.hero.title", "Compress JPG images online"),
		heroSub: t(
			"jpgCompressor.hero.sub",
			"Reduce JPG and JPEG file size directly in your browser. Fast, private, and free."
		),
		pill1: t("jpgCompressor.pill.jpg", "JPG & JPEG"),
		pill2: t("convert.pill.noInstall", "No install"),
		pill3: t("hero.pill1", "Local processing"),

		dropTitle: t("jpgCompressor.drop.title", "Drop JPG images here"),
		dropSub: t("jpgCompressor.drop.sub", "Add one or more JPG/JPEG images and compress them at once."),
		browse: t("btn.browse", "Browse Files"),
		hint: t("jpgCompressor.hint", "Best for photos, product images, and upload-ready JPG files."),

		formatLabel: t("convert.format.label", "Output format"),
		qualityLabel: t("jpgCompressor.quality.label", "JPG quality"),
		maxWidthLabel: t("imageCompressor.maxWidth.label", "Width"),

		compressButton: t("jpgCompressor.btn.compress", "Compress JPG"),
		loadingLabel: t("convert.status.loading", "Loading"),
		compressingLabel: t("jpgCompressor.status.compressing", "Compressing JPG"),
		doneLabel: t("status.done", "done"),
		keepOpen: t("convert.warning.keepOpen", "Keep this tab open while processing."),
		selectImageError: t("jpgCompressor.error.selectImage", "Please select JPG or JPEG image files."),

		resultTitle: t("jpgCompressor.res.title", "JPG compression complete"),
		resultSub: t("jpgCompressor.res.sub", "Your compressed JPG images are ready to download."),
		download: t("jpgCompressor.btn.download", "Download"),
		downloadAll: t("jpgCompressor.btn.downloadAll", "Download all"),
		newFile: t("jpgCompressor.btn.new", "Start over"),

		original: t("stat.original", "Original"),
		compressed: t("jpgCompressor.stat.compressed", "Compressed JPG"),
		saved: t("imageCompressor.stat.saved", "Saved"),
		format: t("convert.stat.format", "Format"),

		privacyNote: t(
			"jpgCompressor.note.privacy",
			"<strong>Private by design.</strong> JPG images are compressed locally in your browser and are not uploaded."
		),
		fileTypeFallback: t("jpgCompressor.fileTypeFallback", "JPG image"),
		remove: t("convert.btn.remove", "Remove"),
		addLabel: t("imageCompressor.btn.addLabel", "addLabel"),
	});

	let jsonLd = $derived(
		JSON.stringify({
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: copy.metaTitle,
			description: copy.metaDesc,
			applicationCategory: "MultimediaApplication",
			operatingSystem: "All",
			browserRequirements: "Requires JavaScript and WebAssembly",
			featureList: [
				"JPG and JPEG image compression",
				"Batch JPG optimization",
				"Adjustable JPG quality",
				"Local browser processing",
			],
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
		}).replace(/</g, "\\u003c")
	);

	function markdownToHtml(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}
</script>

<svelte:head>
	<title>{copy.metaTitle}</title>
	<meta property="og:title" content={copy.metaTitle} />
	<meta name="description" content={copy.metaDesc} />
	<meta property="og:description" content={copy.metaDesc} />
	<meta property="og:type" content="website" />

	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html copy.heroTitle}</h1>
			<p>{copy.heroSub}</p>

			<div class="pills">
				<div class="pill">
					<span class="dot"></span><span>{copy.pill1}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{copy.pill2}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{copy.pill3}</span>
				</div>
			</div>
		</section>

		<ImageCompressor {copy} />

		{#if data.contentHtml}
			<section class="how-to-sec prose">
				{@html data.contentHtml}
			</section>
		{/if}

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t("faq.jpgCompressor.title", "JPG compressor FAQ")}</h2>

			<div class="faq-list">
				{#each Array.from({ length: 6 }, (_, i) => i + 1) as n}
					<details
						class="faq-item"
						itemscope
						itemprop="mainEntity"
						itemtype="https://schema.org/Question"
					>
						<summary class="faq-q" itemprop="name">
							{t(`faq.jpgCompressor.${n}.q`, "")}
						</summary>

						<div
							class="faq-a"
							itemscope
							itemprop="acceptedAnswer"
							itemtype="https://schema.org/Answer"
						>
							<span itemprop="text">
								{@html markdownToHtml(t(`faq.jpgCompressor.${n}.a`, ""))}
							</span>
						</div>
					</details>
				{/each}
			</div>
		</section>
	</div>
</main>

<style>
	.how-to-sec {
		margin-top: 0px;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}

	.how-to-sec :global(a) {
		color: #1550ae;
	}

	.how-to-sec :global(h1) {
		font-size: 1.35rem;
		font-weight: 650;
		color: var(--text);
		margin: 0 0 20px;
		line-height: 1.3;
	}

	.how-to-sec :global(h2) {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--text);
		margin: 15px 0 10px;
	}

	.how-to-sec :global(h3) {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		margin: 20px 0 8px;
	}

	.how-to-sec :global(p) {
		font-size: 0.9rem;
		color: var(--muted);
		line-height: 1.7;
		margin: 0 0 12px;
	}

	.how-to-sec :global(ul),
	.how-to-sec :global(ol) {
		padding-left: 1.4em;
		margin: 8px 0 16px;
	}

	.how-to-sec :global(li) {
		font-size: 0.9rem;
		color: var(--muted);
		line-height: 1.7;
		margin-bottom: 6px;
	}

	.how-to-sec :global(li strong),
	.how-to-sec :global(strong) {
		color: var(--text);
		font-weight: 600;
	}

	.how-to-sec :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 28px 0;
	}

	.how-to-sec :global(blockquote) {
		margin: 12px 0 16px;
		padding: 10px 14px;
		border-left: 3px solid var(--accent);
		background: var(--surf2);
		border-radius: 0 6px 6px 0;
	}

	.how-to-sec :global(blockquote p) {
		margin: 0;
		font-size: 0.85rem;
	}

	.how-to-sec :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		margin: 12px 0 20px;
	}

	.how-to-sec :global(th) {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.how-to-sec :global(td) {
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
	}

	.how-to-sec :global(tr:last-child td) {
		border-bottom: none;
	}
</style>
