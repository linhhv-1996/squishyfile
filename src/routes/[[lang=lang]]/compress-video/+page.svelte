<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		Zap,
		Film,
		Folder,
		X,
		CheckCircle2,
		Download,
		ShieldCheck,
		AlertTriangle,
		FileVideo2,
	} from "lucide-svelte";

	import { VideoCompressor } from "$lib/utils/videoCompressor";
    import RelatedTools from "$lib/components/RelatedTools.svelte";
    import { getRelatedTools } from "$lib/config/relatedTools.js";

	const sizeTags = [
		{ mb: 10, label: "LINE" },
		{ mb: 8, label: "Discord" },
		{ mb: 25, label: "Gmail" },
		{ mb: 20, label: "Messenger" },
		{ mb: 50, label: "Telegram" },
		{ mb: 16, label: "Twitter/X" },
		{ mb: 100, label: "Email" },
	];

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
		JSON.stringify({
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: t("compress.meta.title"),
			description: t("compress.meta.desc"),
			applicationCategory: "MultimediaApplication",
			operatingSystem: "All",
			browserRequirements: "Requires JavaScript",
			offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		}),
	);

	// Related tools — update slugs to match your routes
	let relatedTools = $derived(
		getRelatedTools('compress-video', currentLangKey, t)
	);

	let { data } = $props();

	let dragOver = $state(false);
	let compressInput: HTMLInputElement;
	let compressFile: File | null = $state(null);
	let selectedPreset = $state("balanced");
	let targetMb = $state("");
	let selectedTag: number | null = $state(null);
	let compressError = $state("");
	let compressBusy = $state(false);
	let compressProcessing = $state(false);
	let compressResult: {
		href: string;
		download: string;
		original: string;
		compressed: string;
		saved: string;
	} | null = $state(null);

	const compressor = new VideoCompressor();

	let hasTarget = $derived(targetMb.trim() !== "");

	function triggerInput() {
		if (!compressBusy) compressInput.click();
	}
	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) loadFile(file);
	}
	function loadFile(file: File) {
		compressFile = file;
		compressError = "";
		compressProcessing = false;
		clearResult();
	}
	function clearFile() {
		compressFile = null;
		compressInput.value = "";
		compressError = "";
		compressBusy = false;
		compressProcessing = false;
		targetMb = "";
		selectedTag = null;
		selectedPreset = "balanced";
		clearResult();
		compressor.cancel();
	}
	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (!compressBusy) dragOver = true;
	}
	function onDragLeave() { dragOver = false; }
	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (compressBusy) return;
		const file = event.dataTransfer?.files?.[0];
		if (file && file.type.startsWith("video/")) loadFile(file);
	}
	function pickPreset(key: string) {
		if (hasTarget || compressBusy) return;
		selectedPreset = key;
	}
	function onTargetInput() {
		selectedTag = null;
		if (!targetMb.trim() && !selectedPreset) selectedPreset = "balanced";
	}
	function fillTargetSize(mb: number) {
		if (compressBusy) return;
		if (selectedTag === mb) { clearTargetSize(); return; }
		targetMb = String(mb);
		selectedTag = mb;
		selectedPreset = "";
	}
	function clearTargetSize() {
		if (compressBusy) return;
		targetMb = "";
		selectedTag = null;
		selectedPreset = "balanced";
	}
	function fmtBytes(bytes: number) {
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}
	function startCompress() {
		if (!compressFile) { compressError = t("error.selectFile"); return; }
		compressError = "";
		clearResult();
		compressBusy = true;
		compressProcessing = true;
		const currentFile = compressFile;
		compressor.compress({
			file: currentFile,
			preset: hasTarget ? undefined : selectedPreset,
			targetMb: hasTarget ? Number(targetMb) : undefined,
			onProgress: () => {},
			onSuccess: (resultBlob, finalSize) => {
				const ratio = finalSize / currentFile.size;
				const href = URL.createObjectURL(resultBlob);
				const base = currentFile.name.replace(/\.[^.]+$/, "");
				compressResult = {
					href,
					download: `${base}_compressed.mp4`,
					original: fmtBytes(currentFile.size),
					compressed: fmtBytes(finalSize),
					saved: `${Math.round((1 - ratio) * 100)}%`,
				};
				compressBusy = false;
				compressProcessing = false;
			},
			onError: (err) => {
				compressError = t(err);
				compressBusy = false;
				compressProcessing = false;
			},
		});
	}
	function clearResult() {
		if (compressResult?.href) URL.revokeObjectURL(compressResult.href);
		compressResult = null;
	}
	onDestroy(() => { compressor.cancel(); clearResult(); });

	function markdownToHtml(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}
