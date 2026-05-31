<script lang="ts">
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import {
		AlertTriangle,
		CheckCircle2,
		Download,
		FileVideo2,
		Film,
		Folder,
		ShieldCheck,
		X,
		Zap,
	} from "lucide-svelte";
	import { VideoConverter, type VideoOutputFormat } from "$lib/utils/videoConverter";
	import RelatedTools from "$lib/components/RelatedTools.svelte";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";

	type OutputOption = {
		value: VideoOutputFormat;
		label: string;
		subKey?: string;
		sub?: string;
	};

	type Copy = {
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
		outputOptions?: OutputOption[];
		convertFailedError: string;
	};

	let {
		defaultOutput = "mp4" as VideoOutputFormat,
		fixedOutput = false,
		copy,
		sampleVideoUrl = "/file_example_WEBM_1920_3_7MB.webm",
		relatedTools = [] as { href: string; label: string; icon?: any }[],
		outputOptions = copy.outputOptions ?? [
			{ value: "mp4", label: "MP4", sub: "" },
			{ value: "webm", label: "WebM", sub: "" },
			{ value: "mov", label: "MOV", sub: "" },
			{ value: "mkv", label: "MKV", sub: "" },
		] as OutputOption[],
	} = $props<{
		defaultOutput?: VideoOutputFormat;
		fixedOutput?: boolean;
		copy: Copy;
		sampleVideoUrl?: string;
		relatedTools?: { href: string; label: string; icon?: any }[];
		outputOptions?: OutputOption[];
	}>();

	const converter = new VideoConverter();

	let inputEl: HTMLInputElement;
	let dragOver = $state(false);
	let file: File | null = $state(null);
	let videoSrc: string | null = $state(null);
	let selectedOutput = $state<VideoOutputFormat>(defaultOutput);
	let busy = $state(false);
	let sampleLoading = $state(false);
	let error = $state("");

	async function loadSampleVideo(event?: MouseEvent) {
		event?.stopPropagation();
		if (busy || sampleLoading) return;
		error = "";
		sampleLoading = true;
		try {
			const res = await fetch(sampleVideoUrl);
			if (!res.ok) throw new Error("sample_not_found");
			const blob = await res.blob();
			const filename = sampleVideoUrl.split("/").pop() || "sample-video";
			const f = new File([blob], filename, {
				type: blob.type || "video/" + (filename.split(".").pop() || "mp4"),
			});
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
		label: copy.convertingLabel,
	});

	let result: {
		href: string;
		download: string;
		original: string;
		converted: string;
		format: string;
	} | null = $state(null);

	function triggerInput() {
		if (!busy && !sampleLoading) inputEl.click();
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const picked = input.files?.[0];
		if (picked) loadFile(picked);
	}

	function looksLikeVideo(name: string) {
		return /\.(mp4|mov|m4v|avi|mkv|webm|wmv|flv|3gp|ts|m2ts|mts)$/i.test(name);
	}

	function loadFile(picked: File) {
		if (!picked.type.startsWith("video/") && !looksLikeVideo(picked.name)) {
			error = copy.selectVideoError;
			return;
		}
		if (videoSrc) URL.revokeObjectURL(videoSrc);
		videoSrc = URL.createObjectURL(picked);
		file = picked;
		error = "";
		progress = { show: false, pct: 0, label: copy.convertingLabel };
		clearResult();
	}

	function clearFile() {
		if (videoSrc) { URL.revokeObjectURL(videoSrc); videoSrc = null; }
		file = null;
		if (inputEl) inputEl.value = "";
		error = "";
		busy = false;
		sampleLoading = false;
		selectedOutput = defaultOutput;
		progress = { show: false, pct: 0, label: copy.convertingLabel };
		clearResult();
		converter.cancel();
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (!busy) dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

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

	function setProgress(pct: number, label?: string) {
		progress = { ...progress, pct, label: label ?? progress.label };
	}

	function outputFilename(inputName: string, output: VideoOutputFormat) {
		const base = inputName.replace(/\.[^.]+$/, "") || "converted-video";
		return `${base}.${output}`;
	}

	function startConvert() {
		if (!file) {
			error = copy.selectVideoError;
			return;
		}

		const currentFile = file;
		const currentOutput = selectedOutput;

		error = "";
		clearResult();
		busy = true;
		progress = { show: true, pct: 1, label: copy.loadingLabel };

		converter.convert({
			file: currentFile,
			outputFormat: currentOutput,
			onProgress: (pct) =>
				setProgress(pct, pct < 40 ? copy.loadingLabel : copy.convertingLabel),
			onSuccess: (blob, finalSize) => {
				const href = URL.createObjectURL(blob);
				result = {
					href,
					download: outputFilename(currentFile.name, currentOutput),
					original: fmtBytes(currentFile.size),
					converted: fmtBytes(finalSize),
					format: currentOutput.toUpperCase(),
				};
				setProgress(100, copy.doneLabel);
				busy = false;
			},
			onError: () => {
				error = copy.convertFailedError;
				busy = false;
				progress = { show: false, pct: 0, label: copy.convertingLabel };
			},
		});
	}

	function clearResult() {
		if (result?.href) URL.revokeObjectURL(result.href);
		result = null;
	}

	onDestroy(() => {
		converter.cancel();
		clearResult();
		if (videoSrc) URL.revokeObjectURL(videoSrc);
	});

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"][key] || key
	);
