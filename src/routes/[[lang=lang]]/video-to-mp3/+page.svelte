<script lang="ts">
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		AlertTriangle,
		CheckCircle2,
		Download,
		FileAudio2,
		Music2,
		Folder,
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
	let videoSrc: string | null = $state(null);
	let selectedBitrate = $state(192);
	let busy = $state(false);
	let sampleLoading = $state(false);
	let error = $state("");

	async function loadSampleVideo(event?: MouseEvent) {
		event?.stopPropagation();
		if (busy || sampleLoading) return;
		error = "";
		sampleLoading = true;
		try {
			const res = await fetch("/file_example_WEBM_1920_3_7MB.webm");
			if (!res.ok) throw new Error("sample_not_found");
			const blob = await res.blob();
			const filename = "sample-video.webm";
			const f = new File([blob], filename, { type: blob.type || "video/webm" });
			loadFile(f);
		} catch {
			error = t("error.sampleVideoLoadFailed");
		} finally {
			sampleLoading = false;
		}
	}

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
		if (!busy && !sampleLoading) inputEl.click();
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
		if (videoSrc) URL.revokeObjectURL(videoSrc);
		videoSrc = URL.createObjectURL(picked);
		file = picked;
		error = "";
		progress = { show: false, pct: 0, labelKey: "mp3.status.converting" };
		clearResult();
	}

	function clearFile() {
		if (videoSrc) { URL.revokeObjectURL(videoSrc); videoSrc = null; }
		file = null;
		if (inputEl) inputEl.value = "";
		error = "";
		busy = false;
		sampleLoading = false;
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
		const currentBitrate = selectedBitrate;
		error = "";
		clearResult();
		busy = true;
		progress = { show: true, pct: 1, labelKey: "mp3.status.loading" };

		converter.convert({
			file: currentFile,
			bitrate: currentBitrate * 1000,
			onProgress: (pct) => {
				progress = {
					...progress,
					pct,
					labelKey: pct < 40 ? "mp3.status.loading" : "mp3.status.converting",
				};
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
				progress = { show: true, pct: 100, labelKey: "mp3.status.done" };
				busy = false;
			},
			onError: (message) => {
				error = message;
				busy = false;
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
		if (videoSrc) URL.revokeObjectURL(videoSrc);
	});
</script>

<svelte:head>
	<title>{t("mp3.meta.title")}</title>
	<meta property="og:title" content={t("mp3.meta.title")} />
	<meta name="description" content={t("mp3.meta.desc")} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<input
	bind:this={inputEl}
	class="file-input"
	type="file"
	accept="video/*,audio/*"
	onchange={handleFile}
	disabled={busy || sampleLoading}
/>

<main>
<div class="wrap">

	<!-- Hero -->
	<section class="hero">
		<h1>{@html t("mp3.hero.title")}</h1>
		<p class="hero-sub">{t("mp3.hero.sub")}</p>
		<div class="hero-pills">
			<div class="pill"><span class="pill-ico">🔒</span>{t("hero.pill1")}</div>
			<div class="pill"><span class="pill-ico">✨</span>{t("hero.pill2")}</div>
			<div class="pill"><span class="pill-ico">⚡</span>{t("hero.pill3")}</div>
		</div>
	</section>

	<!-- ── Unified tool card ── -->
	<div class="v-card">

		<!-- ── Preview / Drop zone (top) ── -->
		<div
			class="v-preview"
			class:over={dragOver && !file}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
		>
			{#if result}
				<!-- Result: audio player to preview converted MP3 -->
				<div class="v-audio-result">
					<div class="v-audio-ico"><Music2 size={40} strokeWidth={1.2} /></div>
					<div class="v-audio-name">{result.download}</div>
					<audio class="v-audio-player" src={result.href} controls></audio>
				</div>
			{:else if file && videoSrc}
				<!-- Uploaded video preview -->
				<video class="v-video" src={videoSrc} controls playsinline muted></video>
			{:else}
				<!-- Drop zone -->
				<div
					class="v-dz"
					role="button"
					tabindex={busy || sampleLoading ? -1 : 0}
					aria-disabled={busy || sampleLoading}
					onclick={triggerInput}
					onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); triggerInput(); } }}
				>
					<div class="dz-ico"><Music2 size={55} strokeWidth={1.4} /></div>
					<h3>{t("mp3.drop.title")}</h3>
					<p class="sub">{t("drop.compress.sub")}</p>
					<span class="btn-browse"><Folder size={14} strokeWidth={2} />{t("btn.browse")}</span>

					<button
						class="sample-btn"
						type="button"
						disabled={busy || sampleLoading}
						onclick={loadSampleVideo}
					>
						{#if sampleLoading}
							<span class="sample-spinner" aria-hidden="true"></span>
							{t("status.loadingSampleVideo")}
						{:else}
							{t("btn.sampleVideo")}
						{/if}
					</button>

					<p class="fmt-hint">{@html t("mp3.hint")}</p>
				</div>
			{/if}
		</div>

		<!-- ── Settings / Result panel (bottom) ── -->
		<div class="v-panel">

			{#if result}
				<!-- ── Result state ── -->
				<div class="v-result-head">
					<div class="v-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
					<div>
						<div class="v-result-title">{t("mp3.res.title")}</div>
						<div class="v-result-stats">
							{result.original} → {result.converted}
							<span class="v-result-fmt">· MP3 {selectedBitrate}kbps</span>
						</div>
					</div>
				</div>
				<div class="v-result-actions">
					<a class="v-btn-dl" href={result.href} download={result.download}>
						<Download size={15} strokeWidth={2.2} />
						{t("mp3.btn.download")}
					</a>
					<button class="v-btn-new" type="button" onclick={clearFile}>
						<FileAudio2 size={13} strokeWidth={2} />
						{t("mp3.btn.new")}
					</button>
				</div>
				{#if relatedTools.length > 0}
					<RelatedTools label={t("relatedTools.label")} tools={relatedTools} />
				{/if}

			{:else}
				<!-- ── Settings state ── -->

				<!-- File row — only when file loaded -->
				{#if file}
					<div class="v-file-row" in:fade={{ duration: 150 }}>
						<div class="v-file-ico"><Music2 size={18} strokeWidth={1.8} /></div>
						<div class="v-file-info">
							<div class="v-file-name">{file.name}</div>
							<div class="v-file-size">
								{fmtBytes(file.size)} · {file.type || t("file.type.video")}
							</div>
						</div>
						<button class="v-remove" type="button" disabled={busy} onclick={clearFile} title={t("btn.remove")}>
							<X size={15} strokeWidth={2.5} />
						</button>
					</div>
				{/if}

				<!-- Bitrate quality row -->
				<div class="v-row">
					<span class="v-label">{t("mp3.sec.quality")}</span>
					<div class="v-opts">
						{#each bitrateOptions as option}
							<button
								class="v-opt"
								class:v-opt--on={selectedBitrate === option.value}
								type="button"
								disabled={busy}
								onclick={() => (selectedBitrate = option.value)}
							>
								{t(option.labelKey)}
								<span class="v-opt-sub">{t(option.subKey)}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Submit + progress + error -->
				<div class="v-action" style="margin-top:auto;">
					{#if progress.show}
						<div class="v-progress-row">
							<div class="v-prog-top">
								<span class="v-spinner-label">{t(progress.labelKey)}</span>
								<span class="v-pct">{progress.pct}%</span>
							</div>
							<div class="v-pbar">
								<div class="v-pfill" style:width={`${progress.pct}%`}></div>
							</div>
						</div>
						<p class="v-warning">{t("status.warning.keepOpen")}</p>
					{/if}
					{#if error}
						<div class="v-error">
							<AlertTriangle size={14} strokeWidth={2} />
							<span>{error}</span>
						</div>
					{/if}
					<button class="v-submit" type="button" disabled={busy || !file} onclick={startConvert}>
						<Zap size={15} strokeWidth={2.2} />
						{t("mp3.btn.convert")}
					</button>
				</div>

			{/if}
		</div><!-- end .v-panel -->

	</div><!-- end .v-card -->

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
	/* ── Hidden file input ────────────────────────────────────────────────────── */
	.file-input { display: none; }

	/* ── Card layout: preview top + panel bottom ──────────────────────────────── */
	.v-card {
		background: var(--surf);
		border: 1px dashed #90b5d6;
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
		display: flex;
		flex-direction: column;
	}

	/* Preview zone — fixed height */
	.v-preview {
		height: 260px;
		flex-shrink: 0;
		position: relative;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: stretch;
		overflow: hidden;
		transition: background 0.15s;
	}
	.v-preview.over {
		background: color-mix(in srgb, var(--accent) 6%, transparent);
		border-color: var(--accent);
	}

	/* Audio result display inside preview */
	.v-audio-result {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		color: var(--text);
	}
	.v-audio-ico { color: var(--accent); }
	.v-audio-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.v-audio-size { font-size: 12px; color: var(--muted); }
	.v-audio-player {
		width: min(340px, 100%);
		margin-top: 4px;
	}

	/* Drop zone inside preview */
	.v-dz {
		width: 100%;
		height: 100%;
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
	.v-dz[aria-disabled="true"] { cursor: default; opacity: 0.6; }
	.v-dz h3 { margin: 6px 0 2px; font-size: 16px; font-weight: 600; }
	.v-dz .sub { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
	.v-dz .fmt-hint { font-size: 11px; color: var(--muted); margin: 6px 0 0; }
	.dz-ico { color: var(--accent); }

	/* Browse button inside drop zone */
	.btn-browse {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 14px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--surf);
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		pointer-events: none;
	}

	/* Video element fills preview */
	.v-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: #000;
		display: block;
	}

	/* Audio result display inside preview */
	.v-audio-result {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		color: var(--text);
	}
	.v-audio-ico { color: var(--accent); }
	.v-audio-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.v-audio-player {
		width: min(340px, 100%);
		margin-top: 4px;
	}

	/* Sample video button */
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
	@keyframes sample-spin {
		to { transform: rotate(360deg); }
	}

	/* Settings/result panel — fills remaining height */
	.v-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
	.v-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
		white-space: nowrap;
	}
	@media (min-width: 540px) {
		.v-row {
			flex-direction: row;
			align-items: center;
			gap: 12px;
		}
		.v-label {
			flex-shrink: 0;
			min-width: 130px;
		}
	}

	/* Bitrate option buttons */
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
	.v-opt:disabled { opacity: 0.5; cursor: default; }
	.v-opt-sub { font-size: 11px; font-weight: 400; color: var(--muted); }
	.v-opt--on .v-opt-sub { color: var(--accent); opacity: 0.7; }

	/* Progress bar row */
	.v-progress-row {
		padding: 12px 16px 8px;
		border-top: 1px solid var(--border);
	}
	.v-prog-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}
	.v-spinner-label { font-size: 12px; color: var(--muted); }
	.v-pct {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
	}
	.v-pbar {
		height: 4px;
		border-radius: 2px;
		background: var(--border);
		overflow: hidden;
	}
	.v-pfill {
		height: 100%;
		border-radius: 2px;
		background: var(--accent);
		transition: width 0.3s ease;
	}
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

	/* ── Result (inside .v-card) ── */
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
	.v-result-fmt {
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

	/* ── Privacy note ── */
	.pnote {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin-bottom: 24px;
	}
	.ni {
		color: var(--muted);
		flex-shrink: 0;
		margin-top: 1px;
		display: flex;
	}
	.pnote p {
		font-size: 12px;
		color: var(--muted);
		margin: 0;
		line-height: 1.5;
	}

	/* ── How-to section ── */
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
