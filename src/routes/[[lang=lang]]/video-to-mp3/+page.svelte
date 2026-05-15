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

	let jsonLd = $derived(
		JSON.stringify([
			{
				"@context": "https://schema.org",
				"@type": "WebApplication",
				name: t("mp3.meta.title"),
				description: t("mp3.meta.desc"),
				applicationCategory: "MultimediaApplication",
				operatingSystem: "All",
				browserRequirements: "Requires JavaScript",
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
			},
			{
				"@context": "https://schema.org",
				"@type": "FAQPage",
				mainEntity: Array.from({ length: 8 }, (_, index) => {
					const n = index + 1;

					return {
						"@type": "Question",
						name: t(`faq.mp3.${n}.q`),
						acceptedAnswer: {
							"@type": "Answer",
							text: t(`faq.mp3.${n}.a`),
						},
					};
				}),
			},
		]),
	);

	const converter = new VideoToMp3Converter();

	let inputEl: HTMLInputElement;
	let dragOver = $state(false);

	let file: File | null = $state(null);
	let selectedBitrate = $state(192);
	let busy = $state(false);
	let error = $state("");

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
		{
			value: 128,
			labelKey: "mp3.bitrate.128.label",
			subKey: "mp3.bitrate.128.sub",
		},
		{
			value: 192,
			labelKey: "mp3.bitrate.192.label",
			subKey: "mp3.bitrate.192.sub",
		},
		{
			value: 320,
			labelKey: "mp3.bitrate.320.label",
			subKey: "mp3.bitrate.320.sub",
		},
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
		progress = {
			show: false,
			pct: 0,
			labelKey: "mp3.status.converting",
		};
		clearResult();
	}

	function clearFile() {
		file = null;
		inputEl.value = "";
		error = "";
		busy = false;
		selectedBitrate = 192;
		progress = {
			show: false,
			pct: 0,
			labelKey: "mp3.status.converting",
		};
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

	function setProgress(pct: number, labelKey?: string) {
		progress = {
			...progress,
			pct,
			labelKey: labelKey ?? progress.labelKey,
		};
	}

	function startConvert() {
		if (!file) {
			error = t("mp3.error.selectVideo");
			return;
		}

		const currentFile = file;

		error = "";
		clearResult();
		busy = true;
		progress = {
			show: true,
			pct: 0,
			labelKey: "mp3.status.converting",
		};

		converter.convert({
			file: currentFile,
			bitrate: selectedBitrate * 1000,
			onProgress: (pct) => setProgress(pct),
			onSuccess: (blob, finalSize) => {
				const href = URL.createObjectURL(blob);
				const base = currentFile.name.replace(/\.[^.]+$/, "");

				result = {
					href,
					download: `${base}.mp3`,
					original: fmtBytes(currentFile.size),
					converted: fmtBytes(finalSize),
				};

				setProgress(100, "status.done");
				busy = false;
			},
			onError: (message) => {
				error = message;
				busy = false;
				progress = {
					show: false,
					pct: 0,
					labelKey: "mp3.status.converting",
				};
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
		<section class="hero">
			<h1>{@html t("mp3.hero.title")}</h1>
			<p>{t("mp3.hero.sub")}</p>

			<div class="pills">
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill1")}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill2")}</span>
				</div>
				<div class="pill">
					<span class="dot"></span><span>{t("hero.pill3")}</span>
				</div>
			</div>
		</section>

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
				<div class="dz-ico"><Music2 size={24} strokeWidth={1.5} /></div>
				<h3>{t("mp3.drop.title")}</h3>
				<p class="sub">{t("drop.compress.sub")}</p>
				<span class="btn-browse">
					<Folder size={14} strokeWidth={2} />
					{t("btn.browse")}
				</span>
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

		{#if file}
			<div class="card">
				<div class="file-row">
					<div class="file-ico">
						<Film size={18} strokeWidth={1.8} />
					</div>

					<div class="file-info">
						<div class="file-name">{file.name}</div>
						<div class="file-sz">
							{fmtBytes(file.size)} · {file.type || t("file.type.video")}
						</div>
					</div>

					<button
						class="btn-rm"
						type="button"
						disabled={busy}
						onclick={clearFile}
						title="Remove"
					>
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>

				<div class="csec">
					<span class="slabel">{t("mp3.sec.quality")}</span>

					<div class="preset-grid">
						{#each bitrateOptions as option}
							<button
								class:on={selectedBitrate === option.value}
								disabled={busy}
								class="pc"
								type="button"
								onclick={() => (selectedBitrate = option.value)}
							>
								<span class="lb">{t(option.labelKey)}</span>
								<span class="sb">{t(option.subKey)}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class:show={progress.show} class="prog">
					<div class="ptop">
						<span>{t(progress.labelKey)}</span>
						<span class="pct">{progress.pct}%</span>
					</div>

					<div class="pbar">
						<div class="pfill" style:width={`${progress.pct}%`}></div>
					</div>

					<p class="keep-open-warning">
						{t("status.warning.keepOpen")}
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
						{t("mp3.btn.convert")}
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
					<div class="res-title">{t("mp3.res.title")}</div>
					<div class="res-sub">{t("mp3.res.sub")}</div>
				</div>
			</div>

			<div class="stats">
				<div class="stat">
					<div class="sv">{result?.original ?? "—"}</div>
					<div class="sl">{t("stat.original")}</div>
				</div>

				<div class="stat">
					<div class="sv">{result?.converted ?? "—"}</div>
					<div class="sl">{t("mp3.stat.converted")}</div>
				</div>

				<div class="stat">
					<div class="sv g">MP3</div>
					<div class="sl">{t("mp3.stat.format")}</div>
				</div>
			</div>

			<a
				class="btn-dl"
				href={result?.href ?? "#"}
				download={result?.download}
			>
				<Download size={15} strokeWidth={2.2} />
				{t("mp3.btn.download")}
			</a>

			<button class="btn-new" type="button" onclick={clearFile}>
				<FileAudio2 size={15} strokeWidth={2.2} />
				{t("mp3.btn.new")}
			</button>
		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>{@html t("mp3.note.privacy")}</p>
		</div>

		{#if data.howToHtml}
			<section class="how-to-sec prose">
				{@html data.howToHtml}
			</section>
		{/if}

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t("faq.mp3.title")}</h2>

			<div class="faq-list">
				{#each Array.from({ length: 8 }, (_, i) => i + 1) as n}
					<details
						class="faq-item"
						itemscope
						itemprop="mainEntity"
						itemtype="https://schema.org/Question"
					>
						<summary class="faq-q" itemprop="name">
							{t(`faq.mp3.${n}.q`)}
						</summary>

						<div
							class="faq-a"
							itemscope
							itemprop="acceptedAnswer"
							itemtype="https://schema.org/Answer"
						>
							<span itemprop="text">
								{@html markdownToHtml(t(`faq.mp3.${n}.a`))}
							</span>
						</div>
					</details>
				{/each}
			</div>
		</section>
	</div>
</main>

<style>
	.how-to-sec {
		margin-top: 0px;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}

	.how-to-sec :global(a) {
		color: #1550ae;
	}

	.how-to-sec :global(h1) {
		font-size: 1.35rem;
		font-weight: 650;
		color: var(--fg);
		margin: 0 0 20px;
		line-height: 1.3;
	}

	.how-to-sec :global(h2) {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--fg);
		margin: 15px 0 10px;
	}

	.how-to-sec :global(h3) {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--fg);
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

	.how-to-sec :global(li strong) {
		color: var(--fg);
		font-weight: 600;
	}

	.how-to-sec :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 28px 0;
	}

	.how-to-sec :global(strong) {
		color: var(--fg);
		font-weight: 600;
	}

	.how-to-sec :global(blockquote) {
		margin: 12px 0 16px;
		padding: 10px 14px;
		border-left: 3px solid var(--accent);
		background: var(--surface, rgba(0, 0, 0, 0.03));
		border-radius: 0 6px 6px 0;
	}

	.how-to-sec :global(blockquote p) {
		margin: 0;
		font-size: 0.85rem;
	}

	.how-to-sec :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		margin: 12px 0 20px;
	}

	.how-to-sec :global(th) {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		color: var(--fg);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.how-to-sec :global(td) {
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
	}

	.how-to-sec :global(tr:last-child td) {
		border-bottom: none;
	}
</style>