</script>

<svelte:head>
	<title>{t("compress.meta.title")}</title>
	<meta property="og:title" content={t("compress.meta.title")} />
	<meta name="description" content={t("compress.meta.desc")} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
<div class="wrap">

	<!-- Hero -->
	<section class="hero">
		<h1>{@html t("compress.hero.title")}</h1>
		<p class="hero-sub">{t("compress.hero.sub")}</p>
		<div class="hero-pills">
			<div class="pill"><span class="pill-ico">🔒</span>{t("hero.pill1")}</div>
			<div class="pill"><span class="pill-ico">✨</span>{t("hero.pill2")}</div>
			<div class="pill"><span class="pill-ico">⚡</span>{t("hero.pill3")}</div>
		</div>
	</section>

	<!-- Drop zone -->
	{#if !compressFile}
		<button
			class="dz" class:over={dragOver}
			type="button"
			onclick={triggerInput}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			disabled={compressBusy}
		>
			<div class="dz-ico"><Film size={24} strokeWidth={1.5} /></div>
			<h3>{t("drop.video")}</h3>
			<p class="sub">{t("drop.compress.sub")}</p>
			<span class="btn-browse"><Folder size={14} strokeWidth={2} />{t("btn.browse")}</span>
			<p class="fmt-hint">{@html t("hint.compress")}</p>
		</button>
	{/if}
	<input
		bind:this={compressInput}
		class="file-input"
		type="file"
		accept="video/*"
		onchange={handleFile}
		disabled={compressBusy}
	/>

	<!-- ── File card ── -->
	{#if compressFile && !compressResult}
	<div class="v-card">

		<!-- File row -->
		<div class="v-file-row">
			<div class="v-file-ico"><Film size={18} strokeWidth={1.8} /></div>
			<div class="v-file-info">
				<div class="v-file-name">{compressFile.name}</div>
				<div class="v-file-size">
					{fmtBytes(compressFile.size)} · {compressFile.type || t("file.type.video")}
				</div>
			</div>
			<button class="v-remove" type="button" disabled={compressBusy} onclick={clearFile} title="Remove">
				<X size={15} strokeWidth={2.5} />
			</button>
		</div>

		<!-- Quality preset row -->
		<div class="v-row">
			<span class="v-label">{t("sec.quickPreset")}</span>
			<div class="v-opts">
				<button
					class="v-opt" class:v-opt--on={selectedPreset === "low" && !hasTarget}
					class:v-opt--disabled={hasTarget || compressBusy}
					type="button" disabled={hasTarget || compressBusy}
					onclick={() => pickPreset("low")}
				>
					{t("preset.low")}
					<span class="v-opt-sub">{t("preset.low.sub")}</span>
				</button>
				<button
					class="v-opt" class:v-opt--on={selectedPreset === "balanced" && !hasTarget}
					class:v-opt--disabled={hasTarget || compressBusy}
					type="button" disabled={hasTarget || compressBusy}
					onclick={() => pickPreset("balanced")}
				>
					{t("preset.balanced")}
					<span class="v-opt-sub">{t("preset.balanced.sub")}</span>
				</button>
				<button
					class="v-opt" class:v-opt--on={selectedPreset === "high" && !hasTarget}
					class:v-opt--disabled={hasTarget || compressBusy}
					type="button" disabled={hasTarget || compressBusy}
					onclick={() => pickPreset("high")}
				>
					{t("preset.high")}
					<span class="v-opt-sub">{t("preset.high.sub")}</span>
				</button>
			</div>
		</div>

		<!-- Target size row -->
		<div class="v-row v-row--col">
			<div class="v-target-head">
				<span class="v-label">{t("sec.targetSize")}</span>
				<div class="v-input-wrap">
					<input
						class="v-target-input"
						bind:value={targetMb}
						type="number"
						placeholder={t("input.target.ph")}
						min="1" max="4000"
						oninput={onTargetInput}
						disabled={compressBusy}
					/>
					{#if hasTarget}
						<button class="v-input-clear" type="button" disabled={compressBusy} onclick={clearTargetSize} title="Clear">
							<X size={13} strokeWidth={2.5} />
						</button>
					{:else}
						<span class="v-input-unit">MB</span>
					{/if}
				</div>
			</div>
			<div class="v-tags">
				{#each sizeTags as tag}
					<button
						class="v-tag" class:v-tag--on={selectedTag === tag.mb}
						type="button" disabled={compressBusy}
						onclick={() => fillTargetSize(tag.mb)}
					>
						{tag.label}
						<span class="v-tag-size">{tag.mb} MB</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Processing spinner -->
		{#if compressProcessing}
			<div class="v-spinner-row">
				<div class="v-spinner"></div>
				<span class="v-spinner-label">{t("status.compressing")}</span>
			</div>
			<p class="v-warning">{t("status.warning.keepOpen")}</p>
		{/if}

		<!-- Error bar -->
		{#if compressError}
			<div class="v-error">
				<AlertTriangle size={14} strokeWidth={2} />
				<span>{compressError}</span>
			</div>
		{/if}

		<!-- Submit -->
		<div class="v-action">
			<button class="v-submit" type="button" disabled={compressBusy} onclick={startCompress}>
				<Zap size={15} strokeWidth={2.2} />
				{t("btn.compressNow")}
			</button>
		</div>

	</div>
	{/if}

	<!-- ── Result card ── -->
	{#if compressResult}
	<div class="v-result">

		<div class="v-result-head">
			<div class="v-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
			<div>
				<div class="v-result-title">{t("res.compress.title")}</div>
				<div class="v-result-stats">
					{compressResult.original} → {compressResult.compressed}
					<span class="v-result-saved">· −{compressResult.saved}</span>
				</div>
			</div>
		</div>

		<div class="v-result-actions">
			<a class="v-btn-dl" href={compressResult.href} download={compressResult.download}>
				<Download size={15} strokeWidth={2.2} />
				{t("btn.dl.compress")}
			</a>
			<button class="v-btn-new" type="button" onclick={clearFile}>
				<FileVideo2 size={13} strokeWidth={2} />
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

	<!-- How to use -->
	{#if data.howToHtml}
		<section class="how-to-sec prose">{@html data.howToHtml}</section>
	{/if}

	<!-- FAQ -->
	<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
		<h2>{t("faq.video.title")}</h2>
		<div class="faq-list">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
				<details
					class="faq-item"
					itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name">{t(`faq.video.${n}.q`)}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{@html markdownToHtml(t(`faq.video.${n}.a`))}</span>
					</div>
				</details>
			{/each}
		</div>
	</section>

</div>
</main>

<style>
	/* ─────────────────────────────────────────────────────────────────────────────
	   Video Compress — self-contained styles.
	   Follows the same pattern as the PDF tool (p-card / p-row / p-opt…).
	   Uses CSS vars: --text, --muted, --border, --accent, --surf, --bg, --r
	───────────────────────────────────────────────────────────────────────────── */

	/* ── File card ───────────────────────────────────────────────────────────── */
	.v-card {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* File row */
	.v-file-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
	}
	.v-file-ico {
		color: var(--accent);
		flex-shrink: 0;
		display: flex;
	}
	.v-file-info { flex: 1; min-width: 0; }
	.v-file-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.v-file-size { font-size: 12px; color: var(--muted); margin-top: 1px; }
	.v-remove {
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
	.v-remove:hover { color: var(--text); background: var(--border); }
	.v-remove:disabled { opacity: 0.4; cursor: default; }

	/* Option rows */
	.v-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}
	/* Target size row stays column always (has multi-line tags) */
	.v-row--col { flex-direction: column; }
	.v-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		white-space: nowrap;
	}
	@media (min-width: 540px) {
		.v-row:not(.v-row--col) {
			flex-direction: row;
			align-items: center;
			gap: 12px;
		}
		.v-row:not(.v-row--col) .v-label {
			flex-shrink: 0;
			min-width: 130px;
		}
	}

	/* Preset option buttons */
	.v-opts { display: flex; gap: 6px; flex-wrap: wrap; }
	.v-opt {
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
	.v-opt:hover { border-color: var(--accent); }
	.v-opt--on {
		border-color: var(--accent);
		background: var(--surf);
		color: var(--accent);
	}
	.v-opt--disabled, .v-opt:disabled { opacity: 0.5; cursor: default; }
	.v-opt-sub { font-size: 11px; font-weight: 400; color: var(--muted); }
	.v-opt--on .v-opt-sub { color: var(--accent); opacity: 0.7; }

	/* Target size input */
	.v-target-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.v-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.v-target-input {
		width: 200px;
		height: 32px;
		padding: 0 28px 0 10px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 13px;
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
		/* hide native number spinners */
		-moz-appearance: textfield;
	}
	.v-target-input::-webkit-inner-spin-button,
	.v-target-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
	.v-target-input::placeholder { color: var(--muted); }
	.v-target-input:focus { border-color: var(--accent); }
	.v-target-input:disabled { opacity: 0.5; }
	.v-input-unit {
		position: absolute;
		right: 9px;
		font-size: 11px;
		color: var(--muted);
		pointer-events: none;
	}
	.v-input-clear {
		position: absolute;
		right: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px; height: 20px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		border-radius: 4px;
		transition: color 0.15s;
	}
	.v-input-clear:hover { color: var(--text); }

	/* Platform size tags */
	.v-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 2px;
	}
	.v-tag {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 9px;
		border-radius: 20px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
		white-space: nowrap;
	}
	.v-tag:hover { border-color: var(--accent); color: var(--text); }
	.v-tag--on {
		border-color: var(--accent);
		background: var(--surf);
		color: var(--accent);
	}
	.v-tag:disabled { opacity: 0.5; cursor: default; }
	.v-tag-size { font-size: 11px; opacity: 0.65; }

	/* Processing spinner */
	.v-spinner-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}
	.v-spinner {
		width: 16px; height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: v-spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	@keyframes v-spin { to { transform: rotate(360deg); } }
	.v-spinner-label { font-size: 12px; color: var(--muted); }
	.v-warning {
		padding: 4px 16px 10px;
		font-size: 11.5px;
		color: var(--muted);
		margin: 0;
		text-align: center;
	}

	/* Error bar */
	.v-error {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 16px;
		font-size: 12.5px;
		color: #e05252;
		border-top: 1px solid var(--border);
	}

	/* Submit */
	.v-action {
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}
	.v-submit {
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
	.v-submit:hover { opacity: 0.88; }
	.v-submit:disabled { opacity: 0.5; cursor: default; }

	/* ── Result card ─────────────────────────────────────────────────────────── */
	.v-result {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}
	.v-result-head {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px 10px;
	}
	.v-result-ico {
		color: #3daa6a;
		flex-shrink: 0;
		display: flex;
		margin-top: 1px;
	}
	.v-result-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}
	.v-result-stats {
		font-size: 12px;
		color: var(--muted);
		margin-top: 2px;
	}
	.v-result-saved {
		font-weight: 600;
		color: #3daa6a;
	}
	.v-result-actions {
		padding: 0 16px 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.v-btn-dl {
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
	.v-btn-dl:hover { opacity: 0.88; }
	.v-btn-new {
		display: flex;
		align-items: center;
		gap: 5px;
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
	.v-btn-new:hover { color: var(--text); }

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
	.how-to-sec :global(hr) { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
</style>
