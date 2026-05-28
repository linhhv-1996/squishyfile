<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		FileText, Folder, X, CheckCircle2, Download,
		ShieldCheck, AlertTriangle
        ,
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

	let { data } = $props();

	let dragOver = $state(false);
	let pdfInput: HTMLInputElement;
	let pdfFile: File | null = $state(null);
	let pdfPassword = $state("");
	let pdfError = $state("");
	let pdfProcessing = $state(false);
	let pdfBusy = $state(false);
	let pdfQuality = $state<"balanced" | "maximum">("balanced");
	let pdfResult: {
		href: string; download: string;
		original: string; compressed: string; saved: string;
	} | null = $state(null);
	

	// Related tools — update slugs to match your routes
	let relatedTools = $derived(
		getRelatedTools('compress-pdf', currentLangKey, t)
	);

	function triggerInput() { pdfInput.click(); }
	function handleFile(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (f) loadFile(f);
	}
	function loadFile(file: File) {
		pdfFile = file; pdfError = ""; pdfProcessing = false; clearResult();
	}
	function clearFile() {
		pdfFile = null;
		if (pdfInput) pdfInput.value = "";
		pdfError = ""; pdfBusy = false; pdfProcessing = false; pdfPassword = "";
		clearResult();
	}
	function onDragOver(e: DragEvent) { e.preventDefault(); dragOver = true; }
	function onDragLeave() { dragOver = false; }
	function onDrop(e: DragEvent) {
		e.preventDefault(); dragOver = false;
		const f = e.dataTransfer?.files?.[0];
		if (f?.type === "application/pdf") loadFile(f);
	}
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
			const { success, pdfData, error } = e.data;
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
			} else {
				pdfError = t("error.workerFailed");
			}
			pdfBusy = false; pdfProcessing = false;
			worker.terminate(); URL.revokeObjectURL(fileUrl);
		};
		worker.onerror = () => {
			pdfBusy = false; pdfProcessing = false;
			pdfError = t("error.workerFailed");
			worker.terminate(); 
			URL.revokeObjectURL(fileUrl);
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

	<!-- Hero — uses global .hero styles -->
	<section class="hero">
		<h1>{@html t("pdf.hero.title")}</h1>
		<p class="hero-sub">{t("pdf.hero.sub")}</p>
		<div class="hero-pills">
			<div class="pill"><span class="pill-ico">🔒</span>{t("hero.pill1")}</div>
			<div class="pill"><span class="pill-ico">✨</span>{t("hero.pill2")}</div>
			<div class="pill"><span class="pill-ico">⚡</span>{t("hero.pill3")}</div>
		</div>
	</section>

	<!-- Drop zone -->
	{#if !pdfFile}
		<button class="dz dz--pdf" class:over={dragOver} type="button"
			onclick={triggerInput} ondragover={onDragOver} ondragleave={onDragLeave} ondrop={onDrop}>
			<div class="dz-ico dz-ico--pdf"><FileText size={24} strokeWidth={1.5} /></div>
			<h3>{t("drop.pdf")}</h3>
			<p class="sub">{t("drop.pdf.sub")}</p>
			<span class="btn-browse"><Folder size={14} strokeWidth={2} /> {t("btn.browse")}</span>
			<p class="fmt-hint">{t("hint.pdf")}</p>
		</button>
	{/if}
	<input bind:this={pdfInput} class="file-input" type="file" accept="application/pdf" onchange={handleFile} />

	<!-- ── File card ──────────────────────────────────────────────────────────── -->
	{#if pdfFile && !pdfResult}
	<div class="p-card">

		<!-- File row -->
		<div class="p-file-row">
			<div class="p-file-ico"><FileText size={18} strokeWidth={1.8} /></div>
			<div class="p-file-info">
				<div class="p-file-name">{pdfFile.name}</div>
				<div class="p-file-size">{fmtBytes(pdfFile.size)} · PDF</div>
			</div>
			<button class="p-remove" type="button" onclick={clearFile} disabled={pdfBusy} title="Remove">
				<X size={15} strokeWidth={2.5} />
			</button>
		</div>

		<!-- Compression level — label + 2 buttons on one row -->
		<div class="p-row">
			<span class="p-label">{t("sec.pdfQuality")}</span>
			<div class="p-opts">
				<button
					class="p-opt" class:p-opt--on={pdfQuality === "balanced"}
					type="button" disabled={pdfBusy}
					onclick={() => (pdfQuality = "balanced")}
				>
					{t("pdf.preset.balanced")}
					<span class="p-opt-sub">{t("pdf.preset.balanced.sub")}</span>
				</button>
				<button
					class="p-opt" class:p-opt--on={pdfQuality === "maximum"}
					type="button" disabled={pdfBusy}
					onclick={() => (pdfQuality = "maximum")}
				>
					{t("pdf.preset.maximum")}
					<span class="p-opt-sub">{t("pdf.preset.maximum.sub")}</span>
				</button>
			</div>
		</div>

		<!-- Password — label + input on one row, empty = skip -->
		<div class="p-row">
			<span class="p-label">{t("sec.pdfPasswordOpt")}</span>
			<input
				class="p-pass"
				bind:value={pdfPassword}
				type="password"
				placeholder={t("input.password.ph")}
				disabled={pdfBusy}
			/>
		</div>

		<!-- Processing -->
		{#if pdfProcessing}
			<div class="p-spinner-row">
				<div class="p-spinner"></div>
				<span class="p-spinner-label">{t("status.processing")}</span>
			</div>
			<div class="ad-slot ad-slot--processing" aria-label="Advertisement"></div>
			<p class="p-warning">{t("status.warning.keepTab")}</p>
		{/if}

		<!-- Error -->
		{#if pdfError}
			<div class="p-error">
				<AlertTriangle size={14} strokeWidth={2} />
				<span>{pdfError}</span>
			</div>
		{/if}

		<!-- Submit -->
		<div class="p-action">
			<button class="p-submit" type="button" disabled={pdfBusy} onclick={startCompress}>
				<FileText size={15} strokeWidth={2.2} />
				{t("btn.compressPdf")}
			</button>
		</div>

	</div>
	{/if}

	<!-- ── Result card ─────────────────────────────────────────────────────────── -->
	{#if pdfResult}
	<div class="p-result">

		<!-- Header: icon + title + stats inline -->
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

		<!-- Download — primary -->
		<div class="p-result-actions">
			<a class="p-btn-dl" href={pdfResult.href} download={pdfResult.download}>
				<Download size={15} strokeWidth={2.2} />
				{t("btn.dl.pdf")}
			</a>
			<button class="p-btn-new" type="button" onclick={clearFile}>
				{t("btn.compressNew")}
			</button>
		</div>

		<!-- Also try -->
		<RelatedTools
			label={t('relatedTools.label')}
			tools={relatedTools}
		/>

	</div>
	{/if}

	<!-- Privacy note -->
	<div class="pnote">
		<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
		<p>{@html t("note.privacy")}</p>
	</div>

	<!-- Ad slot mobile -->
	<div class="ad-slot ad-slot--after-tool" aria-label="Advertisement"></div>

	<!-- How to use -->
	{#if data.howToHtml}
		<section class="how-to-sec prose">{@html data.howToHtml}</section>
	{/if}

	<!-- FAQ -->
	<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
		<h2>{t("faq.pdf.title")}</h2>
		<div class="faq-list">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
				<details
					class="faq-item"
					id={n === 12 ? "faq-why-small" : undefined}
					itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"
				>
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
	/* ─────────────────────────────────────────────────────────────────────────────
	   All styles for this component are self-contained here.
	   Uses CSS vars from global (--text, --muted, --border, --accent, --surf,
	   --bg, --r) but does not rely on any global class definitions.
	───────────────────────────────────────────────────────────────────────────── */

	/* ── File card ───────────────────────────────────────────────────────────── */
	.p-card {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* File row */
	.p-file-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
	}
	.p-file-ico {
		color: var(--accent);
		flex-shrink: 0;
		display: flex;
	}
	.p-file-info { flex: 1; min-width: 0; }
	.p-file-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.p-file-size { font-size: 12px; color: var(--muted); margin-top: 1px; }
	.p-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px; height: 28px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.15s, background 0.15s;
	}
	.p-remove:hover { color: var(--text); background: var(--border); }
	.p-remove:disabled { opacity: 0.4; cursor: default; }

	/* Option rows — stack on mobile, inline on desktop */
	.p-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}
	.p-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		white-space: nowrap;
	}
	/* Desktop: label + control on one line */
	@media (min-width: 540px) {
		.p-row {
			flex-direction: row;
			align-items: center;
			gap: 12px;
		}
		.p-label {
			flex-shrink: 0;
			min-width: 130px;
		}
	}

	/* Quality option buttons */
	.p-opts {
		display: flex;
		gap: 6px;
	}
	.p-opt {
		display: flex;
		align-items: baseline;
		gap: 5px;
		padding: 5px 12px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		white-space: nowrap;
	}
	.p-opt:hover { border-color: var(--accent); }
	.p-opt--on {
		border-color: var(--accent);
		background: var(--surf);
		color: var(--accent);
	}
	.p-opt:disabled { opacity: 0.5; cursor: default; }
	.p-opt-sub {
		font-size: 11px;
		font-weight: 400;
		color: var(--muted);
	}
	.p-opt--on .p-opt-sub { color: var(--accent); opacity: 0.7; }

	/* Password input */
	.p-pass {
		width: 100%;
		height: 32px;
		padding: 0 10px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 13px;
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
	}
	.p-pass::placeholder { color: var(--muted); }
	.p-pass:focus { border-color: var(--accent); }
	.p-pass:disabled { opacity: 0.5; }

	/* Processing */
	.p-spinner-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 12px 16px;
		border-top: 1px solid var(--border);
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
		padding: 4px 16px 10px;
		font-size: 11.5px;
		color: var(--muted);
		margin: 0;
		text-align: center;
	}

	/* Error bar */
	.p-error {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 16px;
		font-size: 12.5px;
		color: #e05252;
		border-top: 1px solid var(--border);
	}

	/* Ad slot in processing state */
	.ad-slot--processing {
		min-height: 90px;
		background: var(--bg);
		border-top: 1px solid var(--border);
	}
	.ad-slot--processing:empty { display: none; }

	/* Submit button */
	.p-action {
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}
	.p-submit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
		padding: 9px 16px;
		border-radius: var(--r);
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.p-submit:hover { opacity: 0.88; }
	.p-submit:disabled { opacity: 0.5; cursor: default; }

	/* ── Result card ─────────────────────────────────────────────────────────── */
	.p-result {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* Header */
	.p-result-head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px 10px;
	}
	.p-result-ico {
		color: #3daa6a;
		flex-shrink: 0;
		display: flex;
		margin-top: 1px;
	}
	.p-result-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}
	.p-result-stats {
		font-size: 12px;
		color: var(--muted);
		margin-top: 2px;
	}
	.p-result-saved {
		font-weight: 600;
		color: #3daa6a;
	}

	/* Actions */
	.p-result-actions {
		padding: 0 16px 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	/* Primary CTA — solid, full width */
	.p-btn-dl {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
		padding: 9px 16px;
		border-radius: var(--r);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.p-btn-dl:hover { opacity: 0.88; }
	/* Secondary — plain text, clearly subordinate */
	.p-btn-new {
		background: none;
		border: none;
		padding: 0;
		font-size: 12px;
		color: var(--muted);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.p-btn-new:hover { color: var(--text); }

	/* ── Ad slot mobile ──────────────────────────────────────────────────────── */
	.ad-slot {
		margin: 14px 0 18px;
		min-height: 90px;
		border-radius: var(--r);
		overflow: hidden;
		background: var(--surf);
	}
	.ad-slot:empty { display: none; }
	@media (min-width: 1024px) { .ad-slot--after-tool { display: none; } }

	/* ── How-to section ──────────────────────────────────────────────────────── */
	.how-to-sec {
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
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
