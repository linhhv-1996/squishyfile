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
	};

	let {
		defaultOutput = "mp4" as VideoOutputFormat,
		fixedOutput = false,
		copy,
		outputOptions = copy.outputOptions ?? [
			{ value: "mp4", label: "MP4", sub: "Most compatible" },
			{ value: "webm", label: "WebM", sub: "For web video" },
			{ value: "mov", label: "MOV", sub: "Apple/QuickTime" },
			{ value: "mkv", label: "MKV", sub: "High quality" },
		] as OutputOption[],
	} = $props<{
		defaultOutput?: VideoOutputFormat;
		fixedOutput?: boolean;
		copy: Copy;
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
				setProgress(
					pct,
					pct < 40 ? copy.loadingLabel : copy.convertingLabel,
				),
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
			onError: (message) => {
				error = message;
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
</script>

{#if !file}
	<button
		class:over={dragOver}
		class="dz"
		type="button"
		onclick={triggerInput}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		disabled={busy}
	>
		<div class="dz-ico"><Film size={24} strokeWidth={1.5} /></div>
		<h3>{copy.dropTitle}</h3>
		<p class="sub">{copy.dropSub}</p>
		<span class="btn-browse">
			<Folder size={14} strokeWidth={2} />
			{copy.browse}
		</span>
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

{#if file}
	<div class="card">
		<div class="file-row">
			<div class="file-ico">
				<Film size={18} strokeWidth={1.8} />
			</div>

			<div class="file-info">
				<div class="file-name">{file.name}</div>
				<div class="file-sz">
					{fmtBytes(file.size)} · {file.type || copy.fileTypeFallback}
				</div>
			</div>

			<button
				class="btn-rm"
				type="button"
				disabled={busy}
				onclick={clearFile}
				title={copy.remove}
			>
				<X size={15} strokeWidth={2.5} />
			</button>
		</div>

		<div class="csec">
			<span class="slabel">{copy.formatLabel}</span>

			<div class="preset-grid video-format-grid">
				{#each outputOptions as option}
					<button
						class:on={selectedOutput === option.value}
						disabled={busy || fixedOutput}
						class="pc"
						type="button"
						onclick={() => (selectedOutput = option.value)}
					>
						<span class="lb">{option.label}</span>
						<span class="sb">{option.sub ?? option.subKey ?? ""}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class:show={progress.show} class="prog">
			<div class="ptop">
				<span>{progress.label}</span>
				<span class="pct">{progress.pct}%</span>
			</div>

			<div class="pbar">
				<div class="pfill" style:width={`${progress.pct}%`}></div>
			</div>

			<p class="keep-open-warning">
				{copy.keepOpen}
			</p>
		</div>

		<div class:show={Boolean(error)} class="errbar">
			<AlertTriangle size={15} strokeWidth={2} />
			<span>{error}</span>
		</div>

		<div class="action">
			<button
				class="btn-go"
				type="button"
				disabled={busy}
				onclick={startConvert}
			>
				<Zap size={16} strokeWidth={2.2} />
				{copy.convertButton}
			</button>
		</div>
	</div>
{/if}

<div class:show={Boolean(result)} class="res">
	<div class="res-head">
		<div class="res-ico">
			<CheckCircle2 size={16} strokeWidth={2} />
		</div>

		<div>
			<div class="res-title">{copy.resultTitle}</div>
			<div class="res-sub">{copy.resultSub}</div>
		</div>
	</div>

	<div class="stats">
		<div class="stat">
			<div class="sv">{result?.original ?? "—"}</div>
			<div class="sl">{copy.original}</div>
		</div>

		<div class="stat">
			<div class="sv">{result?.converted ?? "—"}</div>
			<div class="sl">{copy.converted}</div>
		</div>

		<div class="stat">
			<div class="sv g">{result?.format ?? selectedOutput.toUpperCase()}</div>
			<div class="sl">{copy.format}</div>
		</div>
	</div>

	<a
		class="btn-dl"
		href={result?.href ?? "#"}
		download={result?.download}
	>
		<Download size={15} strokeWidth={2.2} />
		{copy.download}
	</a>

	<button class="btn-new" type="button" onclick={clearFile}>
		<Film size={15} strokeWidth={2.2} />
		{copy.newFile}
	</button>
</div>

<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>
