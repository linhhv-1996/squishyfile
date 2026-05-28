<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
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
		ArrowUp,
		ArrowDown,
	} from "lucide-svelte";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import RelatedTools from "$lib/components/RelatedTools.svelte";

	type PdfItem = {
		id: string;
		file: File;
	};

	let { data } = $props();

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);

	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"][key] || key
	);

	let jsonLd = $derived(
		JSON.stringify({
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: t("pdfMerge.meta.title"),
			description: t("pdfMerge.meta.desc"),
			applicationCategory: "UtilitiesApplication",
			operatingSystem: "All",
			browserRequirements: "Requires JavaScript",
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
			},
		})
	);

	let dragOver = $state(false);
	let pdfInput: HTMLInputElement;

	let pdfFiles = $state<PdfItem[]>([]);
	let pdfError = $state("");
	let pdfProcessing = $state(false);
	let pdfBusy = $state(false);

	let pdfResult: {
		href: string;
		download: string;
		files: number;
		output: string;
	} | null = $state(null);

	let relatedTools = $derived(getRelatedTools("pdf-merge", currentLangKey, t));

	function uid() {
		return Math.random().toString(36).slice(2, 10);
	}

	function md(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}

	function fmtBytes(b: number) {
		if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
		if (b < 1_073_741_824) return `${(b / 1_048_576).toFixed(1)} MB`;
		return `${(b / 1_073_741_824).toFixed(2)} GB`;
	}

	function triggerInput() {
		pdfInput.click();
	}

	function handleFiles(e: Event) {
		const selected = Array.from((e.currentTarget as HTMLInputElement).files || []);
		addFiles(selected);

		if (pdfInput) pdfInput.value = "";
	}

	function isPdf(file: File) {
		return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
	}

	function addFiles(files: File[]) {
		const valid = files.filter(isPdf);

		if (!valid.length) {
			pdfError = t("pdfMerge.error.invalidFile");
			return;
		}

		pdfError = "";
		clearResult();

		pdfFiles = [
			...pdfFiles,
			...valid.map((file) => ({
				id: uid(),
				file,
			})),
		];
	}

	function removeFile(id: string) {
		pdfFiles = pdfFiles.filter((item) => item.id !== id);
		pdfError = "";
		clearResult();
	}

	function clearFiles() {
		pdfFiles = [];
		pdfError = "";
		pdfBusy = false;
		pdfProcessing = false;

		if (pdfInput) pdfInput.value = "";

		clearResult();
	}

	function moveFile(id: string, direction: -1 | 1) {
		const index = pdfFiles.findIndex((item) => item.id === id);
		if (index < 0) return;

		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= pdfFiles.length) return;

		const next = [...pdfFiles];
		const [item] = next.splice(index, 1);
		next.splice(nextIndex, 0, item);

		pdfFiles = next;
		clearResult();
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const files = Array.from(e.dataTransfer?.files || []);
		addFiles(files);
	}

	async function startMerge() {
		if (!pdfFiles.length) {
			pdfError = t("pdfMerge.error.selectPdf");
			return;
		}

		if (pdfFiles.length < 2) {
			pdfError = t("pdfMerge.error.needTwo");
			return;
		}

		pdfError = "";
		clearResult();

		pdfBusy = true;
		pdfProcessing = true;

		const fileUrls = pdfFiles.map((item) => ({
			fileUrl: URL.createObjectURL(item.file),
			name: item.file.name,
		}));

		const worker = new Worker(new URL("$lib/workers/pdf-merge-worker.ts", import.meta.url), {
			type: "module",
		});

		worker.postMessage({
			files: fileUrls,
		});

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
			fileUrls.forEach((item) => URL.revokeObjectURL(item.fileUrl));
		};

		worker.onerror = () => {
			pdfBusy = false;
			pdfProcessing = false;
			pdfError = t("pdfMerge.error.mergeFailed");

			worker.terminate();
			fileUrls.forEach((item) => URL.revokeObjectURL(item.fileUrl));
		};
	}

	function clearResult() {
		if (pdfResult?.href) URL.revokeObjectURL(pdfResult.href);
		pdfResult = null;
	}

	onDestroy(() => {
		clearResult();
	});
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

		{#if !pdfFiles.length}
			<button
				class="dz dz--pdf"
				class:over={dragOver}
				type="button"
				onclick={triggerInput}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				ondrop={onDrop}
			>
				<div class="dz-ico dz-ico--pdf">
					<FileText size={24} strokeWidth={1.5} />
				</div>
				<h3>{t("pdfMerge.drop.title")}</h3>
				<p class="sub">{t("pdfMerge.drop.sub")}</p>
				<span class="btn-browse">
					<Folder size={14} strokeWidth={2} />
					{t("pdfMerge.btn.addFiles")}
				</span>
				<p class="fmt-hint">{t("pdfMerge.hint")}</p>
			</button>
		{/if}

		<input
			bind:this={pdfInput}
			class="file-input"
			type="file"
			accept="application/pdf,.pdf"
			multiple
			onchange={handleFiles}
		/>

		{#if pdfFiles.length && !pdfResult}
			<div class="p-card">
				<div class="p-row p-row--head">
					<span class="p-label">{t("pdfMerge.files.label")}</span>

					<button
						class="p-btn-new"
						type="button"
						onclick={triggerInput}
						disabled={pdfBusy}
					>
						{t("pdfMerge.btn.addFiles")}
					</button>
				</div>

				<div class="pdf-list">
					{#each pdfFiles as item, index (item.id)}
						<div class="p-file-row">
							<div class="p-file-ico">
								<FileText size={18} strokeWidth={1.8} />
							</div>

							<div class="p-file-info">
								<div class="p-file-name">{index + 1}. {item.file.name}</div>
								<div class="p-file-size">{fmtBytes(item.file.size)} · PDF</div>
							</div>

							<div class="pdf-order-actions">
								<button
									class="p-remove"
									type="button"
									onclick={() => moveFile(item.id, -1)}
									disabled={pdfBusy || index === 0}
									title="Move up"
									aria-label="Move up"
								>
									<ArrowUp size={14} strokeWidth={2.4} />
								</button>

								<button
									class="p-remove"
									type="button"
									onclick={() => moveFile(item.id, 1)}
									disabled={pdfBusy || index === pdfFiles.length - 1}
									title="Move down"
									aria-label="Move down"
								>
									<ArrowDown size={14} strokeWidth={2.4} />
								</button>

								<button
									class="p-remove"
									type="button"
									onclick={() => removeFile(item.id)}
									disabled={pdfBusy}
									title={t("pdfMerge.btn.remove")}
									aria-label={t("pdfMerge.btn.remove")}
								>
									<X size={15} strokeWidth={2.5} />
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if pdfProcessing}
					<div class="p-spinner-row">
						<div class="p-spinner"></div>
						<span class="p-spinner-label">{t("pdfMerge.status.merging")}</span>
					</div>

					<div class="ad-slot ad-slot--processing" aria-label="Advertisement"></div>
					<p class="p-warning">{t("pdfMerge.warning.keepOpen")}</p>
				{/if}

				{#if pdfError}
					<div class="p-error">
						<AlertTriangle size={14} strokeWidth={2} />
						<span>{pdfError}</span>
					</div>
				{/if}

				<div class="p-action">
					<button
						class="p-submit"
						type="button"
						disabled={pdfBusy || pdfFiles.length < 2}
						onclick={startMerge}
					>
						<FileText size={15} strokeWidth={2.2} />
						{t("pdfMerge.btn.merge")}
					</button>
				</div>
			</div>
		{/if}

		{#if pdfResult}
			<div class="p-result">
				<div class="p-result-head">
					<div class="p-result-ico">
						<CheckCircle2 size={15} strokeWidth={2.2} />
					</div>

					<div>
						<div class="p-result-title">{t("pdfMerge.res.title")}</div>
						<div class="p-result-stats">
							{pdfResult.files} {t("pdfMerge.stat.files")} · {pdfResult.output}
						</div>
					</div>
				</div>

				<div class="p-result-actions">
					<a class="p-btn-dl" href={pdfResult.href} download={pdfResult.download}>
						<Download size={15} strokeWidth={2.2} />
						{t("pdfMerge.btn.download")}
					</a>

					<button class="p-btn-new" type="button" onclick={clearFiles}>
						{t("pdfMerge.btn.new")}
					</button>
				</div>

				<RelatedTools label={t("relatedTools.label")} tools={relatedTools} />
			</div>
		{/if}

		<div class="pnote">
			<span class="ni">
				<ShieldCheck size={16} strokeWidth={2} />
			</span>
			<p>{@html t("pdfMerge.note.privacy")}</p>
		</div>

		{#if data.contentHtml}
			<section class="how-to-sec prose">{@html data.contentHtml}</section>
		{/if}
        <br/>

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t("faq.pdfMerge.title")}</h2>

			<div class="faq-list">
				{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
					<details
						class="faq-item"
						itemscope
						itemprop="mainEntity"
						itemtype="https://schema.org/Question"
					>
						<summary class="faq-q" itemprop="name">{t(`faq.pdfMerge.${n}.q`)}</summary>

						<div
							class="faq-a"
							itemscope
							itemprop="acceptedAnswer"
							itemtype="https://schema.org/Answer"
						>
							<span itemprop="text">{@html md(t(`faq.pdfMerge.${n}.a`))}</span>
						</div>
					</details>
				{/each}
			</div>
		</section>
	</div>
</main>

<style>
	.p-card {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	.p-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}

	.p-row--head {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.p-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		white-space: nowrap;
	}

	.pdf-list {
		display: flex;
		flex-direction: column;
		max-height: 320px;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.pdf-list::-webkit-scrollbar {
		width: 8px;
	}

	.pdf-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.pdf-list::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 999px;
	}

	.pdf-list::-webkit-scrollbar-thumb:hover {
		background: var(--muted);
	}

	.p-file-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
	}

	.p-file-row:last-child {
		border-bottom: none;
	}

	.p-file-ico {
		color: var(--accent);
		flex-shrink: 0;
		display: flex;
	}

	.p-file-info {
		flex: 1;
		min-width: 0;
	}

	.p-file-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.p-file-size {
		font-size: 12px;
		color: var(--muted);
		margin-top: 1px;
	}

	.pdf-order-actions {
		display: flex;
		align-items: center;
		gap: 3px;
		flex-shrink: 0;
	}

	.p-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.p-remove:hover {
		color: var(--text);
		background: var(--border);
	}

	.p-remove:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.p-spinner-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}

	.p-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: p-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes p-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.p-spinner-label {
		font-size: 12px;
		color: var(--muted);
	}

	.p-warning {
		padding: 4px 16px 10px;
		font-size: 11.5px;
		color: var(--muted);
		margin: 0;
		text-align: center;
	}

	.p-error {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 16px;
		font-size: 12.5px;
		color: #e05252;
		border-top: 1px solid var(--border);
	}

	.ad-slot--processing {
		min-height: 90px;
		background: var(--bg);
		border-top: 1px solid var(--border);
	}

	.ad-slot--processing:empty {
		display: none;
	}

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

	.p-submit:hover {
		opacity: 0.88;
	}

	.p-submit:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.p-result {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

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

	.p-result-actions {
		padding: 0 16px 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

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

	.p-btn-dl:hover {
		opacity: 0.88;
	}

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

	.p-btn-new:hover {
		color: var(--text);
	}

	.p-btn-new:disabled {
		opacity: 0.4;
		cursor: default;
	}

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

	.faq-sec h2 {
		font-size: 1.15rem;
		font-weight: 650;
		color: var(--text);
		margin: 0 0 14px;
		line-height: 1.3;
	}

	.how-to-sec {
		padding-top: 18px;
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
		margin: 15px 0;
	}
</style>
