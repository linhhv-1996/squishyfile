<script lang="ts">
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		FileText, Folder, X, CheckCircle2, Download,
		ShieldCheck, AlertTriangle, FilePlus,
	} from "lucide-svelte";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import RelatedTools from "$lib/components/RelatedTools.svelte";

	import MergeWorker from "$lib/workers/pdf-merge-worker.ts?worker&inline";


	type PdfItem = {
		id: string;
		file: File;
		thumbnail: string | null;
		pageCount: number;
		thumbLoading: boolean;
	};

	let { data } = $props();
	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"][key] || key
	);
	let jsonLd = $derived(JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: t("pdfMerge.meta.title"),
		description: t("pdfMerge.meta.desc"),
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "All",
		browserRequirements: "Requires JavaScript",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
	}));
	let relatedTools = $derived(getRelatedTools("pdf-merge", currentLangKey, t));

	// ── State ────────────────────────────────────────────────────────────────────
	let dropZoneOver = $state(false);   // drag-file-from-OS over the whole card
	let pdfInput: HTMLInputElement;
	let pdfFiles = $state<PdfItem[]>([]);
	let pdfError = $state("");
	let pdfProcessing = $state(false);
	let pdfBusy = $state(false);
	let sampleLoading = $state(false);

	const SAMPLE_URLS = ["/sample_pdf.pdf", "/sample_pdf_2.pdf"];

	async function loadSamplePdfs(event?: MouseEvent) {
		event?.stopPropagation();
		if (pdfBusy || sampleLoading) return;
		pdfError = "";
		sampleLoading = true;
		try {
			const blobs = await Promise.all(
				SAMPLE_URLS.map(url => fetch(url).then(r => {
					if (!r.ok) throw new Error("sample_not_found");
					return r.blob();
				}))
			);
			const files = blobs.map((blob, i) => new File(
				[blob],
				`sample-document-${i + 1}.pdf`,
				{ type: blob.type || "application/pdf" }
			));
			addFiles(files);
		} catch {
			pdfError = t("pdfMerge.error.sampleLoadFailed");
		} finally {
			sampleLoading = false;
		}
	}
	let pdfResult: { href: string; download: string; files: number; output: string } | null = $state(null);

	// ── Result viewer (pdfjs) ────────────────────────────────────────────────────
	let viewerContainer: HTMLDivElement | null = $state(null);
	let viewerLoading = $state(false);
	let viewerReady = $state(false);
	let resultPageCount = $state(0);

	async function renderResultPages(blob: Blob) {
		if (!viewerContainer) return;
		viewerLoading = true;
		viewerReady = false;
		resultPageCount = 0;
		viewerContainer.innerHTML = "";
		try {
			const pdfjsLib = await import("pdfjs-dist");
			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
				"pdfjs-dist/build/pdf.worker.mjs", import.meta.url
			).href;
			const buf = await blob.arrayBuffer();
			const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
			resultPageCount = pdf.numPages;
			for (let i = 1; i <= pdf.numPages; i++) {
				const pdfPage = await pdf.getPage(i);
				const vp0 = pdfPage.getViewport({ scale: 1 });
				const containerW = viewerContainer.clientWidth || 560;
				const scale = Math.min((containerW - 24) / vp0.width, 0.9);
				const vp = pdfPage.getViewport({ scale });
				const canvas = document.createElement("canvas");
				canvas.width = vp.width;
				canvas.height = vp.height;
				canvas.className = "pdf-page-canvas";
				const label = document.createElement("div");
				label.className = "pdf-page-label";
				label.textContent = `${i} / ${pdf.numPages}`;
				const wrap = document.createElement("div");
				wrap.className = "pdf-page-wrap";
				wrap.appendChild(canvas);
				wrap.appendChild(label);
				viewerContainer.appendChild(wrap);
				await pdfPage.render({ canvas, viewport: vp }).promise;
			}
			viewerReady = true;
		} catch { /* silently fail */ }
		viewerLoading = false;
	}

	$effect(() => {
		if (pdfResult && viewerContainer && !viewerReady && !viewerLoading) {
			fetch(pdfResult.href)
				.then(r => r.blob())
				.then(b => renderResultPages(b));
		}
	});

	// ── Drag-to-reorder state ────────────────────────────────────────────────────
	let dragSrcId = $state<string | null>(null);   // which card is being dragged
	let dragOverId = $state<string | null>(null);  // which slot we're hovering

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function uid() { return Math.random().toString(36).slice(2, 10); }
	function md(t: string) { return t.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); }
	function fmtBytes(b: number) {
		if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
		if (b < 1_073_741_824) return `${(b / 1_048_576).toFixed(1)} MB`;
		return `${(b / 1_073_741_824).toFixed(2)} GB`;
	}
	function isPdf(f: File) { return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"); }

	// ── Thumbnail via pdfjs ───────────────────────────────────────────────────────
	async function generateThumbnail(item: PdfItem) {
		try {
			const pdfjsLib = await import("pdfjs-dist");
			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
				"pdfjs-dist/build/pdf.worker.mjs", import.meta.url
			).href;
			const buf = await item.file.arrayBuffer();
			const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
			pdfFiles = pdfFiles.map(f => f.id === item.id ? { ...f, pageCount: pdf.numPages } : f);
			const pdfPage = await pdf.getPage(1);
			const vp0 = pdfPage.getViewport({ scale: 1 });
			const scale = 160 / vp0.width;
			const vp = pdfPage.getViewport({ scale });
			const canvas = document.createElement("canvas");
			canvas.width = vp.width;
			canvas.height = vp.height;
			await pdfPage.render({ canvas, viewport: vp }).promise;
			pdfFiles = pdfFiles.map(f =>
				f.id === item.id ? { ...f, thumbnail: canvas.toDataURL("image/jpeg", 0.85), thumbLoading: false } : f
			);
		} catch {
			pdfFiles = pdfFiles.map(f => f.id === item.id ? { ...f, thumbLoading: false } : f);
		}
	}

	// ── File add/remove ───────────────────────────────────────────────────────────
	function triggerInput() { if (!pdfBusy) pdfInput.click(); }
	function handleFiles(e: Event) {
		addFiles(Array.from((e.currentTarget as HTMLInputElement).files || []));
		if (pdfInput) pdfInput.value = "";
	}
	function addFiles(files: File[]) {
		const valid = files.filter(isPdf);
		if (!valid.length) { pdfError = t("pdfMerge.error.invalidFile"); return; }
		pdfError = "";
		clearResult();
		const items: PdfItem[] = valid.map(file => ({
			id: uid(), file, thumbnail: null, pageCount: 0, thumbLoading: true,
		}));
		pdfFiles = [...pdfFiles, ...items];
		items.forEach(generateThumbnail);
	}
	function removeFile(id: string) {
		pdfFiles = pdfFiles.filter(f => f.id !== id);
		pdfError = "";
		clearResult();
	}
	function clearFiles() {
		pdfFiles = [];
		pdfError = "";
		pdfBusy = false;
		pdfProcessing = false;
		viewerReady = false;
		viewerLoading = false;
		resultPageCount = 0;
		if (viewerContainer) viewerContainer.innerHTML = "";
		if (pdfInput) pdfInput.value = "";
		clearResult();
	}

	// ── Drag-to-reorder (HTML5 + touch) ──────────────────────────────────────────
	// Separate flag so zone-drop handler can check even after dragSrcId is cleared
	let isReordering = false;

	// HTML5 drag (desktop)
	function onCardDragStart(e: DragEvent, id: string) {
		if (pdfBusy) return;
		dragSrcId = id;
		isReordering = true;
		e.dataTransfer!.effectAllowed = "move";
		if (e.dataTransfer && e.target instanceof HTMLElement) {
			e.dataTransfer.setDragImage(e.target.closest('.p-file-card') as HTMLElement, 60, 60);
		}
	}
	function onCardDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		if (dragSrcId && dragSrcId !== id) dragOverId = id;
	}
	function onCardDragLeave() { dragOverId = null; }
	function onCardDrop(e: DragEvent, targetId: string) {
		e.preventDefault();
		e.stopPropagation(); // prevent zone onZoneDrop from firing
		reorder(dragSrcId, targetId);
		dragSrcId = null;
		dragOverId = null;
		// defer clearing so onZoneDrop (if it fires anyway) can still check
		setTimeout(() => { isReordering = false; }, 0);
	}
	function onCardDragEnd() {
		dragSrcId = null;
		dragOverId = null;
		setTimeout(() => { isReordering = false; }, 0);
	}

	// Touch drag (mobile) — touchmove must be registered with passive:false
	let touchDragId: string | null = null;
	let touchGhost: HTMLElement | null = null;
	let touchOffsetX = 0, touchOffsetY = 0;

	// Called from onCardTouchStart; registers non-passive touchmove on the document
	function onCardTouchStart(e: TouchEvent, id: string) {
		if (pdfBusy) return;
		const touch = e.touches[0];
		const card = e.currentTarget as HTMLElement;
		const rect = card.getBoundingClientRect();
		touchOffsetX = touch.clientX - rect.left;
		touchOffsetY = touch.clientY - rect.top;

		touchGhost = card.cloneNode(true) as HTMLElement;
		touchGhost.style.cssText = `
			position:fixed; z-index:9999; pointer-events:none; opacity:0.85;
			width:${rect.width}px; transform:scale(1.04);
			box-shadow:0 8px 24px rgba(0,0,0,0.18); border-radius:8px;
			left:${touch.clientX - touchOffsetX}px; top:${touch.clientY - touchOffsetY}px;
			transition:none;
		`;
		document.body.appendChild(touchGhost);
		touchDragId = id;
		dragSrcId = id;
		isReordering = true;

		// Register non-passive listeners on document so preventDefault works
		document.addEventListener("touchmove", handleTouchMove, { passive: false });
		document.addEventListener("touchend", handleTouchEnd, { once: true });
	}

	function handleTouchMove(e: TouchEvent) {
		if (!touchGhost || !touchDragId) return;
		e.preventDefault(); // works because passive:false
		const touch = e.touches[0];
		touchGhost.style.left = `${touch.clientX - touchOffsetX}px`;
		touchGhost.style.top  = `${touch.clientY - touchOffsetY}px`;

		touchGhost.style.display = "none";
		const el = document.elementFromPoint(touch.clientX, touch.clientY);
		touchGhost.style.display = "";
		const cardEl = el?.closest("[data-card-id]") as HTMLElement | null;
		dragOverId = cardEl ? cardEl.dataset.cardId! : null;
	}

	function handleTouchEnd() {
		document.removeEventListener("touchmove", handleTouchMove);
		if (touchDragId && dragOverId && touchDragId !== dragOverId) {
			reorder(touchDragId, dragOverId);
		}
		touchGhost?.remove();
		touchGhost = null;
		touchDragId = null;
		dragSrcId = null;
		dragOverId = null;
		setTimeout(() => { isReordering = false; }, 0);
	}

	function reorder(srcId: string | null, targetId: string | null) {
		if (!srcId || !targetId || srcId === targetId) return;
		const arr = [...pdfFiles];
		const si = arr.findIndex(f => f.id === srcId);
		const ti = arr.findIndex(f => f.id === targetId);
		if (si < 0 || ti < 0) return;
		const [item] = arr.splice(si, 1);
		arr.splice(ti, 0, item);
		pdfFiles = arr;
		clearResult();
	}

	// ── OS file drop onto card ────────────────────────────────────────────────────
	function onZoneDragOver(e: DragEvent) {
		if (isReordering) return; // card reorder in progress, ignore
		e.preventDefault();
		if (!pdfBusy) dropZoneOver = true;
	}
	function onZoneDragLeave(e: DragEvent) {
		if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
			dropZoneOver = false;
		}
	}
	function onZoneDrop(e: DragEvent) {
		e.preventDefault();
		dropZoneOver = false;
		if (isReordering) return; // was a card reorder, not a file drop
		if (pdfBusy) return;
		addFiles(Array.from(e.dataTransfer?.files || []));
	}

	// ── Merge ────────────────────────────────────────────────────────────────────
	async function startMerge() {
		if (pdfFiles.length < 2) { pdfError = t("pdfMerge.error.needTwo"); return; }
		pdfError = "";
		clearResult();
		pdfBusy = true;
		pdfProcessing = true;
		const fileUrls = pdfFiles.map(item => ({
			fileUrl: URL.createObjectURL(item.file),
			name: item.file.name,
		}));

		// const worker = new Worker(new URL("$lib/workers/pdf-merge-worker.ts", import.meta.url), { type: "module" });
		const worker = new MergeWorker();
		
		worker.postMessage({ files: fileUrls });
		worker.onmessage = (e) => {
			const { success, pdfData, error } = e.data;
			if (success) {
				const blob = new Blob([pdfData], { type: "application/pdf" });
				pdfResult = {
					href: URL.createObjectURL(blob),
					download: "merged.pdf",
					files: pdfFiles.length,
					output: fmtBytes(blob.size),
				};
			} else {
				pdfError = error || t("pdfMerge.error.mergeFailed");
			}
			pdfBusy = false;
			pdfProcessing = false;
			worker.terminate();
			fileUrls.forEach(item => URL.revokeObjectURL(item.fileUrl));
		};
		worker.onerror = () => {
			pdfBusy = false;
			pdfProcessing = false;
			pdfError = t("pdfMerge.error.mergeFailed");
			worker.terminate();
			fileUrls.forEach(item => URL.revokeObjectURL(item.fileUrl));
		};
	}
	function clearResult() {
		if (pdfResult?.href) URL.revokeObjectURL(pdfResult.href);
		pdfResult = null;
	}
	onDestroy(() => { clearResult(); });
