<script lang="ts">
	import { page } from "$app/stores";
	import { onDestroy } from "svelte";
	import { zipSync } from "fflate";
    import { ImagePlus, ShieldCheck } from "lucide-svelte";

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

		if (!images.length) {
			error = copy.selectImageError;
			return;
		}

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

			if ("progress" in message) {
				pending.onProgress(message.progress);
				return;
			}

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

			activeWorker.postMessage({
				id,
				type: "compress",
				payload,
			});
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
		if (!jobs.length) {
			error = copy.selectImageError;
			return;
		}

		error = "";

		for (const job of jobs) {
			await compressOne(job);
		}
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

{#if !hasJobs}
	<section class="empty-layout">
		<button
			type="button"
			class:over={isOver}
			class="dz"
			ondragenter={(event) => {
				event.preventDefault();
				isOver = true;
			}}
			ondragover={(event) => event.preventDefault()}
			ondragleave={() => {
				isOver = false;
			}}
			ondrop={onDrop}
			onclick={() => fileInput?.click()}
		>
			<div class="dz-ico" aria-hidden="true"><ImagePlus size={24} strokeWidth={1.8} /></div>
			<h3>{copy.dropTitle}</h3>
			<p class="sub">{copy.dropSub}</p>
			<span class="btn-browse">{copy.browse}</span>
			<div class="fmt-hint">{copy.hint}</div>
		</button>
	</section>
{/if}

{#if hasJobs}
	<section class="compressor">
		<header class="toolbar">
			<div class="toolbar-left">
				<button
					type="button"
					class:over={isOver}
					class="add-file"
					ondragenter={(event) => {
						event.preventDefault();
						isOver = true;
					}}
					ondragover={(event) => event.preventDefault()}
					ondragleave={() => {
						isOver = false;
					}}
					ondrop={onDrop}
					onclick={() => fileInput?.click()}
				>
					<span>+</span>
				</button>

				<div class="summary">
					<strong>
						{jobs.length} {jobs.length === 1 ? t("common.image") : t("common.images")}
					</strong>
					<small>
						{#if doneCount}
							{doneCount}/{jobs.length} {copy.doneLabel} · {formatBytes(totalOriginalSize)} → {formatBytes(totalOutputSize)}
						{:else}
							 {formatBytes(totalOriginalSize)} {t("common.selected")}
						{/if}
					</small>
				</div>
			</div>

			<button type="button" class="clear" onclick={clearJobs}>{copy.remove}</button>
		</header>

		<div class:show={Boolean(error)} class="errbar"><span>!</span><span>{error}</span></div>

		<section class="queue" aria-label={t("common.selectedImages")}>
			<div class="gallery">
				{#each jobs as job (job.id)}
					<article class:done={job.status === "done"} class:error={job.status === "error"} class:busy={job.status === "compressing"} class="tile">
						<div class="preview">
							<img src={job.previewUrl} alt={job.name} />

							<button
								type="button"
								class="remove"
								aria-label={copy.remove}
								disabled={job.status === "compressing"}
								onclick={() => removeJob(job.id)}
							>×</button>

							{#if job.status === "compressing"}
								<div class="overlay">
									<div class="spin"></div>
									<div class="pbar"><div class="pfill" style="width:{job.progress}%"></div></div>
								</div>
							{/if}

							{#if job.status === "done"}
								<a class="download-one" href={job.outputUrl} download={getOutputName(job)}>{copy.download}</a>
							{/if}
						</div>

						<div class="info">
							<div class="name">{job.name}</div>
							{#if job.status === "done"}
								<div class="meta"><span>{formatBytes(job.size)} → {formatBytes(job.outputSize)}</span><strong>−{getSavedPercent(job)}%</strong></div>
							{:else if job.status === "error"}
								<div class="err">{job.error}</div>
							{:else}
								<div class="meta"><span>{formatBytes(job.size)}</span><strong>{outputFormat.toUpperCase()}</strong></div>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		</section>

		<aside class="settings-panel" aria-label={t("common.compressionSettings")}>
			<div class="dock-row format-row">
				<span class="dock-label">{copy.formatLabel}</span>
				<div class="format-tags" role="group" aria-label={copy.formatLabel}>
					{#each formats as item}
						<button
							type="button"
							class:active={outputFormat === item.value}
							disabled={isCompressing}
							onclick={() => {
								outputFormat = item.value;
								onOptionChange();
							}}
						>
							{item.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="dock-row quality-row">
				<span class="dock-label">{copy.qualityLabel}</span>
				<div class="quality-tags" role="group" aria-label={copy.qualityLabel}>
					{#each qualityPresets as value}
						<button
							type="button"
							class:active={quality === value}
							disabled={isCompressing}
							onclick={() => {
								quality = value;
								onOptionChange();
							}}
						>
							{value}%
						</button>
					{/each}
				</div>
			</div>

			<label class="dock-row width-row">
				<span class="dock-label">{copy.maxWidthLabel}</span>
				<span class="width-control">
					<input
						type="number"
						min="1"
						bind:value={width}
						disabled={isCompressing}
						oninput={onOptionChange}
					/>
					<span>px</span>
				</span>
			</label>

			<div class="settings-actions">
				<button type="button" class="action-btn primary" disabled={isCompressing} onclick={compressAll}>
					{#if isCompressing}
						<span class="btn-loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
					{/if}
					{isCompressing ? copy.compressingLabel : copy.compressButton}
				</button>

				<button type="button" class="action-btn secondary download-all" disabled={doneCount < jobs.length} onclick={downloadAll}>
					{copy.downloadAll}
					{#if totalSavedPercent}<span>−{totalSavedPercent}%</span>{/if}
				</button>
			</div>
		</aside>
	</section>
{/if}

<div class="pnote">
    <span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
    <p>{@html copy.privacyNote}</p>
</div>


<style>
	.compressor {
		display: flex;
		flex-direction: column;
		/* height: min(760px, 78vh); */
		min-height: 0;
		margin-bottom: 14px;
		border: 1px solid var(--border);
		border-radius: var(--r);
		background: var(--surf);
		overflow: hidden;
	}

	.toolbar {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border);
		background: var(--surf);
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.add-file {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 1px dashed var(--border-hover, var(--border));
		border-radius: var(--rsm);
		background: var(--surf2);
		color: var(--accent);
		cursor: pointer;
		flex: 0 0 auto;
	}

	.add-file span {
		font-size: 23px;
		line-height: 1;
		transform: translateY(-1px);
	}

	.add-file:hover,
	.add-file.over {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 7%, var(--surf));
	}

	.summary { min-width: 0; }
	.summary strong {
		display: block;
		color: var(--text);
		font-size: 14px;
		font-weight: 650;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.summary small {
		display: block;
		margin-top: 2px;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.clear {
		border: 0;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		padding: 7px 0;
		white-space: nowrap;
	}
	.clear:hover { color: var(--red); }

	.queue {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
	}

	.gallery {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		align-content: start;
		gap: 10px;
		padding: 12px;
        max-height: 240px;
	}

	.settings-panel {
		flex: 0 0 auto;
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		padding: 12px;
		border-top: 1px solid var(--border);
		background: var(--surf);
        margin-top: 10px;
	}

	.dock-row {
		display: grid;
		grid-template-columns: 160px minmax(0, 1fr);
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.dock-label {
		min-width: 0;
		color: var(--muted);
		font-size: 12px;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.format-tags button,
	.quality-tags button,
	.width-control {
		width: 100%;
		height: 38px;
		border: 1px solid var(--border);
		border-radius: var(--rsm);
		background: var(--surf2);
		color: var(--text);
		font: inherit;
		font-size: 13px;
	}

	.format-tags {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 7px;
		min-width: 0;
	}

	.quality-tags {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 7px;
		min-width: 0;
	}

	.format-tags button,
	.quality-tags button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		height: 38px;
		padding: 0 8px;
		border: 1px solid var(--border);
		border-radius: var(--rsm);
		background: var(--surf2);
		color: var(--text);
		font: inherit;
		font-size: 12px;
		font-weight: 800;
        font-weight: 600;
		line-height: 1;
		cursor: pointer;
		white-space: nowrap;
		transition: border-color .12s, background .12s, color .12s, transform .12s, opacity .12s;
	}

	.format-tags button:hover:not(:disabled),
	.quality-tags button:hover:not(:disabled) {
		border-color: var(--border-hover, var(--accent));
		transform: translateY(-1px);
	}

	.format-tags button.active,
	.quality-tags button.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 9%, var(--surf));
		box-shadow: inset 0 0 0 1px var(--accent);
		color: var(--accent);
	}

	.format-tags button:disabled,
	.quality-tags button:disabled {
		opacity: .5;
		cursor: not-allowed;
	}

	.width-control:focus-within {
		border-color: var(--accent);
	}

	.width-control {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		overflow: hidden;
	}

	.width-control input {
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

	.width-control input::placeholder { color: var(--muted); }

	.width-control span {
		padding: 0 10px;
		color: var(--muted);
		font-size: 11px;
	}

	.settings-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		align-self: stretch;
		min-width: 0;
		width: 100%;
		padding-top: 2px;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		width: 100%;
		height: 42px;
		min-height: 42px;
		padding: 0 14px;
		border: 1px solid var(--border);
		border-radius: var(--rsm);
		font: inherit;
		font-size: 12px;
		font-weight: 750;
		line-height: 1;
		cursor: pointer;
		white-space: nowrap;
		transition: border-color .12s, background .12s, color .12s, transform .12s, opacity .12s;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.action-btn:disabled {
		opacity: .42;
		cursor: not-allowed;
	}

	.action-btn.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: white;
	}

	.action-btn.primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 88%, black);
	}

	.action-btn.secondary {
		border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
		background: color-mix(in srgb, var(--accent) 7%, transparent);
		color: var(--accent);
	}

	.action-btn.secondary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 11%, transparent);
	}

	.download-all span {
		color: currentColor;
		font-size: 11px;
		font-weight: 700;
		opacity: .78;
	}

	.tile {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r);
		background: var(--surf);
		transition: border-color .15s, transform .15s;
	}

	.tile:hover { transform: translateY(-1px); }
	.tile.done { border-color: color-mix(in srgb, var(--green) 35%, var(--border)); }
	.tile.error { border-color: color-mix(in srgb, var(--red) 35%, var(--border)); }

	.preview {
		position: relative;
		aspect-ratio: 4 / 3;
		background: var(--surf2);
		border-bottom: 1px solid var(--border);
		overflow: hidden;
	}

	.preview img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: fill;
	}

	.tile.done .preview img { transition: filter .15s; }
	.tile.done:hover .preview img { filter: brightness(.68); }
	.tile.busy .preview img { filter: brightness(.5); }

	.remove {
		position: absolute;
		top: 6px;
		right: 6px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1px solid rgba(255,255,255,.38);
		border-radius: 8px;
		background: rgba(0,0,0,.42);
		color: #fff;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
	}

	.remove:hover { background: rgba(185,28,28,.78); border-color: transparent; }

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,.5);
		backdrop-filter: blur(2px);
	}

	.spin {
		width: 22px;
		height: 22px;
		border: 2px solid rgba(255,255,255,.22);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin .65s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.pbar {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		background: rgba(255,255,255,.16);
	}

	.pfill { height: 100%; background: #fff; transition: width .2s ease; }

	.download-one {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(0,0,0,.55);
		backdrop-filter: blur(2px);
		color: #fff;
		text-decoration: none;
		font-size: 12px;
		font-weight: 800;
		opacity: 0;
		transition: opacity .15s;
	}

	.tile:hover .download-one { opacity: 1; }

	.info { padding: 7px 8px 8px; }

	.name {
		color: var(--text);
		font-size: 12px;
		font-weight: 750;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-top: 4px;
		color: var(--muted);
		font-size: 11px;
	}

	.meta span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta strong { color: var(--green); font-weight: 800; flex: 0 0 auto; }

	.err {
		margin-top: 4px;
		color: var(--red);
		font-size: 11px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.errbar {
		flex: 0 0 auto;
		display: none;
		align-items: center;
		gap: 7px;
		padding: 8px 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--red) 20%, var(--border));
		background: color-mix(in srgb, var(--red) 5%, var(--surf));
		color: var(--red);
		font-size: 12px;
	}

	.errbar.show { display: flex; }
	.errbar span:first-child {
		display: grid;
		place-items: center;
		width: 16px;
		height: 16px;
		border: 1px solid currentColor;
		border-radius: 50%;
		font-size: 10px;
		font-weight: 800;
		flex: 0 0 auto;
	}

	.btn-loading { display: inline-flex; align-items: center; gap: 3px; margin-right: 6px; }
	.dot {
		display: inline-block;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: currentColor;
		animation: dotpulse 1.2s ease-in-out infinite;
	}
	.dot:nth-child(2) { animation-delay: .2s; }
	.dot:nth-child(3) { animation-delay: .4s; }
	@keyframes dotpulse {
		0%, 80%, 100% { opacity: .25; transform: scale(.8); }
		40% { opacity: 1; transform: scale(1); }
	}

	.empty-layout { margin-bottom: 14px; }

	@media (max-width: 680px) {
		.gallery {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 8px;
			padding: 10px;
		}

	}

	@media (max-width: 520px) {
		.toolbar { align-items: flex-start; }
		.gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.preview { aspect-ratio: 4 / 3; }
		.dock-row {
			grid-template-columns: 1fr;
			gap: 6px;
		}
		.quality-tags { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.settings-actions { grid-template-columns: 1fr; }
	}
</style>
