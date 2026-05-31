<script lang="ts">
	import { page } from "$app/stores";
	import VideoConverter from "$lib/components/tools/VideoConverter.svelte";
	import RelatedTools from "$lib/components/RelatedTools.svelte";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import { translations } from "$lib/i18n/translations";
    import ToolSteps from "$lib/components/ToolSteps.svelte";
    import { markdownToHtml } from "$lib/utils/utils.js";

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
		convertFailedError: string;
	};

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || "en");
	let dict = $derived(translations[currentLangKey] ?? translations.en);

	const t = (key: string) => dict[key] ?? translations.en[key] ?? key;

	let copy: PageCopy = $derived({
		metaTitle: t("mkvToMp4.meta.title"),
		metaDesc: t("mkvToMp4.meta.desc"),
		heroTitle: t("mkvToMp4.hero.title"),
		heroSub: t("mkvToMp4.hero.sub"),
		pill1: t("mkvToMp4.pill.mkv"),
		pill2: t("convert.pill.noInstall"),
		pill3: t("hero.pill1"),
		dropTitle: t("mkvToMp4.drop.title"),
		dropSub: t("convert.drop.sub"),
		browse: t("btn.browse"),
		hint: t("mkvToMp4.hint"),
		formatLabel: t("convert.format.label"),
		convertButton: t("mkvToMp4.btn.convert"),
		loadingLabel: t("convert.status.loading"),
		convertingLabel: t("mkvToMp4.status.converting"),
		doneLabel: t("status.done"),
		keepOpen: t("convert.warning.keepOpen"),
		selectVideoError: t("mkvToMp4.error.selectVideo"),
		resultTitle: t("mkvToMp4.res.title"),
		resultSub: t("mkvToMp4.res.sub"),
		download: t("mkvToMp4.btn.download"),
		newFile: t("mkvToMp4.btn.new"),
		original: t("stat.original"),
		converted: t("convert.stat.converted"),
		format: t("convert.stat.format"),
		privacyNote: t("mkvToMp4.note.privacy"),
		fileTypeFallback: t("mkvToMp4.fileTypeFallback"),
		remove: t("convert.btn.remove"),
		convertFailedError: t("convert.error.failed"),
		outputOptions: [
			{ value: "mp4", label: t("convert.output.mp4.label"), sub: t("convert.output.mp4.sub") },
			{ value: "webm", label: t("convert.output.webm.label"), sub: t("convert.output.webm.sub") },
			{ value: "mov", label: t("convert.output.mov.label"), sub: t("convert.output.mov.sub") },
			{ value: "mkv", label: t("convert.output.mkv.label"), sub: t("convert.output.mkv.sub") },
		],
	});

	let jsonLd = $derived(
		JSON.stringify(
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
			}
		),
	);

	let relatedTools = $derived(getRelatedTools('mkv-to-mp4', currentLangKey, t));
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
			<p class="hero-sub">{copy.heroSub}</p>
			<div class="hero-pills">
				<div class="pill"><span class="pill-ico">🔒</span>{copy.pill1}</div>
				<div class="pill"><span class="pill-ico">✨</span>{t("hero.pill2")}</div>
				<div class="pill"><span class="pill-ico">⚡</span>{copy.pill3}</div>
			</div>
		</section>

		<div class="page-layout">

			<!-- ── Tool column ── -->
			<div class="tool-col">
				<VideoConverter {copy} sampleVideoUrl="/file_sample_1280x720.mkv"/>

				<!-- ── How to use — 3 steps ── -->
				<ToolSteps
					title={t("steps.title")}
					steps={[
						{
							title: t("steps.1.title"),
							desc: t("steps.1.desc"),
						},
						{
							title: t("steps.2.title"),
							desc: t("steps.2.desc"),
						},
						{
							title: t("steps.3.title"),
							desc: t("steps.3.desc"),
						},
					]}
				/>

				<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
					<h2>{t("faq.mkvToMp4.title")}</h2>
					<div class="faq-list">
						{#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
							<details
								class="faq-item"
								itemscope
								itemprop="mainEntity"
								itemtype="https://schema.org/Question"
							>
								<summary class="faq-q" itemprop="name">
									{t(`faq.mkvToMp4.${n}.q`)}
								</summary>
								<div
									class="faq-a"
									itemscope
									itemprop="acceptedAnswer"
									itemtype="https://schema.org/Answer"
								>
									<span itemprop="text">
										{@html markdownToHtml(t(`faq.mkvToMp4.${n}.a`))}
									</span>
								</div>
							</details>
						{/each}
					</div>
				</section>

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
					label={t("relatedTools.label")}
					tools={relatedTools}
				/>
			</aside>

		</div>
		<!-- end .page-layout -->
	</div>
</main>

<style>
	.how-to-sec {
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	.how-to-sec :global(a) { color: #1550ae; }
	.how-to-sec :global(h1) {
		font-size: 1.35rem; font-weight: 650; color: var(--text);
		margin: 0 0 20px; line-height: 1.3;
	}
	.how-to-sec :global(h2) {
		font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 15px 0 10px;
	}
	.how-to-sec :global(h3) {
		font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 20px 0 8px;
	}
	.how-to-sec :global(p) {
		font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin: 0 0 12px;
	}
	.how-to-sec :global(ul), .how-to-sec :global(ol) {
		padding-left: 1.4em; margin: 8px 0 16px;
	}
	.how-to-sec :global(li) {
		font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin-bottom: 6px;
	}
	.how-to-sec :global(li strong), .how-to-sec :global(strong) {
		color: var(--text); font-weight: 600;
	}
	.how-to-sec :global(hr) {
		border: none; border-top: 1px solid var(--border); margin: 15px 0;
	}
	.how-to-sec :global(blockquote) {
		margin: 12px 0 16px; padding: 10px 14px;
		border-left: 3px solid var(--accent);
		background: var(--surface, rgba(0,0,0,0.03));
		border-radius: 0 6px 6px 0;
	}
	.how-to-sec :global(blockquote p) { margin: 0; font-size: 0.85rem; }
	.how-to-sec :global(table) {
		width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 12px 0 20px;
	}
	.how-to-sec :global(th) {
		text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border);
		color: var(--text); font-weight: 600; font-size: 0.8rem;
		text-transform: uppercase; letter-spacing: 0.04em;
	}
	.how-to-sec :global(td) {
		padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--muted);
	}
	.how-to-sec :global(tr:last-child td) { border-bottom: none; }
</style>
