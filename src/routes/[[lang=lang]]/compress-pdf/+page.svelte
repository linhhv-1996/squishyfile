<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
	import { marked } from "marked";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		FileText,
		Folder,
		X,
		CheckCircle2,
		Download,
		ShieldCheck,
		AlertTriangle,
		Scale,
		Gauge,
	} from "lucide-svelte";

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(
		languages.find((l) => l.key === currentLangKey) || languages[0],
	);
	let t = $derived(
		(key: string) =>
			translations[activeLang.key]?.[key] ||
			translations["en"][key] ||
			key,
	);

	let jsonLd = $derived(
		JSON.stringify([
			{
				"@context": "https://schema.org",
				"@type": "WebApplication",
				name: t("pdf.meta.title"),
				description: t("pdf.meta.desc"),
				applicationCategory: "UtilitiesApplication",
				operatingSystem: "All",
				browserRequirements: "Requires JavaScript",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
			{
				"@context": "https://schema.org",
				"@type": "FAQPage",
				mainEntity: [
					{
						"@type": "Question",
						name: t("faq.pdf.1.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.1.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.pdf.2.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.2.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.pdf.3.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.3.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.pdf.4.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.4.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.pdf.5.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.5.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.pdf.6.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.pdf.6.a"),
						},
					},
				],
			},
		]),
	);

	// --- How-to-use markdown content ---
	let { data } = $props();
	// ------------------------------------

	let dragOver = $state(false);

	let pdfInput: HTMLInputElement;
	let pdfFile: File | null = $state(null);
	let pdfPassword = $state("");
	let removePdfPassword = $state(false);
	let pdfError = $state("");
	let pdfProcessing = $state(false);
	let pdfBusy = $state(false);
	let pdfQuality = $state<"balanced" | "maximum">("balanced");
	let pdfResult: {
		href: string;
		download: string;
		original: string;
		compressed: string;
		saved: string;
	} | null = $state(null);

	function triggerInput() {
		pdfInput.click();
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) loadFile(file);
	}

	function loadFile(file: File) {
		pdfFile = file;
		pdfError = "";
		pdfProcessing = false;
		clearResult();
	}

	function clearFile() {
		pdfFile = null;
		if (pdfInput) pdfInput.value = "";
		pdfError = "";
		pdfBusy = false;
		pdfProcessing = false;
		pdfPassword = "";
		removePdfPassword = false;
		clearResult();
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file && file.type === "application/pdf") loadFile(file);
	}

	function fmtBytes(bytes: number) {
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824)
			return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	async function startPdfCompress() {
		if (!pdfFile) {
			pdfError = t("error.selectPdf");
			return;
		}
		if (removePdfPassword && !pdfPassword.trim()) {
			pdfError = t("error.enterPassword");
			return;
		}

		pdfError = "";
		clearResult();
		pdfBusy = true;
		pdfProcessing = true;

		const originalSize = pdfFile.size;
		const fileUrl = URL.createObjectURL(pdfFile);

		const worker = new Worker(
			new URL("$lib/workers/pdf-worker.ts", import.meta.url),
			{ type: "module" },
		);

		worker.postMessage({
			fileUrl,
			password: removePdfPassword ? pdfPassword.trim() : null,
			quality: pdfQuality,
		});

		worker.onmessage = (e) => {
			const { success, pdfData, error } = e.data;

			if (success) {
				const blob = new Blob([pdfData], { type: "application/pdf" });
				const finalSize = blob.size;
				const finalPdfUrl = URL.createObjectURL(blob);
				const base = pdfFile!.name.replace(/\.[^.]+$/, "");
				const ratio = finalSize / originalSize;

				pdfResult = {
					href: finalPdfUrl,
					download: removePdfPassword
						? `${base}_unlocked.pdf`
						: `${base}_compressed.pdf`,
					original: fmtBytes(originalSize),
					compressed: fmtBytes(finalSize),
					saved: `${Math.max(0, Math.round((1 - ratio) * 100))}%`,
				};
			} else {
				pdfError = error || t("error.generic");
			}

			pdfBusy = false;
			pdfProcessing = false;
			worker.terminate();
			URL.revokeObjectURL(fileUrl);
		};

		worker.onerror = (err) => {
			console.error("❌ Worker Error:", err);
			pdfBusy = false;
			pdfProcessing = false;
			pdfError = t("error.workerFailed");
			worker.terminate();
			URL.revokeObjectURL(fileUrl);
		};
	}

	function clearResult() {
		if (pdfResult?.href) URL.revokeObjectURL(pdfResult.href);
		pdfResult = null;
	}

	onDestroy(() => {
		clearResult();
	});

	function markdownToHtml(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}
