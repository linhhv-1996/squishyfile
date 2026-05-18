<script lang="ts">
	import { page } from "$app/stores";
	import VideoConverter from "$lib/components/tools/VideoConverter.svelte";
	import { translations } from "$lib/i18n/translations";

	type VideoOutputFormat = "mp4" | "webm" | "mov" | "mkv";
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
		convertButton: string;
		loadingLabel: string;
		convertingLabel: string;
		doneLabel: string;
		keepOpen: string;
		selectVideoError: string;
		resultTitle: string;
		resultSub: string;
		download: string;
		newFile: string;
		original: string;
		converted: string;
		format: string;
		privacyNote: string;
		fileTypeFallback: string;
		remove: string;
		outputOptions: { value: VideoOutputFormat; label: string; sub: string }[];
	};

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || "en");
	let dict = $derived(translations[currentLangKey] ?? translations.en);

	const t = (key: string) => dict[key] ?? translations.en[key] ?? key;

	let copy: PageCopy = $derived({
		metaTitle: t("aviToMp4.meta.title"),
		metaDesc: t("aviToMp4.meta.desc"),
		heroTitle: t("aviToMp4.hero.title"),
		heroSub: t("aviToMp4.hero.sub"),
		pill1: t("aviToMp4.pill.avi"),
		pill2: t("convert.pill.noInstall"),
		pill3: t("hero.pill1"),
		dropTitle: t("aviToMp4.drop.title"),
		dropSub: t("convert.drop.sub"),
		browse: t("btn.browse"),
		hint: t("aviToMp4.hint"),
		formatLabel: t("convert.format.label"),
		convertButton: t("aviToMp4.btn.convert"),
		loadingLabel: t("convert.status.loading"),
		convertingLabel: t("aviToMp4.status.converting"),
		doneLabel: t("status.done"),
		keepOpen: t("convert.warning.keepOpen"),
		selectVideoError: t("aviToMp4.error.selectVideo"),
		resultTitle: t("aviToMp4.res.title"),
		resultSub: t("aviToMp4.res.sub"),
		download: t("aviToMp4.btn.download"),
		newFile: t("aviToMp4.btn.new"),
		original: t("stat.original"),
		converted: t("convert.stat.converted"),
		format: t("convert.stat.format"),
		privacyNote: t("aviToMp4.note.privacy"),
		fileTypeFallback: t("aviToMp4.fileTypeFallback"),
		remove: t("convert.btn.remove"),
		outputOptions: [
			{
				value: "mp4",
				label: t("convert.output.mp4.label"),
				sub: t("aviToMp4.output.mp4.sub"),
			},
		],
	});

	let jsonLd = $derived(
		JSON.stringify([
			{
				"@context": "https://schema.org",
				"@type": "WebApplication",
				name: copy.metaTitle,
				description: copy.metaDesc,
				applicationCategory: "MultimediaApplication",
				operatingSystem: "All",
				browserRequirements: "Requires JavaScript and WebAssembly",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
			{
				"@context": "https://schema.org",
				"@type": "FAQPage",
				mainEntity: Array.from({ length: 6 }, (_, index) => {
					const n = index + 1;

					return {
						"@type": "Question",
						name: t(`faq.aviToMp4.${n}.q`),
						acceptedAnswer: {
							"@type": "Answer",
							text: t(`faq.aviToMp4.${n}.a`),
						},
					};
				}),
			},
		]),
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

		<VideoConverter {copy} />

		{#if data.contentHtml}
			<section class="how-to-sec prose">
				{@html data.contentHtml}
			</section>
		{/if}

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t("faq.aviToMp4.title")}</h2>

			<div class="faq-list">
				{#each Array.from({ length: 6 }, (_, i) => i + 1) as n}
					<details
						class="faq-item"
						itemscope
						itemprop="mainEntity"
						itemtype="https://schema.org/Question"
					>
						<summary class="faq-q" itemprop="name">
							{t(`faq.aviToMp4.${n}.q`)}
						</summary>

						<div
							class="faq-a"
							itemscope
							itemprop="acceptedAnswer"
							itemtype="https://schema.org/Answer"
						>
							<span itemprop="text">
								{@html markdownToHtml(t(`faq.aviToMp4.${n}.a`))}
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
		color: var(--fg);
		margin: 0 0 20px;
		line-height: 1.3;
	}

	.how-to-sec :global(h2) {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--fg);
		margin: 15px 0 10px;
	}

	.how-to-sec :global(h3) {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--fg);
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
		color: var(--fg);
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
		background: var(--surface, rgba(0, 0, 0, 0.03));
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
		color: var(--fg);
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

	.faq-sec {
		margin-top: 28px;
		padding-top: 24px;
		border-top: 1px solid var(--border);
	}

	.faq-sec h2 {
		font-size: 1.12rem;
		font-weight: 650;
		color: var(--fg);
		margin: 0 0 14px;
	}

	.faq-list {
		display: grid;
		gap: 8px;
	}

	.faq-item {
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--card, transparent);
		overflow: hidden;
	}

	.faq-q {
		cursor: pointer;
		list-style: none;
		padding: 12px 14px;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--fg);
	}

	.faq-q::-webkit-details-marker {
		display: none;
	}

	.faq-a {
		padding: 0 14px 13px;
		font-size: 0.88rem;
		line-height: 1.7;
		color: var(--muted);
	}

	.faq-a :global(strong) {
		color: var(--fg);
	}
</style>
