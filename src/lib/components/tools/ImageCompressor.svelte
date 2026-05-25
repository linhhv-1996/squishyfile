<script lang="ts">
	import { page } from "$app/stores";
	import { onDestroy } from "svelte";
	import { zipSync } from "fflate";
	import { ImagePlus, ShieldCheck, CheckCircle2, Download, X } from "lucide-svelte";

	import { translations } from "$lib/i18n/translations";
	import { languages } from "$lib/i18n/languages";

	type OutputFormat = "jpeg" | "png" | "webp" | "avif";

	type Copy = {
		dropTitle: string;
		dropSub: string;
		browse: string;
		hint: string;

		formatLabel: string;
		qualityLabel: string;
		maxWidthLabel: string;

		compressButton: string;
		compressingLabel: string;
		doneLabel: string;
		keepOpen: string;
		selectImageError: string;

		resultTitle: string;
		resultSub: string;
		download: string;
		downloadAll: string;
		newFile: string;

		original: string;
		compressed: string;
		saved: string;
		format: string;

		privacyNote: string;
		fileTypeFallback: string;
		remove: string;
		addLabel: string;
	};

	type ImageJob = {
		id: string;
		file: File;
		name: string;
		type: string;
		size: number;
		previewUrl: string;
		status: "ready" | "compressing" | "done" | "error";
		progress: number;
		outputBlob: Blob | null;
		outputUrl: string;
		outputSize: number;
		error: string;
	};

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

	let { copy }: { copy: Copy } = $props();

	let fileInput: HTMLInputElement;

	let jobs = $state<ImageJob[]>([]);
	let error = $state("");
	let isOver = $state(false);

	let outputFormat = $state<OutputFormat>("webp");
	let quality = $state(75);
	let width = $state<number | "">("");

	let isCompressing = $derived(jobs.some((job) => job.status === "compressing"));
	let hasJobs = $derived(jobs.length > 0);
	let doneJobs = $derived(jobs.filter((job) => job.status === "done" && job.outputBlob));
	let doneCount = $derived(doneJobs.length);
	let allDone = $derived(doneCount > 0 && doneCount === jobs.length);

	let totalOriginalSize = $derived(jobs.reduce((sum, job) => sum + job.size, 0));
	let totalOutputSize = $derived(jobs.reduce((sum, job) => sum + job.outputSize, 0));
	let totalSavedPercent = $derived(
		totalOriginalSize && totalOutputSize
			? Math.max(0, Math.round((1 - totalOutputSize / totalOriginalSize) * 100))
			: 0,
	);

	const formats: { value: OutputFormat; label: string }[] = [
		{ value: "jpeg", label: "JPG" },
		{ value: "png", label: "PNG" },
		{ value: "webp", label: "WebP" },
		{ value: "avif", label: "AVIF" },
	];

	const qualityPresets = [40, 60, 75, 85, 95];

	function formatBytes(bytes: number) {
		if (!bytes) return "0 B";
		const units = ["B", "KB", "MB", "GB"];
		const index = Math.floor(Math.log(bytes) / Math.log(1024));
		const value = bytes / Math.pow(1024, index);
		return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
	}

	function getOutputExtension(format: OutputFormat) {
		return format === "jpeg" ? "jpg" : format;
	}

	function getOutputName(job: ImageJob) {
		return `compressed-${job.name.replace(/\.[^.]+$/, "")}.${getOutputExtension(outputFormat)}`;
	}

	function getSavedPercent(job: ImageJob) {
		if (!job.outputSize) return 0;
		return Math.max(0, Math.round((1 - job.outputSize / job.size) * 100));
	}

	function resetJobResult(job: ImageJob) {
		if (job.outputUrl) URL.revokeObjectURL(job.outputUrl);
		job.status = "ready";
		job.progress = 0;
		job.outputBlob = null;
		job.outputUrl = "";
		job.outputSize = 0;
		job.error = "";
	}

	function resetAllResults() {
		jobs = jobs.map((job) => {
			resetJobResult(job);
			return job;
		});
	}

	function addFiles(fileList: FileList | File[]) {
		const images = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
		if (!images.length) { error = copy.selectImageError; return; }
		error = "";
		const nextJobs: ImageJob[] = images.map((file) => ({
			id: crypto.randomUUID(),
			file,
			name: file.name,
			type: file.type || copy.fileTypeFallback,
			size: file.size,
			previewUrl: URL.createObjectURL(file),
			status: "ready",
			progress: 0,
			outputBlob: null,
			outputUrl: "",
			outputSize: 0,
			error: "",
		}));
		jobs = [...jobs, ...nextJobs];
	}

	function onFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) addFiles(target.files);
		target.value = "";
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		isOver = false;
		if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
	}

	function removeJob(id: string) {
		const job = jobs.find((item) => item.id === id);
		if (job?.previewUrl) URL.revokeObjectURL(job.previewUrl);
		if (job?.outputUrl) URL.revokeObjectURL(job.outputUrl);
		jobs = jobs.filter((item) => item.id !== id);
	}

	function clearJobs() {
		for (const job of jobs) {
			if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
			if (job.outputUrl) URL.revokeObjectURL(job.outputUrl);
		}
		jobs = [];
		error = "";
	}

	function onOptionChange() {
		if (!jobs.length) return;
		resetAllResults();
	}

	type WorkerPayload = {
		file: File;
		outputFormat: OutputFormat;
		quality: number;
		width: number | null;
	};

	type WorkerSuccess = { id: number; ok: true; buffer: ArrayBuffer; mimeType: string };
	type WorkerFailure = { id: number; ok: false; error: string };
	type WorkerProgress = { id: number; progress: number };
	type WorkerMessage = WorkerSuccess | WorkerFailure | WorkerProgress;

	let worker: Worker | null = null;
	let workerRequestId = 0;
	let pendingWorkerJobs = new Map<
		number,
		{
			resolve: (value: WorkerSuccess) => void;
			reject: (reason: Error) => void;
			onProgress: (progress: number) => void;
		}
	>();

	function getWorker() {
		if (typeof window === "undefined") throw new Error(t("common.browserOnlyError"));
		if (worker) return worker;
		worker = new Worker(new URL("../../workers/image-compress.worker.ts", import.meta.url), { type: "module" });
		worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
			const message = event.data;
			const pending = pendingWorkerJobs.get(message.id);
			if (!pending) return;
			if ("progress" in message) { pending.onProgress(message.progress); return; }
			pendingWorkerJobs.delete(message.id);
			if (message.ok) pending.resolve(message);
			else pending.reject(new Error(message.error));
		};
		worker.onerror = (event) => {
			const err = new Error(event.message || t("common.workerFailedError"));
			for (const pending of pendingWorkerJobs.values()) pending.reject(err);
			pendingWorkerJobs.clear();
			worker?.terminate();
			worker = null;
		};
		return worker;
	}

	function runWorker(payload: WorkerPayload, onProgress: (progress: number) => void) {
		const activeWorker = getWorker();
		const id = ++workerRequestId;
		return new Promise<WorkerSuccess>((resolve, reject) => {
			pendingWorkerJobs.set(id, { resolve, reject, onProgress });
			activeWorker.postMessage({ id, type: "compress", payload });
		});
	}

	async function compressOne(job: ImageJob) {
		resetJobResult(job);
		job.status = "compressing";
		job.progress = 3;
		jobs = [...jobs];
		try {
			const result = await runWorker(
				{
					file: job.file,
					outputFormat,
					quality,
					width: typeof width === "number" && width > 0 ? width : null,
				},
				(progress) => {
					job.progress = Math.max(job.progress, Math.min(99, progress));
					jobs = [...jobs];
				},
			);
			const outputBlob = new Blob([result.buffer], { type: result.mimeType });
			job.outputBlob = outputBlob;
			job.outputUrl = URL.createObjectURL(outputBlob);
			job.outputSize = outputBlob.size;
			job.progress = 100;
			job.status = "done";
			job.error = "";
		} catch (err) {
			job.status = "error";
			job.error = err instanceof Error ? err.message : copy.selectImageError;
		}
		jobs = [...jobs];
	}

	async function compressAll() {
		if (!jobs.length) { error = copy.selectImageError; return; }
		error = "";
		for (const job of jobs) { await compressOne(job); }
	}

	onDestroy(() => {
		for (const job of jobs) {
			if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
			if (job.outputUrl) URL.revokeObjectURL(job.outputUrl);
		}
		worker?.terminate();
		worker = null;
		pendingWorkerJobs.clear();
	});

	async function downloadAll() {
		const entries: Record<string, Uint8Array> = {};
		for (const job of doneJobs) {
			if (!job.outputBlob) continue;
			const buffer = await job.outputBlob.arrayBuffer();
			entries[getOutputName(job)] = new Uint8Array(buffer);
		}
		const zipped = zipSync(entries, { level: 6 });
		const blob = new Blob([zipped], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "compressed-images.zip";
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<input
	bind:this={fileInput}
	class="file-input"
	type="file"
	accept="image/jpeg,image/png,image/webp,image/avif"
	multiple
	onchange={onFileChange}
/>

<!-- ── Drop zone ─────────────────────────────────────────────────────────────── -->
{#if !hasJobs}
	<section class="empty-layout">
		<button
			type="button"
			class:over={isOver}
			class="dz dz--img"
			ondragenter={(e) => { e.preventDefault(); isOver = true; }}
			ondragover={(e) => e.preventDefault()}
			ondragleave={() => { isOver = false; }}
			ondrop={onDrop}
			onclick={() => fileInput?.click()}
		>
			<div class="dz-ico dz-ico--img"><ImagePlus size={24} strokeWidth={1.8} /></div>
			<h3>{copy.dropTitle}</h3>
			<p class="sub">{copy.dropSub}</p>
			<span class="btn-browse"><ImagePlus size={14} strokeWidth={2} /> {copy.browse}</span>
			<p class="fmt-hint">{copy.hint}</p>
		</button>
	</section>
{/if}

<!-- ── File card ─────────────────────────────────────────────────────────────── -->
{#if hasJobs}
	<div class="p-card">

		<!-- Toolbar row: add-more + summary + clear -->
		<div class="p-file-row">
			<button
				type="button"
				class="p-add-btn"
				class:over={isOver}
				disabled={isCompressing}
				title={copy.addLabel}
				ondragenter={(e) => { e.preventDefault(); isOver = true; }}
				ondragover={(e) => e.preventDefault()}
				ondragleave={() => { isOver = false; }}
				ondrop={onDrop}
				onclick={() => fileInput?.click()}
			>
				<ImagePlus size={15} strokeWidth={2} />
			</button>
			<div class="p-file-info">
				<div class="p-file-name">
					{jobs.length} {jobs.length === 1 ? t("common.image") : t("common.images")}
				</div>
				<div class="p-file-size">
					{#if doneCount}
						{doneCount}/{jobs.length} {copy.doneLabel} · {formatBytes(totalOriginalSize)} → {formatBytes(totalOutputSize)}
					{:else}
						{formatBytes(totalOriginalSize)} {t("common.selected")}
					{/if}
				</div>
			</div>
			<button class="p-remove" type="button" onclick={clearJobs} disabled={isCompressing} title="Remove all">
				<X size={15} strokeWidth={2.5} />
			</button>
		</div>

		<!-- Error bar -->
		{#if error}
			<div class="p-error">
				<span class="p-error-badge">!</span>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Image gallery grid -->
		<div class="p-gallery">
			{#each jobs as job (job.id)}
				<article
					class="p-tile"
					class:p-tile--done={job.status === "done"}
					class:p-tile--error={job.status === "error"}
					class:p-tile--busy={job.status === "compressing"}
				>
					<div class="p-tile-preview">
						<img src={job.previewUrl} alt={job.name} />

						<button
							type="button"
							class="p-tile-remove"
							aria-label={copy.remove}
							disabled={job.status === "compressing"}
							onclick={() => removeJob(job.id)}
						>×</button>

						{#if job.status === "compressing"}
							<div class="p-tile-overlay">
								<div class="p-tile-spin"></div>
								<div class="p-tile-pbar">
									<div class="p-tile-pfill" style="width:{job.progress}%"></div>
								</div>
							</div>
						{/if}

						{#if job.status === "done"}
							<a class="p-tile-dl-hover" href={job.outputUrl} download={getOutputName(job)}>
								<Download size={13} strokeWidth={2.5} />
								{copy.download}
							</a>
						{/if}
					</div>

					<div class="p-tile-info">
						<div class="p-tile-name">{job.name}</div>
						{#if job.status === "done"}
							<div class="p-tile-meta">
								<span>{formatBytes(job.size)} → {formatBytes(job.outputSize)}</span>
								<strong>−{getSavedPercent(job)}%</strong>
							</div>
						{:else if job.status === "error"}
							<div class="p-tile-err">{job.error}</div>
						{:else}
							<div class="p-tile-meta">
								<span>{formatBytes(job.size)}</span>
								<strong>{outputFormat.toUpperCase()}</strong>
							</div>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		<!-- Format -->
		<div class="p-row">
			<span class="p-label">{copy.formatLabel}</span>
			<div class="p-opts">
				{#each formats as item}
					<button
						type="button"
						class="p-opt"
						class:p-opt--on={outputFormat === item.value}
						disabled={isCompressing}
						onclick={() => { outputFormat = item.value; onOptionChange(); }}
					>{item.label}</button>
				{/each}
			</div>
		</div>

		<!-- Quality -->
		<div class="p-row">
			<span class="p-label">{copy.qualityLabel}</span>
			<div class="p-opts">
				{#each qualityPresets as value}
					<button
						type="button"
						class="p-opt"
						class:p-opt--on={quality === value}
						disabled={isCompressing}
						onclick={() => { quality = value; onOptionChange(); }}
					>{value}%</button>
				{/each}
			</div>
		</div>

		<!-- Max width -->
		<label class="p-row">
			<span class="p-label">{copy.maxWidthLabel}</span>
			<span class="p-width-ctrl">
				<input
					type="number"
					min="1"
					bind:value={width}
					disabled={isCompressing}
					oninput={onOptionChange}
					placeholder="Original"
				/>
				<span class="p-width-unit">px</span>
			</span>
		</label>

		<!-- Processing indicator -->
		{#if isCompressing}
			<div class="p-spinner-row">
				<div class="p-spinner"></div>
				<span class="p-spinner-label">
					{copy.compressingLabel}
					{#if doneCount < jobs.length}· {doneCount}/{jobs.length}{/if}
				</span>
			</div>
			<p class="p-warning">{copy.keepOpen}</p>
		{/if}

		<!-- Action: compress / download-all -->
		<div class="p-action">
			{#if allDone}
				<!-- Results inline — show download + stats + reset -->
				<div class="p-done-bar">
					<div class="p-done-info">
						<span class="p-done-ico"><CheckCircle2 size={13} strokeWidth={2.2} /></span>
						<span class="p-done-stats">
							{formatBytes(totalOriginalSize)} → {formatBytes(totalOutputSize)}
							<strong>−{totalSavedPercent}%</strong>
						</span>
					</div>
					{#if jobs.length === 1}
						<a class="p-submit" href={doneJobs[0]?.outputUrl} download={doneJobs[0] ? getOutputName(doneJobs[0]) : ""}>
							<Download size={15} strokeWidth={2.2} />
							{copy.download}
						</a>
					{:else}
						<button class="p-submit" type="button" onclick={downloadAll}>
							<Download size={15} strokeWidth={2.2} />
							{copy.downloadAll}
						</button>
					{/if}
				</div>
				<button class="p-btn-new" type="button" onclick={clearJobs}>{copy.newFile}</button>
			{:else}
				<button class="p-submit" type="button" disabled={isCompressing} onclick={compressAll}>
					{#if isCompressing}
						<span class="p-dots">
							<span class="p-dot"></span>
							<span class="p-dot"></span>
							<span class="p-dot"></span>
						</span>
					{:else}
						<ImagePlus size={15} strokeWidth={2.2} />
					{/if}
					{isCompressing ? copy.compressingLabel : copy.compressButton}
				</button>
			{/if}
		</div>

	</div>
{/if}

<!-- Privacy note -->
<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>

<style>
	/* ─────────────────────────────────────────────────────────────────────────────
	   ImageCompressor — styled to match the PDF/Video compressor design language.
	   Uses CSS vars: --text, --muted, --border, --accent, --surf, --bg, --r, --rsm
	───────────────────────────────────────────────────────────────────────────── */

	/* ── File card ───────────────────────────────────────────────────────────── */
	.p-card {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* Toolbar / file row */
	.p-file-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}

	/* Add-more button — icon-only square, không bị vỡ mobile */
	.p-add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px dashed var(--border);
		background: var(--bg);
		color: var(--accent);
		cursor: pointer;
		flex-shrink: 0;
		transition: border-color 0.15s, background 0.15s;
	}
	.p-add-btn:hover, .p-add-btn.over { border-color: var(--accent); background: var(--surf); }
	.p-add-btn:disabled { opacity: 0.5; cursor: default; }

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

	/* ── Gallery grid ────────────────────────────────────────────────────────── */
	.p-gallery {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
		padding: 12px;
		max-height: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		border-bottom: 1px solid var(--border);
	}

	.p-tile {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--rsm, 6px);
		background: var(--bg);
		transition: border-color 0.15s, transform 0.15s;
	}
	.p-tile:hover { transform: translateY(-1px); }
	.p-tile--done { border-color: color-mix(in srgb, #3daa6a 30%, var(--border)); }
	.p-tile--error { border-color: color-mix(in srgb, #e05252 30%, var(--border)); }

	.p-tile-preview {
		position: relative;
		aspect-ratio: 4 / 3;
		background: var(--surf);
		overflow: hidden;
	}
	.p-tile-preview img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.p-tile--done .p-tile-preview img { transition: filter 0.15s; }
	.p-tile--done:hover .p-tile-preview img { filter: brightness(0.68); }
	.p-tile--busy .p-tile-preview img { filter: brightness(0.5); }

	.p-tile-remove {
		position: absolute;
		top: 5px;
		right: 5px;
		display: grid;
		place-items: center;
		width: 22px; height: 22px;
		border: 1px solid rgba(255,255,255,0.35);
		border-radius: 6px;
		background: rgba(0,0,0,0.4);
		color: #fff;
		cursor: pointer;
		font-size: 15px;
		line-height: 1;
		transition: background 0.12s;
	}
	.p-tile-remove:hover { background: rgba(185,28,28,0.78); border-color: transparent; }
	.p-tile-remove:disabled { opacity: 0.4; cursor: default; }

	.p-tile-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.48);
		backdrop-filter: blur(2px);
	}
	.p-tile-spin {
		width: 20px; height: 20px;
		border: 2px solid rgba(255,255,255,0.2);
		border-top-color: #fff;
		border-radius: 50%;
		animation: p-spin 0.65s linear infinite;
	}
	.p-tile-pbar {
		position: absolute;
		left: 0; right: 0; bottom: 0;
		height: 3px;
		background: rgba(255,255,255,0.14);
	}
	.p-tile-pfill {
		height: 100%;
		background: #fff;
		transition: width 0.2s ease;
	}

	.p-tile-dl-hover {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 4px;
		background: rgba(0,0,0,0.52);
		backdrop-filter: blur(2px);
		color: #fff;
		text-decoration: none;
		font-size: 11px;
		font-weight: 700;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.p-tile:hover .p-tile-dl-hover { opacity: 1; }

	.p-tile-info { padding: 6px 7px 7px; }
	.p-tile-name {
		color: var(--text);
		font-size: 11px;
		font-weight: 600;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.p-tile-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
		margin-top: 3px;
		color: var(--muted);
		font-size: 10px;
	}
	.p-tile-meta span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.p-tile-meta strong {
		color: #3daa6a;
		font-weight: 600;
		flex: 0 0 auto;
	}
	.p-tile-err {
		margin-top: 3px;
		color: #e05252;
		font-size: 10px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Option rows ─────────────────────────────────────────────────────────── */
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

	/* Toggle option buttons */
	.p-opts { display: flex; flex-wrap: wrap; gap: 6px; }
	.p-opt {
		display: inline-flex;
		align-items: center;
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

	/* Max width input */
	.p-width-ctrl {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		width: 160px;
		height: 32px;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		font-size: 13px;
		transition: border-color 0.15s;
	}
	.p-width-ctrl:focus-within { border-color: var(--accent); }
	.p-width-ctrl input {
		min-width: 0;
		width: 100%;
		height: 100%;
		padding: 0 10px;
		border: 0;
		background: transparent;
		color: var(--text);
		font: inherit;
		font-size: 13px;
		outline: none;
	}
	.p-width-ctrl input::placeholder { color: var(--muted); }
	.p-width-unit {
		padding: 0 10px;
		color: var(--muted);
		font-size: 11px;
		border-left: 1px solid var(--border);
		height: 100%;
		display: flex;
		align-items: center;
	}

	/* ── Processing ──────────────────────────────────────────────────────────── */
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

	/* Animated dots in button */
	.p-dots { display: inline-flex; align-items: center; gap: 3px; margin-right: 4px; }
	.p-dot {
		display: inline-block;
		width: 3px; height: 3px;
		border-radius: 50%;
		background: currentColor;
		animation: p-dotpulse 1.2s ease-in-out infinite;
	}
	.p-dot:nth-child(2) { animation-delay: 0.2s; }
	.p-dot:nth-child(3) { animation-delay: 0.4s; }
	@keyframes p-dotpulse {
		0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
		40% { opacity: 1; transform: scale(1); }
	}

	/* ── Error bar ───────────────────────────────────────────────────────────── */
	.p-error {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 16px;
		font-size: 12.5px;
		color: #e05252;
		border-bottom: 1px solid var(--border);
	}
	.p-error-badge {
		display: grid;
		place-items: center;
		width: 16px; height: 16px;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 10px;
		font-weight: 800;
		flex: 0 0 auto;
	}

	/* Submit button */
	.p-action {
		padding: 12px 16px;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 8px;
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
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.p-submit:hover { opacity: 0.88; }
	.p-submit:disabled { opacity: 0.5; cursor: default; }

	/* Done state — inline within the same card */
	.p-done-bar {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.p-done-info {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--muted);
	}
	.p-done-ico { color: #3daa6a; display: flex; flex-shrink: 0; }
	.p-done-stats strong { color: #3daa6a; font-weight: 600; margin-left: 4px; }

	.p-btn-new {
		background: none;
		border: none;
		padding: 0;
		font-size: 12px;
		color: var(--muted);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-align: center;
		transition: color 0.15s;
	}
	.p-btn-new:hover { color: var(--text); }

	/* ── Responsive ──────────────────────────────────────────────────────────── */
	@media (max-width: 680px) {
		.p-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 8px; }
	}
	@media (max-width: 420px) {
		.p-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}
</style>
