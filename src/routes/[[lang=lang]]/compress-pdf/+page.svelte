<script lang="ts">
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		FileText, Folder, X, CheckCircle2, Download,
		ShieldCheck, AlertTriangle, FileDown,
	} from "lucide-svelte";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import RelatedTools from "$lib/components/RelatedTools.svelte";

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"][key] || key
	);

	let jsonLd = $derived(JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: t("pdf.meta.title"),
		description: t("pdf.meta.desc"),
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "All",
		browserRequirements: "Requires JavaScript",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
	}));

	const SAMPLE_PDF_URL = "/sample_pdf.pdf";

	let { data } = $props();
	let relatedTools = $derived(getRelatedTools('compress-pdf', currentLangKey, t));

	// ── State ────────────────────────────────────────────────────────────────────
	let dragOver = $state(false);
	let pdfInput: HTMLInputElement;
	let pdfFile: File | null = $state(null);
	let sampleLoading = $state(false);
	let pdfPassword = $state("");
	let pdfError = $state("");
	let pdfProcessing = $state(false);
	let pdfBusy = $state(false);
	let pdfQuality = $state<"balanced" | "maximum">("balanced");
	let pdfResult: {
		href: string; download: string;
		original: string; compressed: string; saved: string;
	} | null = $state(null);

	// ── PDF viewer state ─────────────────────────────────────────────────────────
	let viewerLoading = $state(false);
	let viewerReady = $state(false);
	let pdfPageCount = $state(0);
	let viewerContainer: HTMLDivElement | null = $state(null);

	// Render ALL pages of the PDF into the viewer container
	async function renderAllPages(source: File | Blob) {
		if (!viewerContainer) return;
		viewerLoading = true;
		viewerReady = false;
		pdfPageCount = 0;
		// Clear previous render
		viewerContainer.innerHTML = "";

		try {
			const pdfjsLib = await import("pdfjs-dist");
			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
				"pdfjs-dist/build/pdf.worker.mjs",
				import.meta.url,
			).href;

			const arrayBuffer = await source.arrayBuffer();
			const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
			pdfPageCount = pdf.numPages;

			// Render each page sequentially into its own canvas
			for (let i = 1; i <= pdf.numPages; i++) {
				const pdfPage = await pdf.getPage(i);
				const unscaled = pdfPage.getViewport({ scale: 1 });
				// Fit to container width (~container is ~560px max), cap at 1.5x
				const containerW = viewerContainer.clientWidth || 560;
				const scale = Math.min((containerW - 24) / unscaled.width, 0.9);
				const viewport = pdfPage.getViewport({ scale });

				const canvas = document.createElement("canvas");
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				canvas.className = "pdf-page-canvas";

				// Page number label
				const label = document.createElement("div");
				label.className = "pdf-page-label";
				label.textContent = `${i} / ${pdf.numPages}`;

				const wrap = document.createElement("div");
				wrap.className = "pdf-page-wrap";
				wrap.appendChild(canvas);
				wrap.appendChild(label);
				viewerContainer.appendChild(wrap);

				const ctx = canvas.getContext("2d")!;
				await pdfPage.render({ canvas, viewport }).promise;
			}
			viewerReady = true;
		} catch (_) {
			// silently fail — tool still works
		}
		viewerLoading = false;
	}

	// Re-render when viewerContainer becomes available after pdfFile is set
	$effect(() => {
		if (pdfFile && viewerContainer && !viewerReady && !viewerLoading) {
			renderAllPages(pdfFile);
		}
	});

	// ── Sample PDF ───────────────────────────────────────────────────────────────
	async function loadSamplePdf(event?: MouseEvent) {
		event?.stopPropagation();
		if (pdfBusy || sampleLoading) return;
		pdfError = "";
		sampleLoading = true;
		try {
			const res = await fetch(SAMPLE_PDF_URL);
			if (!res.ok) throw new Error("sample_not_found");
			const blob = await res.blob();
			const file = new File([blob], "sample-document.pdf", {
				type: blob.type || "application/pdf",
			});
			loadFile(file);
		} catch {
			pdfError = t("error.samplePdfLoadFailed");
		} finally {
			sampleLoading = false;
		}
	}

	// ── File handling ────────────────────────────────────────────────────────────
	function triggerInput() { if (!pdfBusy && !sampleLoading) pdfInput.click(); }
	function handleFile(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (f) loadFile(f);
	}
	function loadFile(file: File) {
		pdfFile = file; pdfError = ""; pdfProcessing = false; clearResult();
		viewerReady = false; viewerLoading = false; pdfPageCount = 0;
		// viewerContainer may not be mounted yet — $effect handles it
	}
	function clearFile() {
		pdfFile = null;
		if (pdfInput) pdfInput.value = "";
		pdfError = ""; pdfBusy = false; pdfProcessing = false; pdfPassword = "";
		sampleLoading = false;
		viewerReady = false; viewerLoading = false; pdfPageCount = 0;
		if (viewerContainer) viewerContainer.innerHTML = "";
		clearResult();
	}
	function onDragOver(e: DragEvent) { e.preventDefault(); if (!pdfBusy) dragOver = true; }
	function onDragLeave() { dragOver = false; }
	function onDrop(e: DragEvent) {
		e.preventDefault(); dragOver = false;
		if (pdfBusy) return;
		const f = e.dataTransfer?.files?.[0];
		if (f?.type === "application/pdf") loadFile(f);
	}

	// ── Compress ─────────────────────────────────────────────────────────────────
	function fmtBytes(b: number) {
		if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
		if (b < 1_073_741_824) return `${(b / 1_048_576).toFixed(1)} MB`;
		return `${(b / 1_073_741_824).toFixed(2)} GB`;
	}
	async function startCompress() {
		if (!pdfFile) { pdfError = t("error.selectPdf"); return; }
		pdfError = ""; clearResult();
		pdfBusy = true; pdfProcessing = true;
		const originalSize = pdfFile.size;
		const fileUrl = URL.createObjectURL(pdfFile);
		const worker = new Worker(new URL("$lib/workers/pdf-worker.ts", import.meta.url), { type: "module" });
		worker.postMessage({ fileUrl, password: pdfPassword.trim() || null, quality: pdfQuality });
		worker.onmessage = (e) => {
			const { success, pdfData } = e.data;
			if (success) {
				const blob = new Blob([pdfData], { type: "application/pdf" });
				const finalSize = blob.size;
				const base = pdfFile!.name.replace(/\.[^.]+$/, "");
				pdfResult = {
					href: URL.createObjectURL(blob),
					download: pdfPassword.trim() ? `${base}_unlocked.pdf` : `${base}_compressed.pdf`,
					original: fmtBytes(originalSize),
					compressed: fmtBytes(finalSize),
					saved: `${Math.max(0, Math.round((1 - finalSize / originalSize) * 100))}%`,
				};
				// Re-render viewer with the compressed PDF so user can see the result
				renderAllPages(blob);
			} else {
				pdfError = t("error.workerFailed");
			}
			pdfBusy = false; pdfProcessing = false;
			worker.terminate(); URL.revokeObjectURL(fileUrl);
		};
		worker.onerror = () => {
			pdfBusy = false; pdfProcessing = false;
			pdfError = t("error.workerFailed");
			worker.terminate(); URL.revokeObjectURL(fileUrl);
		};
	}
	function clearResult() {
		if (pdfResult?.href) URL.revokeObjectURL(pdfResult.href);
		pdfResult = null;
	}
	onDestroy(() => { clearResult(); });

	function md(text: string) {
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

	<!-- Hero -->
	<section class="hero">
		<h1>{@html t("pdf.hero.title")}</h1>
		<p class="hero-sub">{t("pdf.hero.sub")}</p>
		<div class="hero-pills">
			<div class="pill"><span class="pill-ico">🔒</span>{t("hero.pill1")}</div>
			<div class="pill"><span class="pill-ico">✨</span>{t("hero.pill2")}</div>
			<div class="pill"><span class="pill-ico">⚡</span>{t("hero.pill3")}</div>
		</div>
	</section>

	<input bind:this={pdfInput} class="file-input" type="file" accept="application/pdf" onchange={handleFile} disabled={pdfBusy || sampleLoading} />

	<!-- ── Unified tool card ── -->
	<div class="p-card">

		<!-- ── PDF Viewer zone (top, scrollable) ── -->
		<div
			class="p-viewer-zone"
			class:over={dragOver && !pdfFile}
			role="button"
			tabindex={pdfBusy || sampleLoading ? -1 : 0}
			aria-label={t("drop.pdf")}
			aria-disabled={pdfBusy || sampleLoading}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			onclick={triggerInput}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerInput(); } }}
		>
			{#if pdfFile}
				<!-- Viewer: scrollable container with all pages rendered as canvases -->
				<div class="p-viewer-scroll">
					<!-- Page canvases are injected here by renderAllPages() -->
					<div bind:this={viewerContainer} class="p-viewer-pages"></div>

					{#if viewerLoading}
						<div class="p-viewer-loading" transition:fade={{ duration: 150 }}>
							<div class="p-viewer-spinner"></div>
							<span>{t("status.loadingPreview")}</span>
						</div>
					{/if}
				</div>

				<!-- Page count chip -->
				{#if pdfPageCount > 0}
					<div class="p-page-chip">{pdfPageCount} {t('pdf.viewer.pages')}</div>
				{/if}
			{:else}
				<!-- Drop zone -->
				<div class="p-dz">
					<div class="dz-ico"><FileText size={55} strokeWidth={1.4} /></div>
					<h3>{t("drop.pdf")}</h3>
					<p class="sub">{t("drop.pdf.sub")}</p>
					<span class="btn-browse"><Folder size={14} strokeWidth={2} />{t("btn.browse")}</span>

					<button
						class="sample-btn"
						type="button"
						disabled={pdfBusy || sampleLoading}
						onclick={loadSamplePdf}
					>
						{#if sampleLoading}
							<span class="sample-spinner" aria-hidden="true"></span>
							{t("status.loadingSamplePdf")}
						{:else}
							{t("btn.samplePdf")}
						{/if}
					</button>

					<p class="fmt-hint">{t("hint.pdf")}</p>
				</div>
			{/if}
		</div>

		<!-- ── Settings / Result panel (bottom) ── -->
		<div class="p-panel">

			{#if pdfResult}
				<!-- ── Result state ── -->
				<div class="p-result-head">
					<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
					<div>
						<div class="p-result-title">{t("res.pdf.title")}</div>
						<div class="p-result-stats">
							{pdfResult.original} → {pdfResult.compressed}
							<span class="p-result-saved">· −{pdfResult.saved}</span>
						</div>
					</div>
				</div>
				<div class="p-result-actions">
					<a class="p-btn-dl" href={pdfResult.href} download={pdfResult.download}>
						<Download size={15} strokeWidth={2.2} />
						{t("btn.dl.pdf")}
					</a>
					<button class="p-btn-new" type="button" onclick={clearFile}>
						<FileText size={13} strokeWidth={2} />
						{t("btn.compressNew")}
					</button>
				</div>
				<RelatedTools label={t('relatedTools.label')} tools={relatedTools} />

			{:else}
				<!-- File row -->
				{#if pdfFile}
					<div class="p-file-row" in:fade={{ duration: 150 }}>
						<div class="p-file-ico"><FileText size={18} strokeWidth={1.8} /></div>
						<div class="p-file-info">
							<div class="p-file-name">{pdfFile.name}</div>
							<div class="p-file-size">{fmtBytes(pdfFile.size)} · PDF</div>
						</div>
						<button class="p-remove" type="button" onclick={clearFile} disabled={pdfBusy} title="Remove">
							<X size={15} strokeWidth={2.5} />
						</button>
					</div>
				{/if}

				<!-- Quality preset -->
				<div class="p-row">
					<span class="p-label">{t("sec.pdfQuality")}</span>
					<div class="p-opts">
						<button class="p-opt" class:p-opt--on={pdfQuality === "balanced"}
							type="button" disabled={pdfBusy} onclick={() => (pdfQuality = "balanced")}>
							{t("pdf.preset.balanced")}
							<span class="p-opt-sub">{t("pdf.preset.balanced.sub")}</span>
						</button>
						<button class="p-opt" class:p-opt--on={pdfQuality === "maximum"}
							type="button" disabled={pdfBusy} onclick={() => (pdfQuality = "maximum")}>
							{t("pdf.preset.maximum")}
							<span class="p-opt-sub">{t("pdf.preset.maximum.sub")}</span>
						</button>
					</div>
				</div>

				<!-- Password -->
				<div class="p-row">
					<span class="p-label">{t("sec.pdfPasswordOpt")}</span>
					<input class="p-pass" bind:value={pdfPassword} type="password"
						placeholder={t("input.password.ph")} disabled={pdfBusy} />
				</div>

				<!-- Submit -->
				<div class="p-action" style="margin-top:auto;">
					{#if pdfProcessing}
						<div class="p-spinner-row">
							<div class="p-spinner"></div>
							<span class="p-spinner-label">{t("status.processing")}</span>
						</div>
						<p class="p-warning">{t("status.warning.keepTab")}</p>
					{/if}
					{#if pdfError}
						<div class="p-error">
							<AlertTriangle size={14} strokeWidth={2} />
							<span>{pdfError}</span>
						</div>
					{/if}
					<button class="p-submit" type="button" disabled={pdfBusy || !pdfFile} onclick={startCompress}>
						<FileDown size={15} strokeWidth={2.2} />
						{t("btn.compressPdf")}
					</button>
				</div>

			{/if}
		</div>

	</div><!-- end .p-card -->

	<!-- Privacy note -->
	<div class="pnote">
		<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
		<p>{@html t("note.privacy")}</p>
	</div>

	<div class="ad-slot ad-slot--after-tool" aria-label="Advertisement"></div>

	{#if data.howToHtml}
		<section class="how-to-sec prose">{@html data.howToHtml}</section>
	{/if}

	<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
		<h2>{t("faq.pdf.title")}</h2>
		<div class="faq-list">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t(`faq.pdf.${n}.q`)}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{@html md(t(`faq.pdf.${n}.a`))}</span>
					</div>
				</details>
			{/each}
		</div>
	</section>

</div>
</main>

<style>
	/* ── Card ────────────────────────────────────────────────────────────────── */
	.p-card {
		background: var(--surf);
		border: 1px dashed #90b5d6;
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
		display: flex;
		flex-direction: column;
	}

	/* ── Viewer zone — scrollable, fills up to 480px ─────────────────────────── */
	.p-viewer-zone {
		position: relative;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		transition: background 0.15s;
	}
	.p-viewer-zone.over {
		background: color-mix(in srgb, var(--accent) 6%, transparent);
	}

	/* Scrollable wrapper: max 480px tall, min 260px */
	.p-viewer-scroll {
		max-height: 360px;
		min-height: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		/* Custom scrollbar */
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}
	.p-viewer-scroll::-webkit-scrollbar { width: 6px; }
	.p-viewer-scroll::-webkit-scrollbar-track { background: transparent; }
	.p-viewer-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

	/* All pages stacked vertically */
	.p-viewer-pages {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 12px;
	}

	/* Each page wrapper */
	:global(.pdf-page-wrap) {
		position: relative;
		background: #fff;
		box-shadow: 0 1px 6px rgba(0,0,0,0.18);
		border-radius: 2px;
		overflow: hidden;
		flex-shrink: 0;
	}
	:global(.pdf-page-canvas) {
		display: block;
		max-width: 100%;
	}
	/* Page number badge bottom-right */
	:global(.pdf-page-label) {
		position: absolute;
		bottom: 6px;
		right: 8px;
		background: rgba(0,0,0,0.45);
		color: #fff;
		font-size: 10px;
		font-weight: 500;
		padding: 1px 6px;
		border-radius: 10px;
		pointer-events: none;
		line-height: 1.6;
	}

	/* Loading overlay */
	.p-viewer-loading {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		color: var(--muted);
		font-size: 12px;
		background: var(--bg);
		z-index: 2;
	}
	.p-viewer-spinner {
		width: 22px; height: 22px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: p-spin 0.7s linear infinite;
	}

	/* Total page count chip — top-right of viewer zone */
	.p-page-chip {
		position: absolute;
		top: 8px;
		right: 10px;
		background: rgba(0,0,0,0.45);
		color: #fff;
		font-size: 11px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 20px;
		pointer-events: none;
		z-index: 3;
	}

	/* Drop zone */
	.p-dz {
		width: 100%;
		min-height: 290px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 16px;
		color: var(--text);
	}
	.p-dz:disabled { cursor: default; opacity: 0.6; }
	.p-dz h3 { margin: 6px 0 2px; font-size: 16px; font-weight: 600; }
	.p-dz .sub { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
	.p-dz .fmt-hint { font-size: 11px; color: var(--muted); margin: 6px 0 0; }
	.p-dz .dz-ico { color: var(--accent); }

	.sample-btn {
		margin-top: 2px;
		border: none;
		background: transparent;
		color: var(--accent);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 0;
	}
	.sample-btn:hover { opacity: 0.8; }
	.sample-btn:disabled { opacity: 0.6; cursor: default; }
	.sample-spinner {
		width: 12px;
		height: 12px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 999px;
		animation: sample-spin 0.7s linear infinite;
	}
	@keyframes sample-spin { to { transform: rotate(360deg); } }

	/* ── Settings/result panel ───────────────────────────────────────────────── */
	.p-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* File row */
	.p-file-row {
		display: flex; align-items: center; gap: 10px;
		padding: 12px 16px; border-bottom: 1px solid var(--border);
	}
	.p-file-ico { color: var(--accent); flex-shrink: 0; display: flex; }
	.p-file-info { flex: 1; min-width: 0; }
	.p-file-name {
		font-size: 13px; font-weight: 500; color: var(--text);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.p-file-size { font-size: 12px; color: var(--muted); margin-top: 1px; }
	.p-remove {
		display: flex; align-items: center; justify-content: center;
		width: 28px; height: 28px; border-radius: 6px;
		border: none; background: none; color: var(--muted);
		cursor: pointer; flex-shrink: 0;
		transition: color 0.15s, background 0.15s;
	}
	.p-remove:hover { color: var(--text); background: var(--border); }
	.p-remove:disabled { opacity: 0.4; cursor: default; }

	/* Option rows */
	.p-row {
		display: flex; flex-direction: column; gap: 8px;
		padding: 10px 16px; border-bottom: 1px solid var(--border);
	}
	.p-label { font-size: 12px; font-weight: 500; color: var(--muted); white-space: nowrap; }
	@media (min-width: 540px) {
		.p-row { flex-direction: row; align-items: center; gap: 12px; }
		.p-label { flex-shrink: 0; min-width: 130px; }
	}

	.p-opts { display: flex; gap: 6px; flex-wrap: wrap; }
	.p-opt {
		display: flex; align-items: baseline; gap: 5px;
		padding: 5px 12px; border-radius: 6px;
		border: 1px solid var(--border); background: var(--bg);
		font-size: 13px; font-weight: 500; color: var(--text);
		cursor: pointer; white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}
	.p-opt:hover { border-color: var(--accent); }
	.p-opt--on { border-color: var(--accent); background: var(--surf); color: var(--accent); }
	.p-opt:disabled { opacity: 0.5; cursor: default; }
	.p-opt-sub { font-size: 11px; font-weight: 400; color: var(--muted); }
	.p-opt--on .p-opt-sub { color: var(--accent); opacity: 0.7; }

	.p-pass {
		width: 100%; height: 32px; padding: 0 10px;
		border-radius: 6px; border: 1px solid var(--border);
		background: var(--bg); font-size: 13px; color: var(--text);
		outline: none; transition: border-color 0.15s;
	}
	.p-pass::placeholder { color: var(--muted); }
	.p-pass:focus { border-color: var(--accent); }
	.p-pass:disabled { opacity: 0.5; }

	/* Processing */
	.p-spinner-row {
		display: flex; align-items: center; justify-content: center;
		gap: 10px; padding: 10px 16px;
	}
	.p-spinner {
		width: 16px; height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: p-spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes p-spin { to { transform: rotate(360deg); } }
	.p-spinner-label { font-size: 12px; color: var(--muted); }
	.p-warning {
		padding: 0 16px 10px; font-size: 11.5px;
		color: var(--muted); margin: 0; text-align: center;
	}

	.p-error {
		display: flex; align-items: center; gap: 7px;
		padding: 9px 16px; font-size: 12.5px; color: #e05252;
	}

	.p-action { padding: 12px 16px; border-top: 1px solid var(--border); }
	.p-submit {
		display: flex; align-items: center; justify-content: center;
		gap: 7px; width: 100%; padding: 9px 16px;
		border-radius: var(--r); border: none;
		background: var(--accent); color: #fff;
		font-size: 14px; font-weight: 600; cursor: pointer;
		transition: opacity 0.15s;
	}
	.p-submit:hover { opacity: 0.88; }
	.p-submit:disabled { opacity: 0.5; cursor: default; }

	/* ── Result ──────────────────────────────────────────────────────────────── */
	.p-result-head {
		display: flex; align-items: center; gap: 10px; padding: 12px 16px 10px;
	}
	.p-result-ico { color: #3daa6a; flex-shrink: 0; display: flex; margin-top: 1px; }
	.p-result-title { font-size: 13px; font-weight: 600; color: var(--text); }
	.p-result-stats { font-size: 12px; color: var(--muted); margin-top: 2px; }
	.p-result-saved { font-weight: 600; color: #3daa6a; }
	.p-result-actions {
		padding: 0 16px 12px;
		display: flex; flex-direction: column; align-items: center; gap: 8px;
	}
	.p-btn-dl {
		display: flex; align-items: center; justify-content: center;
		gap: 7px; width: 100%; padding: 9px 16px;
		border-radius: var(--r); background: var(--accent); color: #fff;
		font-size: 14px; font-weight: 600; text-decoration: none;
		transition: opacity 0.15s;
	}
	.p-btn-dl:hover { opacity: 0.88; }
	.p-btn-new {
		display: flex; align-items: center; gap: 5px;
		background: none; border: none; padding: 0;
		font-size: 12px; color: var(--muted); cursor: pointer;
		text-decoration: underline; text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.p-btn-new:hover { color: var(--text); }

	/* ── Ad / How-to / FAQ ───────────────────────────────────────────────────── */
	.ad-slot {
		margin: 14px 0 18px; min-height: 90px;
		border-radius: var(--r); overflow: hidden; background: var(--surf);
	}
	.ad-slot:empty { display: none; }
	@media (min-width: 1024px) { .ad-slot--after-tool { display: none; } }

	.how-to-sec { padding-top: 18px; border-top: 1px solid var(--border); }
	.how-to-sec :global(a) { color: #1550ae; }
	.how-to-sec :global(h1) { font-size: 1.35rem; font-weight: 650; color: var(--text); margin: 0 0 20px; line-height: 1.3; }
	.how-to-sec :global(h2) { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 15px 0 10px; }
	.how-to-sec :global(h3) { font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 20px 0 8px; }
	.how-to-sec :global(p)  { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin: 0 0 12px; }
	.how-to-sec :global(ul), .how-to-sec :global(ol) { padding-left: 1.4em; margin: 8px 0 16px; }
	.how-to-sec :global(li) { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin-bottom: 6px; }
	.how-to-sec :global(li strong), .how-to-sec :global(strong) { color: var(--text); font-weight: 600; }
	.how-to-sec :global(hr) { border: none; border-top: 1px solid var(--border); margin: 15px 0; }
</style>