</script>

<svelte:head>
	<title>{t("pdfMerge.meta.title")}</title>
	<meta property="og:title" content={t("pdfMerge.meta.title")} />
	<meta name="description" content={t("pdfMerge.meta.desc")} />
	<meta property="og:description" content={t("pdfMerge.meta.desc")} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
<div class="wrap">

	<section class="hero">
		<h1>{@html t("pdfMerge.hero.title")}</h1>
		<p class="hero-sub">{t("pdfMerge.hero.sub")}</p>
		<div class="hero-pills">
			<div class="pill"><span class="pill-ico">✨</span>{t("pdfMerge.pill.free")}</div>
			<div class="pill"><span class="pill-ico">🔒</span>{t("pdfMerge.pill.noUpload")}</div>
			<div class="pill"><span class="pill-ico">⚡</span>{t("pdfMerge.pill.browser")}</div>
		</div>
	</section>

	<input bind:this={pdfInput} class="file-input" type="file"
		accept="application/pdf,.pdf" multiple onchange={handleFiles} disabled={pdfBusy} />

	<!-- ── Tool card ── -->
	<div class="p-card"
		class:drop-over={dropZoneOver}
		ondragover={onZoneDragOver}
		ondragleave={onZoneDragLeave}
		ondrop={onZoneDrop}>

		{#if !pdfFiles.length}
			<!-- Empty drop zone -->
			<div
				class="p-dz"
				role="button"
				tabindex={pdfBusy || sampleLoading ? -1 : 0}
				aria-disabled={pdfBusy || sampleLoading}
				onclick={triggerInput}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerInput(); } }}
			>
				<div class="dz-ico"><FileText size={55} strokeWidth={1.4} /></div>
				<h3>{t("pdfMerge.drop.title")}</h3>
				<p class="sub">{t("pdfMerge.drop.sub")}</p>
				<span class="btn-browse"><Folder size={14} strokeWidth={2} />{t("pdfMerge.btn.addFiles")}</span>
				<button
					class="sample-btn"
					type="button"
					disabled={pdfBusy || sampleLoading}
					onclick={(e) => { e.stopPropagation(); loadSamplePdfs(); }}>
					{#if sampleLoading}
						<span class="sample-spinner" aria-hidden="true"></span>
						{t("pdfMerge.status.loadingSample")}
					{:else}
						{t("pdfMerge.btn.samplePdf")}
					{/if}
				</button>
				<p class="fmt-hint">{t("pdfMerge.hint")}</p>
			</div>
			<!-- Merge button shown even with no files so UI isn't empty -->
			<div class="p-action-bar">
				<button class="p-submit" type="button" disabled={true}>
					<FileText size={15} strokeWidth={2.2} />
					{t("pdfMerge.btn.merge")}
				</button>
			</div>

		{:else if pdfResult}
			<!-- Result: viewer + download panel -->
			<div class="p-viewer-zone">
				<div class="p-viewer-scroll">
					<div bind:this={viewerContainer} class="p-viewer-pages"></div>
					{#if viewerLoading}
						<div class="p-viewer-loading" transition:fade={{ duration: 150 }}>
							<div class="p-viewer-spinner"></div>
							<span>{t("status.loadingPreview")}</span>
						</div>
					{/if}
				</div>
				{#if resultPageCount > 0}
					<div class="p-page-chip">{resultPageCount} {t('pdf.viewer.pages')}</div>
				{/if}
			</div>
			<div class="p-panel">
				<div class="p-result-head">
					<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
					<div>
						<div class="p-result-title">{t("pdfMerge.res.title")}</div>
						<div class="p-result-stats">{pdfResult.files} {t("pdfMerge.stat.files")} · {pdfResult.output}</div>
					</div>
				</div>
				<div class="p-result-actions">
					<a class="p-btn-dl" href={pdfResult.href} download={pdfResult.download}>
						<Download size={15} strokeWidth={2.2} />
						{t("pdfMerge.btn.download")}
					</a>
					<button class="p-btn-text" type="button" onclick={clearFiles}>
						<FileText size={13} strokeWidth={2} />{t("pdfMerge.btn.new")}
					</button>
				</div>
				<RelatedTools label={t("relatedTools.label")} tools={relatedTools} />
			</div>

		{:else}
			<!-- Grid -->
			<div class="p-grid-wrap">
				<div class="p-grid-header">
					<span class="p-grid-label">
						{pdfFiles.length} file{pdfFiles.length !== 1 ? 's' : ''}
						<span class="p-grid-hint">— {t("pdfMerge.hint.dragToReorder")}</span>
					</span>
					<button class="p-btn-add" type="button" onclick={triggerInput} disabled={pdfBusy}>
						<FilePlus size={14} strokeWidth={2} />{t("pdfMerge.btn.addFiles")}
					</button>
				</div>

				<div class="p-grid">
					{#each pdfFiles as item, index (item.id)}
						<div
							class="p-file-card"
							class:dragging={dragSrcId === item.id}
							class:drag-target={dragOverId === item.id && dragSrcId !== item.id}
							data-card-id={item.id}
							draggable={!pdfBusy}
							ondragstart={(e) => onCardDragStart(e, item.id)}
							ondragover={(e) => onCardDragOver(e, item.id)}
							ondragleave={onCardDragLeave}
							ondrop={(e) => onCardDrop(e, item.id)}
							ondragend={onCardDragEnd}
							ontouchstart={(e) => onCardTouchStart(e, item.id)}
							in:fade={{ duration: 140 }}
						>
							<!-- Thumbnail -->
							<div class="p-thumb">
								{#if item.thumbLoading}
									<div class="p-thumb-loading"><div class="p-spinner"></div></div>
								{:else if item.thumbnail}
									<img src={item.thumbnail} alt={item.file.name} class="p-thumb-img" draggable="false" />
								{:else}
									<div class="p-thumb-fallback"><FileText size={32} strokeWidth={1.2} /></div>
								{/if}

								<!-- Order badge -->
								<div class="p-order-badge">{index + 1}</div>

								<!-- Pages badge -->
								{#if item.pageCount > 0}
									<div class="p-pages-badge">{item.pageCount}p</div>
								{/if}

								<!-- Remove -->
								<button class="p-card-remove" type="button"
									onclick={() => removeFile(item.id)}
									disabled={pdfBusy}
									title="Remove" aria-label="Remove">
									<X size={11} strokeWidth={3} />
								</button>
							</div>

							<!-- Name -->
							<div class="p-card-footer">
								<span class="p-card-name">{item.file.name}</span>
								<span class="p-card-size">{fmtBytes(item.file.size)}</span>
							</div>
						</div>
					{/each}
				</div>

				<!-- Action bar -->
				<div class="p-action-bar">
					{#if pdfProcessing}
						<div class="p-spinner-row">
							<div class="p-spinner"></div>
							<span class="p-spinner-label">{t("pdfMerge.status.merging")}</span>
						</div>
						<p class="p-warning">{t("pdfMerge.warning.keepOpen")}</p>
					{/if}
					{#if pdfError}
						<div class="p-error">
							<AlertTriangle size={14} strokeWidth={2} />
							<span>{pdfError}</span>
						</div>
					{/if}
					<button class="p-submit" type="button"
						disabled={pdfBusy || pdfFiles.length < 2}
						onclick={startMerge}>
						<FileText size={15} strokeWidth={2.2} />
						{t("pdfMerge.btn.merge")}
					</button>
				</div>
			</div>
		{/if}

	</div>

	<div class="pnote">
		<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
		<p>{@html t("pdfMerge.note.privacy")}</p>
	</div>

	<div class="ad-slot ad-slot--after-tool" aria-label="Advertisement"></div>

	{#if data.contentHtml}
		<section class="how-to-sec prose">{@html data.contentHtml}</section>
	{/if}
	<br/>

	<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
		<h2>{t("faq.pdfMerge.title")}</h2>
		<div class="faq-list">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t(`faq.pdfMerge.${n}.q`)}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{@html md(t(`faq.pdfMerge.${n}.a`))}</span>
					</div>
				</details>
			{/each}
		</div>
	</section>

</div>
</main>

<style>
	/* ── Card shell ──────────────────────────────────────────────────────────── */
	.p-card {
		background: var(--surf);
		border: 1px dashed #90b5d6;
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
		transition: background 0.15s, border-color 0.15s;
	}
	.p-card.drop-over {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 4%, var(--surf));
	}

	/* ── Empty drop zone ─────────────────────────────────────────────────────── */
	.p-dz {
		width: 100%; min-height: 290px;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 4px; border: none;
		background: transparent; cursor: pointer;
		padding: 24px; color: var(--text);
		border-bottom: 1px solid var(--border);
	}
	.p-dz[aria-disabled="true"] { opacity: 0.6; cursor: default; }
	.p-dz h3 { margin: 8px 0 2px; font-size: 16px; font-weight: 600; }
	.p-dz .sub { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
	.p-dz .fmt-hint { font-size: 11px; color: var(--muted); margin: 6px 0 0; }
	.p-dz .dz-ico { color: var(--accent); }

	.sample-btn {
		display: block; margin: -4px auto 12px;
		border: none; background: transparent;
		color: var(--accent); font-size: 12px; font-weight: 500;
		cursor: pointer; text-decoration: underline;
		text-underline-offset: 2px;
		display: inline-flex; align-items: center; gap: 6px;
		padding: 0; width: 100%; justify-content: center;
		margin-top: 6px;
	}
	.sample-btn:hover { opacity: 0.8; }
	.sample-btn:disabled { opacity: 0.6; cursor: default; }
	.sample-spinner {
		width: 12px; height: 12px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 999px;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	/* ── Grid wrapper ────────────────────────────────────────────────────────── */
	.p-grid-wrap { display: flex; flex-direction: column; }

	.p-grid-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 11px 14px; border-bottom: 1px solid var(--border); gap: 10px;
	}
	.p-grid-label { font-size: 12px; font-weight: 600; color: var(--text); }
	.p-grid-hint { font-weight: 400; color: var(--muted); }

	.p-btn-add {
		display: flex; align-items: center; gap: 5px;
		padding: 5px 11px; border-radius: 6px;
		border: 1px solid var(--border); background: var(--bg);
		color: var(--accent); font-size: 12px; font-weight: 500;
		cursor: pointer; white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
		flex-shrink: 0;
	}
	.p-btn-add:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 5%, transparent); }
	.p-btn-add:disabled { opacity: 0.4; cursor: default; }

	/* ── Grid ────────────────────────────────────────────────────────────────── */
	.p-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		padding: 14px;
		max-height: 440px;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}
	@media (min-width: 480px) {
		.p-grid { grid-template-columns: repeat(4, 1fr); }
	}
	.p-grid::-webkit-scrollbar { width: 5px; }
	.p-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

	/* ── File card ───────────────────────────────────────────────────────────── */
	.p-file-card {
		display: flex; flex-direction: column;
		border-radius: 8px;
		border: 2px solid var(--border);
		background: var(--bg);
		overflow: hidden;
		cursor: grab;
		user-select: none;
		transition: box-shadow 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s;
	}
	.p-file-card:hover { border-color: var(--accent); box-shadow: 0 2px 10px rgba(0,0,0,0.09); }
	.p-file-card.dragging { opacity: 0.35; cursor: grabbing; transform: scale(0.97); }
	.p-file-card.drag-target {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent);
		transform: scale(1.02);
	}

	/* Thumbnail */
	.p-thumb {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4;
		background: color-mix(in srgb, var(--border) 40%, transparent);
		overflow: hidden;
		flex-shrink: 0;
	}
	.p-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.p-thumb-fallback {
		width: 100%; height: 100%;
		display: flex; align-items: center; justify-content: center;
		color: var(--muted); background: var(--surf);
	}
	.p-thumb-loading {
		width: 100%; height: 100%;
		display: flex; align-items: center; justify-content: center;
	}

	/* Order badge top-left */
	.p-order-badge {
		position: absolute; top: 6px; left: 6px;
		min-width: 22px; height: 22px; padding: 0 5px;
		border-radius: 11px;
		background: var(--accent); color: #fff;
		font-size: 11px; font-weight: 700;
		display: flex; align-items: center; justify-content: center;
		box-shadow: 0 1px 4px rgba(0,0,0,0.3);
		pointer-events: none;
	}

	/* Pages badge bottom-left */
	.p-pages-badge {
		position: absolute; bottom: 5px; left: 6px;
		background: rgba(0,0,0,0.5); color: #fff;
		font-size: 10px; font-weight: 500;
		padding: 1px 5px; border-radius: 8px;
		pointer-events: none;
	}

	/* Remove top-right — visible only on hover */
	.p-card-remove {
		position: absolute; top: 5px; right: 5px;
		width: 20px; height: 20px; border-radius: 50%;
		border: none; background: rgba(0,0,0,0.5); color: #fff;
		display: flex; align-items: center; justify-content: center;
		cursor: pointer; opacity: 0;
		transition: opacity 0.12s, background 0.12s;
	}
	.p-file-card:hover .p-card-remove { opacity: 1; }
	.p-card-remove:hover { background: #d94040; }
	.p-card-remove:disabled { cursor: default; }

	/* Footer */
	.p-card-footer {
		padding: 6px 8px 7px;
		border-top: 1px solid var(--border);
		display: flex; flex-direction: column; gap: 1px;
	}
	.p-card-name {
		font-size: 11px; font-weight: 500; color: var(--text);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		line-height: 1.3;
	}
	.p-card-size { font-size: 10px; color: var(--muted); }

	/* ── Action bar ──────────────────────────────────────────────────────────── */
	.p-action-bar { padding: 12px 14px; border-top: 1px solid var(--border); }
	.p-spinner-row {
		display: flex; align-items: center; justify-content: center;
		gap: 10px; padding-bottom: 8px;
	}
	.p-spinner {
		width: 15px; height: 15px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.p-spinner-label { font-size: 12px; color: var(--muted); }
	.p-warning { font-size: 11.5px; color: var(--muted); margin: 0 0 8px; text-align: center; }
	.p-error {
		display: flex; align-items: center; gap: 7px;
		padding: 6px 0 8px; font-size: 12.5px; color: #e05252;
	}
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

	/* ── Result viewer ───────────────────────────────────────────────────────── */
	.p-viewer-zone {
		position: relative;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}
	.p-viewer-scroll {
		max-height: 360px;
		min-height: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}
	.p-viewer-scroll::-webkit-scrollbar { width: 6px; }
	.p-viewer-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
	.p-viewer-pages {
		display: flex; flex-direction: column;
		align-items: center; gap: 8px; padding: 12px;
	}
	:global(.pdf-page-wrap) {
		position: relative; background: #fff;
		box-shadow: 0 1px 6px rgba(0,0,0,0.18);
		border-radius: 2px; overflow: hidden; flex-shrink: 0;
	}
	:global(.pdf-page-canvas) { display: block; max-width: 100%; }
	:global(.pdf-page-label) {
		position: absolute; bottom: 6px; right: 8px;
		background: rgba(0,0,0,0.45); color: #fff;
		font-size: 10px; font-weight: 500;
		padding: 1px 6px; border-radius: 10px;
		pointer-events: none; line-height: 1.6;
	}
	.p-viewer-loading {
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 10px; color: var(--muted); font-size: 12px;
		background: var(--bg);
	}
	.p-viewer-spinner {
		width: 22px; height: 22px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	.p-page-chip {
		position: absolute; top: 8px; right: 10px;
		background: rgba(0,0,0,0.45); color: #fff;
		font-size: 11px; font-weight: 500;
		padding: 2px 8px; border-radius: 20px;
		pointer-events: none; z-index: 3;
	}
	.p-panel {
		display: flex; flex-direction: column;
	}

	.p-result-head {
		display: flex; align-items: center; gap: 10px; padding: 16px 16px 10px;
	}
	.p-result-ico { color: #3daa6a; flex-shrink: 0; display: flex; }
	.p-result-title { font-size: 13px; font-weight: 600; color: var(--text); }
	.p-result-stats { font-size: 12px; color: var(--muted); margin-top: 2px; }
	.p-result-actions {
		padding: 0 16px 14px;
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
	.p-btn-text {
		display: flex; align-items: center; gap: 5px;
		background: none; border: none; padding: 0;
		font-size: 12px; color: var(--muted); cursor: pointer;
		text-decoration: underline; text-underline-offset: 2px;
		transition: color 0.15s;
	}
	.p-btn-text:hover { color: var(--text); }

	/* ── Ad / How-to / FAQ ───────────────────────────────────────────────────── */
	.ad-slot { margin: 14px 0 18px; min-height: 90px; border-radius: var(--r); overflow: hidden; background: var(--surf); }
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