</script>

<svelte:head>
	<title>{t("pdf.meta.title")}</title>
	<meta property="og:title" content={t("pdf.meta.title")} />
	<meta name="description" content={t("pdf.meta.desc")} />

	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html t("pdf.hero.title")}</h1>
			<p>{t("pdf.hero.sub")}</p>
			<div class="pills">
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill1")}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill2")}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill3")}</span>
				</div>
			</div>
		</section>

		{#if !pdfFile}
			<button
				class:over={dragOver}
				class="dz dz--pdf"
				type="button"
				onclick={triggerInput}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				ondrop={onDrop}
			>
				<div class="dz-ico dz-ico--pdf">
					<FileText size={24} strokeWidth={1.5} />
				</div>
				<h3>{t("drop.pdf")}</h3>
				<p class="sub">{t("drop.pdf.sub")}</p>
				<span class="btn-browse"
					><Folder size={14} strokeWidth={2} />
					{t("btn.browse")}</span
				>
				<p class="fmt-hint">{t("hint.pdf")}</p>
			</button>
		{/if}
		<input
			bind:this={pdfInput}
			class="file-input"
			type="file"
			accept="application/pdf"
			onchange={handleFile}
		/>

		{#if pdfFile}
			<div class="card">
				<div class="file-row">
					<div class="file-ico file-ico--pdf">
						<FileText size={18} strokeWidth={1.8} />
					</div>
					<div class="file-info">
						<div class="file-name">{pdfFile.name}</div>
						<div class="file-sz">
							{fmtBytes(pdfFile.size)} · PDF
						</div>
					</div>
					<button
						class="btn-rm"
						type="button"
						onclick={clearFile}
						title="Remove"
						disabled={pdfBusy}
					>
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>

				<div class="csec">
					<span class="slabel">{t("sec.pdfQuality")}</span>
					<div class="preset-grid preset-grid--2">
						<button
							class="pc"
							class:on={pdfQuality === "balanced"}
							class:disabled-opt={pdfBusy}
							disabled={pdfBusy}
							type="button"
							onclick={() => (pdfQuality = "balanced")}
						>
							<span class="lb">{t("pdf.preset.balanced")}</span>
							<span class="sb"
								>{t("pdf.preset.balanced.sub")}</span
							>
						</button>
						<button
							class="pc"
							class:on={pdfQuality === "maximum"}
							class:disabled-opt={pdfBusy}
							disabled={pdfBusy}
							type="button"
							onclick={() => (pdfQuality = "maximum")}
						>
							<span class="lb">{t("pdf.preset.maximum")}</span>
							<span class="sb">{t("pdf.preset.maximum.sub")}</span
							>
						</button>
					</div>
				</div>

				<div class="csec">
					<span class="slabel">
						<label
							style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;"
						>
							<input
								type="checkbox"
								bind:checked={removePdfPassword}
								style="cursor: pointer;"
								disabled={pdfBusy}
							/>
							{t("sec.pdfPasswordOpt")}
						</label>
					</span>
					{#if removePdfPassword}
						<div
							class="target-input-wrap"
							style="margin-top: 10px;"
						>
							<input
								bind:value={pdfPassword}
								type="password"
								placeholder={t("input.password.ph")}
								class="pass-input"
								disabled={pdfBusy}
							/>
						</div>
						<p class="pass-hint">{t("pdf.password.hint")}</p>
					{/if}
				</div>

				<!-- Spinner -->
				{#if pdfProcessing}
					<div class="pdf-spinner-row">
						<div class="pdf-spinner"></div>
						<span class="pdf-spinner-label"
							>{t("status.processing")}</span
						>
					</div>
				{/if}

				<!-- Warning đỏ — ngay dưới spinner, trong card -->
				{#if pdfBusy}
					<p class="keep-open-warning">
						{t("status.warning.keepTab")}
					</p>
				{/if}

				<div class:show={Boolean(pdfError)} class="errbar">
					<AlertTriangle size={15} strokeWidth={2} />
					<span>{pdfError}</span>
				</div>

				<div class="action">
					<button
						class="btn-go btn-go--pdf"
						type="button"
						disabled={pdfBusy}
						onclick={startPdfCompress}
					>
						<FileText size={16} strokeWidth={2.2} />
						{t("btn.compressPdf")}
					</button>
				</div>
			</div>
		{/if}

		<!-- Kết quả với stats -->
		<div class:show={Boolean(pdfResult)} class="res">
			<div class="res-head">
				<div class="res-ico">
					<CheckCircle2 size={16} strokeWidth={2} />
				</div>
				<div>
					<div class="res-title">{t("res.pdf.title")}</div>
					<div class="res-sub">{t("res.pdf.sub")}</div>
				</div>
			</div>
			<div class="stats">
				<div class="stat">
					<div class="sv">{pdfResult?.original ?? "—"}</div>
					<div class="sl">{t("stat.original")}</div>
				</div>
				<div class="stat">
					<div class="sv">{pdfResult?.compressed ?? "—"}</div>
					<div class="sl">{t("stat.compressed")}</div>
				</div>
				<div class="stat">
					<div class="sv g">{pdfResult?.saved ?? "—"}</div>
					<div class="sl">{t("stat.saved")}</div>
				</div>
			</div>
			<a
				class="btn-dl"
				href={pdfResult?.href ?? "#"}
				download={pdfResult?.download}
			>
				<Download size={15} strokeWidth={2.2} />
				{t("btn.dl.pdf")}
			</a>
			<button
				class="btn-new"
				type="button"
				onclick={clearFile}
			>
				<FileText size={15} strokeWidth={2.2} />
				{t("btn.compressNew")}
			</button>

		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>{@html t("note.privacy")}</p>
		</div>

		<!-- Optional ad slot: desktop side banners dùng .banner-left/.banner-right ở layout ngoài; slot này dành cho mobile/tablet hoặc in-content ads. Để trống thì CSS sẽ tự ẩn. -->
		<div class="ad-slot ad-slot--after-tool" aria-label="Advertisement"></div>

		<!-- <div class="feats">
			<div class="feat">
				<div class="fi"><Gauge size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t("feat.pdf.compress.title")}</div>
					<div class="fd">{t("feat.pdf.compress.desc")}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi">
					<ShieldCheck size={20} strokeWidth={1.8} />
				</div>
				<div class="ftxt">
					<div class="ft">{t("feat.pdf.privacy.title")}</div>
					<div class="fd">{t("feat.pdf.privacy.desc")}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Scale size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t("feat.pdf.quality.title")}</div>
					<div class="fd">{t("feat.pdf.quality.desc")}</div>
				</div>
			</div>
		</div> -->

		<!-- How to use — SEO content từ markdown -->
		{#if data.howToHtml}
			<section class="how-to-sec prose">
				{@html data.howToHtml}
			</section>
		{/if}

		<section
			class="faq-sec"
			itemscope
			itemtype="https://schema.org/FAQPage"
		>
			<h2>{t("faq.pdf.title")}</h2>

			<div class="faq-list">
				{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
					<details
						class="faq-item"
						itemscope
						itemprop="mainEntity"
						itemtype="https://schema.org/Question"
					>
						<summary class="faq-q" itemprop="name">
							{t(`faq.pdf.${n}.q`)}
						</summary>

						<div
							class="faq-a"
							itemscope
							itemprop="acceptedAnswer"
							itemtype="https://schema.org/Answer"
						>
							<span itemprop="text">
								{@html markdownToHtml(t(`faq.pdf.${n}.a`))}
							</span>
						</div>
					</details>
				{/each}
			</div>
		</section>

	</div>
</main>

<style>
	/* Spinner row — nằm trong card, có border-top match style của .prog */
	.pdf-spinner-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}

	.pdf-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: pdf-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes pdf-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.pdf-spinner-label {
		font-size: 12px;
		color: var(--muted);
	}

	/* 2-col preset grid cho PDF quality */
	.preset-grid.preset-grid--2 {
		grid-template-columns: repeat(2, 1fr);
	}

	/* Warning đỏ — dùng lại var(--red) từ app.css, override .keep-open-warning global */
	:global(.keep-open-warning) {
		padding: 4px 16px 10px !important;
		margin-top: 0 !important;
	}

	/* ── How-to-use section ── */
	.ad-slot {
		margin: 14px 0 18px;
		min-height: 90px;
		border-radius: var(--r);
		overflow: hidden;
		background: var(--surf);
	}

	.ad-slot:empty {
		display: none;
	}

	@media (min-width: 1024px) {
		.ad-slot--after-tool {
			display: none;
		}
	}

	.how-to-sec {
		margin-top: 0px;
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}

	.how-to-sec :global(a) {
		color: #1550ae;
	}

	/* Prose styles scoped to .how-to-sec */
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

	.how-to-sec :global(li strong) {
		color: var(--text);
		font-weight: 600;
	}

	.how-to-sec :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 28px 0;
	}

	.how-to-sec :global(strong) {
		color: var(--text);
		font-weight: 600;
	}
</style>
