<script lang="ts">
	import { onDestroy } from "svelte";
	import {
		AlertTriangle,
		CheckCircle2,
		Download,
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
		relatedTools?: { href: string; label: string; icon?: any }[];
		outputOptions?: OutputOption[];
	}>();

	const converter = new VideoConverter();

	let inputEl: HTMLInputElement;
	let dragOver = $state(false);
	let file: File | null = $state(null);
	let selectedOutput = $state<VideoOutputFormat>(defaultOutput);
	let busy = $state(false);
	let error = $state("");

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
		if (!busy) inputEl.click();
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
		file = picked;
		error = "";
		progress = { show: false, pct: 0, label: copy.convertingLabel };
		clearResult();
	}

	function clearFile() {
		file = null;
		if (inputEl) inputEl.value = "";
		error = "";
		busy = false;
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
	});

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"][key] || key
	);

</script>

<!-- Drop zone -->
{#if !file}
	<button
		class="dz dz--video"
		class:over={dragOver}
		type="button"
		onclick={triggerInput}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		disabled={busy}
	>
		<div class="dz-ico dz-ico--video"><Film size={24} strokeWidth={1.5} /></div>
		<h3>{copy.dropTitle}</h3>
		<p class="sub">{copy.dropSub}</p>
		<span class="btn-browse"><Folder size={14} strokeWidth={2} /> {copy.browse}</span>
		<p class="fmt-hint">{@html copy.hint}</p>
	</button>
{/if}

<input
	bind:this={inputEl}
	class="file-input"
	type="file"
	accept="video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.wmv,.flv,.3gp,.ts,.m2ts,.mts"
	onchange={handleFile}
	disabled={busy}
/>

<!-- ── File card ──────────────────────────────────────────────────────────── -->
{#if file && !result}
<div class="p-card">

	<!-- File row -->
	<div class="p-file-row">
		<div class="p-file-ico"><Film size={18} strokeWidth={1.8} /></div>
		<div class="p-file-info">
			<div class="p-file-name">{file.name}</div>
			<div class="p-file-size">{fmtBytes(file.size)} · {file.type || copy.fileTypeFallback}</div>
		</div>
		<button class="p-remove" type="button" disabled={busy} onclick={clearFile} title={copy.remove}>
			<X size={15} strokeWidth={2.5} />
		</button>
	</div>

	<!-- Output format -->
	{#if !fixedOutput}
	<div class="p-row">
		<span class="p-label">{copy.formatLabel}</span>
		<div class="p-opts p-opts--wrap">
			{#each outputOptions as option}
				<button
					class="p-opt"
					class:p-opt--on={selectedOutput === option.value}
					type="button"
					disabled={busy}
					onclick={() => (selectedOutput = option.value)}
				>
					{option.label}
					<span class="p-opt-sub">{option.sub ?? option.subKey ?? ""}</span>
				</button>
			{/each}
		</div>
	</div>
	{/if}

	<!-- Processing -->
	{#if progress.show}
		<div class="p-progress-row">
			<div class="p-prog-top">
				<span class="p-spinner-label">{progress.label}</span>
				<span class="p-pct">{progress.pct}%</span>
			</div>
			<div class="p-pbar">
				<div class="p-pfill" style:width={`${progress.pct}%`}></div>
			</div>
		</div>
		<p class="p-warning">{copy.keepOpen}</p>
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
			{copy.convertButton}
		</button>
	</div>

</div>
{/if}

<!-- ── Result card ─────────────────────────────────────────────────────────── -->
{#if result}
<div class="p-result">

	<!-- Header: icon + title + stats inline -->
	<div class="p-result-head">
		<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
		<div>
			<div class="p-result-title">{copy.resultTitle}</div>
			<div class="p-result-stats">
				{result.original} → {result.converted}
				<span class="p-result-fmt">· {result.format}</span>
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="p-result-actions">
		<a class="p-btn-dl" href={result.href} download={result.download}>
			<Download size={15} strokeWidth={2.2} />
			{copy.download}
		</a>
		<button class="p-btn-new" type="button" onclick={clearFile}>
			{copy.newFile}
		</button>
	</div>

	<!-- Related tools -->
	{#if relatedTools.length > 0}
		<RelatedTools label={t("relatedTools.label")} tools={relatedTools} />
	{/if}

</div>
{/if}

<!-- Privacy note -->
<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>

<style>
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

	/* Format option buttons */
	.p-opts {
		display: flex;
		gap: 6px;
	}
	.p-opts--wrap {
		flex-wrap: wrap;
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

	/* Progress bar row */
	.p-progress-row {
		padding: 12px 16px 8px;
		border-top: 1px solid var(--border);
	}
	.p-prog-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}
	.p-spinner-label { font-size: 12px; color: var(--muted); }
	.p-pct {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
	}
	.p-pbar {
		height: 4px;
		border-radius: 2px;
		background: var(--border);
		overflow: hidden;
	}
	.p-pfill {
		height: 100%;
		border-radius: 2px;
		background: var(--accent);
		transition: width 0.3s ease;
	}

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

	/* ── Result card ─────────────────────────────────────────────────────────── */
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
	.p-result-fmt {
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
</style>