</script>

<input
	bind:this={inputEl}
	class="file-input"
	type="file"
	accept="video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.wmv,.flv,.3gp,.ts,.m2ts,.mts"
	onchange={handleFile}
	disabled={busy || sampleLoading}
/>

<!-- ── Unified tool card ── -->
<div class="v-card">

	<!-- ── Preview zone (top, fixed height) ── -->
	<div
		class={result ? "v-preview v-preview--result" : "v-preview v-preview--upload"}
		class:over={dragOver && !file}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
	>
		{#if result}
			<!-- Converted video preview -->
			<video class="v-video" src={result.href} controls playsinline></video>
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
				<div class="dz-ico"><Film size={55} strokeWidth={1.4} /></div>
				<h3>{copy.dropTitle}</h3>
				<p class="sub">{copy.dropSub}</p>
				<span class="btn-browse"><Folder size={14} strokeWidth={2} />{copy.browse}</span>

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

				<p class="fmt-hint">{@html copy.hint}</p>
			</div>
		{/if}
	</div>

	<!-- ── Settings / Result panel (bottom, always visible) ── -->
	<div class="v-panel">

		{#if result}
			<!-- ── Result state ── -->
			<div class="v-result-head">
				<div class="v-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
				<div>
					<div class="v-result-title">{copy.resultTitle}</div>
					<div class="v-result-stats">
						{result.original} → {result.converted}
						<span class="v-result-fmt">· {result.format}</span>
					</div>
				</div>
			</div>
			<div class="v-result-actions">
				<a class="v-btn-dl" href={result.href} download={result.download}>
					<Download size={15} strokeWidth={2.2} />
					{copy.download}
				</a>
				<button class="v-btn-new" type="button" onclick={clearFile}>
					<FileVideo2 size={13} strokeWidth={2} />
					{copy.newFile}
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
					<div class="v-file-ico"><Film size={18} strokeWidth={1.8} /></div>
					<div class="v-file-info">
						<div class="v-file-name">{file.name}</div>
						<div class="v-file-size">
							{fmtBytes(file.size)} · {file.type || copy.fileTypeFallback}
						</div>
					</div>
					<button class="v-remove" type="button" disabled={busy} onclick={clearFile} title={copy.remove}>
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>
			{/if}

			<!-- Output format row -->
			{#if !fixedOutput}
			<div class="v-row">
				<span class="v-label">{copy.formatLabel}</span>
				<div class="v-opts">
					{#each outputOptions as option}
						<button
							class="v-opt"
							class:v-opt--on={selectedOutput === option.value}
							type="button"
							disabled={busy}
							onclick={() => (selectedOutput = option.value)}
						>
							{option.label}
							<span class="v-opt-sub">{option.sub ?? option.subKey ?? ""}</span>
						</button>
					{/each}
				</div>
			</div>
			{/if}

			<!-- Submit + processing + error -->
			<div class="v-action" style="margin-top:auto;">
				{#if progress.show}
					<div class="v-progress-row">
						<div class="v-prog-top">
							<span class="v-spinner-label">{progress.label}</span>
							<span class="v-pct">{progress.pct}%</span>
						</div>
						<div class="v-pbar">
							<div class="v-pfill" style:width={`${progress.pct}%`}></div>
						</div>
					</div>
					<p class="v-warning">{copy.keepOpen}</p>
				{/if}
				{#if error}
					<div class="v-error">
						<AlertTriangle size={14} strokeWidth={2} />
						<span>{error}</span>
					</div>
				{/if}
				<button class="v-submit" type="button" disabled={busy || !file} onclick={startConvert}>
					<Zap size={15} strokeWidth={2.2} />
					{copy.convertButton}
				</button>
			</div>

		{/if}
	</div><!-- end .v-panel -->

</div><!-- end .v-card -->

<!-- Privacy note -->
<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>

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

	/* Preview zone — fixed height, shows drop zone / video */
	.v-preview {
		flex-shrink: 0;
		position: relative;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: stretch;
		overflow: hidden;
		transition: background 0.15s;
	}
	/* Upload/drop state — còn settings panel bên dưới */
	.v-preview--upload {
		height: 270px;
	}
	/* Result state — không có settings nữa, fill cao hơn */
	.v-preview--result {
		height: 420px;
	}
	@media (max-width: 599px) {
		.v-preview--upload { height: 250px; }
		.v-preview--result { height: 340px; }
	}
	.v-preview.over {
		background: color-mix(in srgb, var(--accent) 6%, transparent);
	}

	/* Video element fills preview */
	.v-video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		background: #000;
		display: block;
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

	/* Format option buttons */
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

	/* ── Result (inside .v-card) ────────────────────────────────────────────── */
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

	/* ── Sample video button ─────────────────────────────────────────────────── */
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

	/* ── Privacy note ────────────────────────────────────────────────────────── */
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
</style>
