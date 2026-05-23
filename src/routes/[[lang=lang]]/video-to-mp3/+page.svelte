<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		AlertTriangle,
		CheckCircle2,
		Download,
		FileAudio2,
		Film,
		Folder,
		Music2,
		ShieldCheck,
		X,
		Zap,
	} from "lucide-svelte";
	import { VideoToMp3Converter } from "$lib/utils/videoToMp3Converter";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import RelatedTools from "$lib/components/RelatedTools.svelte";

	let { data } = $props();

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

	let relatedTools = $derived(
		getRelatedTools('video-to-mp3', currentLangKey, t)
	);

	let jsonLd = $derived(
		JSON.stringify({
			"@context": "https://schema.org",
			"@type": "WebApplication",
			name: t("mp3.meta.title"),
			description: t("mp3.meta.desc"),
			applicationCategory: "MultimediaApplication",
			operatingSystem: "All",
			browserRequirements: "Requires JavaScript",
			offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		}),
	);

	const converter = new VideoToMp3Converter();

	let inputEl: HTMLInputElement;
	let dragOver = $state(false);

	let file: File | null = $state(null);
	let selectedBitrate = $state(192);
	let busy = $state(false);
	let error = $state("");
	let processing = $state(false);

	let progress = $state({
		show: false,
		pct: 0,
		labelKey: "mp3.status.converting",
	});

	let result: {
		href: string;
		download: string;
		original: string;
		converted: string;
	} | null = $state(null);

	const bitrateOptions = [
		{ value: 128, labelKey: "mp3.bitrate.128.label", subKey: "mp3.bitrate.128.sub" },
		{ value: 192, labelKey: "mp3.bitrate.192.label", subKey: "mp3.bitrate.192.sub" },
		{ value: 320, labelKey: "mp3.bitrate.320.label", subKey: "mp3.bitrate.320.sub" },
	];

	function triggerInput() {
		if (!busy) inputEl.click();
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const picked = input.files?.[0];
		if (picked) loadFile(picked);
	}

	function loadFile(picked: File) {
		if (!picked.type.startsWith("video/") && !picked.type.startsWith("audio/")) {
			error = t("mp3.error.selectVideo");
			return;
		}
		file = picked;
		error = "";
		progress = { show: false, pct: 0, labelKey: "mp3.status.converting" };
		clearResult();
	}

	function clearFile() {
		file = null;
		inputEl.value = "";
		error = "";
		busy = false;
		processing = false;
		selectedBitrate = 192;
		progress = { show: false, pct: 0, labelKey: "mp3.status.converting" };
		clearResult();
		converter.cancel();
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (!busy) dragOver = true;
	}
	function onDragLeave() { dragOver = false; }
	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (busy) return;
		const dropped = event.dataTransfer?.files?.[0];
		if (dropped) loadFile(dropped);
	}

	function fmtBytes(bytes: number) {
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function startConvert() {
		if (!file) { error = t("mp3.error.selectVideo"); return; }
		const currentFile = file;
		error = "";
		clearResult();
		busy = true;
		processing = true;
		progress = { show: true, pct: 0, labelKey: "mp3.status.converting" };

		converter.convert({
			file: currentFile,
			bitrate: selectedBitrate * 1000,
			onProgress: (pct) => {
				progress = { ...progress, pct };
			},
			onSuccess: (blob, finalSize) => {
				const href = URL.createObjectURL(blob);
				const base = currentFile.name.replace(/\.[^.]+$/, "");
				result = {
					href,
					download: `${base}.mp3`,
					original: fmtBytes(currentFile.size),
					converted: fmtBytes(finalSize),
				};
				busy = false;
				processing = false;
			},
			onError: (message) => {
				error = message;
				busy = false;
				processing = false;
				progress = { show: false, pct: 0, labelKey: "mp3.status.converting" };
			},
		});
	}

	function clearResult() {
		if (result?.href) URL.revokeObjectURL(result.href);
		result = null;
	}

	function markdownToHtml(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}

	onDestroy(() => {
		converter.cancel();
		clearResult();
	});
</script>

<svelte:head>
	<title>{t("mp3.meta.title")}</title>
	<meta property="og:title" content={t("mp3.meta.title")} />
	<meta name="description" content={t("mp3.meta.desc")} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
<div class="wrap">

	<!-- Hero -->
	<section class="hero">
		<h1>{@html t("mp3.hero.title")}</h1>
		<p>{t("mp3.hero.sub")}</p>
		<div class="pills">
			<div class="pill"><span class="dot"></span><span>{t("hero.pill1")}</span></div>
			<div class="pill"><span class="dot"></span><span>{t("hero.pill2")}</span></div>
			<div class="pill"><span class="dot"></span><span>{t("hero.pill3")}</span></div>
		</div>
	</section>

	<!-- Drop zone -->
	{#if !file}
		<button
			class="dz dz--mp3"
			class:over={dragOver}
			type="button"
			onclick={triggerInput}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
			disabled={busy}
		>
			<div class="dz-ico dz-ico--mp3"><Music2 size={24} strokeWidth={1.5} /></div>
			<h3>{t("mp3.drop.title")}</h3>
			<p class="sub">{t("drop.compress.sub")}</p>
			<span class="btn-browse"><Folder size={14} strokeWidth={2} />{t("btn.browse")}</span>
			<p class="fmt-hint">{@html t("mp3.hint")}</p>
		</button>
	{/if}

	<input
		bind:this={inputEl}
		class="file-input"
		type="file"
		accept="video/*,audio/*"
		onchange={handleFile}
		disabled={busy}
	/>

	<!-- ── File card ── -->
	{#if file && !result}
	<div class="p-card">

		<!-- File row -->
		<div class="p-file-row">
			<div class="p-file-ico"><Film size={18} strokeWidth={1.8} /></div>
			<div class="p-file-info">
				<div class="p-file-name">{file.name}</div>
				<div class="p-file-size">{fmtBytes(file.size)} · {file.type || t("file.type.video")}</div>
			</div>
			<button class="p-remove" type="button" disabled={busy} onclick={clearFile} title="Remove">
				<X size={15} strokeWidth={2.5} />
			</button>
		</div>

		<!-- Bitrate quality -->
		<div class="p-row">
			<span class="p-label">{t("mp3.sec.quality")}</span>
			<div class="p-opts">
				{#each bitrateOptions as option}
					<button
						class="p-opt"
						class:p-opt--on={selectedBitrate === option.value}
						disabled={busy}
						type="button"
						onclick={() => (selectedBitrate = option.value)}
					>
						{t(option.labelKey)}
						<span class="p-opt-sub">{t(option.subKey)}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Processing -->
		{#if processing}
			<div class="p-spinner-row">
				<div class="p-spinner"></div>
				<span class="p-spinner-label">{t(progress.labelKey)} {progress.pct > 0 ? `${progress.pct}%` : ""}</span>
			</div>
			<p class="p-warning">{t("status.warning.keepOpen")}</p>
		{/if}

		<!-- Error -->
		{#if error}
			<div class="p-error">
				<AlertTriangle size={14} strokeWidth={2} />
				<span>{error}</span>
			</div>
		{/if}

		<!-- Submit -->
		<div class="p-action">
			<button class="p-submit" type="button" disabled={busy} onclick={startConvert}>
				<Zap size={15} strokeWidth={2.2} />
				{t("mp3.btn.convert")}
			</button>
		</div>

	</div>
	{/if}

	<!-- ── Result card ── -->
	{#if result}
	<div class="p-result">

		<div class="p-result-head">
			<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
			<div>
				<div class="p-result-title">{t("mp3.res.title")}</div>
				<div class="p-result-stats">
					{result.original} → {result.converted}
					<span class="p-result-saved">· MP3 {selectedBitrate}kbps</span>
				</div>
			</div>
		</div>

		<div class="p-result-actions">
			<a class="p-btn-dl" href={result.href} download={result.download}>
				<Download size={15} strokeWidth={2.2} />
				{t("mp3.btn.download")}
			</a>
			<button class="p-btn-new" type="button" onclick={clearFile}>
				<FileAudio2 size={13} strokeWidth={2.2} />
				{t("mp3.btn.new")}
			</button>
		</div>

		<RelatedTools
			label={t('relatedTools.label')}
			tools={relatedTools}
		/>

	</div>
	{/if}

	<!-- Privacy note -->
	<div class="pnote">
		<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
		<p>{@html t("mp3.note.privacy")}</p>
	</div>

	<!-- How to use -->
	{#if data.howToHtml}
		<section class="how-to-sec prose">{@html data.howToHtml}</section>
	{/if}

	<!-- FAQ -->
	<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
		<h2>{t("faq.mp3.title")}</h2>
		<div class="faq-list">
			{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
				<details
					class="faq-item"
					itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name">{t(`faq.mp3.${n}.q`)}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{@html markdownToHtml(t(`faq.mp3.${n}.a`))}</span>
					</div>
				</details>
			{/each}
		</div>
	</section>

</div>
</main>

<style>
	/* ─────────────────────────────────────────────────────────────────────────
	   Self-contained styles mirroring the PDF tool conventions.
	   Relies on global CSS vars: --text, --muted, --border, --accent,
	   --surf, --bg, --r
	───────────────────────────────────────────────────────────────────────── */

	/* Drop zone accent colour for MP3 tool */
	.dz-ico--mp3 { color: var(--accent); }

	/* ── File card ───────────────────────────────────────────────────────── */
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

	/* Option rows */
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
	@media (min-width: 540px) {
		.p-row { flex-direction: row; align-items: center; gap: 12px; }
		.p-label { flex-shrink: 0; min-width: 130px; }
	}

	/* Bitrate option buttons */
	.p-opts { display: flex; gap: 6px; flex-wrap: wrap; }
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
	.p-opt-sub { font-size: 11px; font-weight: 400; color: var(--muted); }
	.p-opt--on .p-opt-sub { color: var(--accent); opacity: 0.7; }

	/* Processing spinner */
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

	/* ── Result card ─────────────────────────────────────────────────────── */
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
	.p-result-ico { color: #3daa6a; flex-shrink: 0; display: flex; margin-top: 1px; }
	.p-result-title { font-size: 13px; font-weight: 600; color: var(--text); }
	.p-result-stats { font-size: 12px; color: var(--muted); margin-top: 2px; }
	.p-result-saved { font-weight: 600; color: #3daa6a; }

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
	.p-btn-dl:hover { opacity: 0.88; }
	.p-btn-new {
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
	.p-btn-new:hover { color: var(--text); }

	/* ── How-to section ──────────────────────────────────────────────────── */
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
