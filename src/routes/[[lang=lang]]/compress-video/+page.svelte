<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/stores";
	import { marked } from "marked";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		Zap,
		Film,
		Folder,
		X,
		Feather,
		Scale,
		Gem,
		CheckCircle2,
		Download,
		ShieldCheck,
		AlertTriangle,
		Cpu,
		Target,
		Infinity,
	} from "lucide-svelte";

	// IMPORT CLASS XỬ LÝ LOGIC NÉN VIDEO
	import { VideoCompressor } from "$lib/utils/videoCompressor";

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
		JSON.stringify([
			{
				"@context": "https://schema.org",
				"@type": "WebApplication",
				name: t("compress.meta.title"),
				description: t("compress.meta.desc"),
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
				mainEntity: [
					{
						"@type": "Question",
						name: t("faq.video.1.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.1.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.video.2.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.2.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.video.3.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.3.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.video.4.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.4.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.video.5.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.5.a"),
						},
					},
					{
						"@type": "Question",
						name: t("faq.video.6.q"),
						acceptedAnswer: {
							"@type": "Answer",
							text: t("faq.video.6.a"),
						},
					},
				],
			},
		]),
	);

	// --- How-to-use markdown content ---
	let { data } = $props();
	// ------------------------------------

	let dragOver = $state(false);

	let compressInput: HTMLInputElement;
	let compressFile: File | null = $state(null);
	let selectedPreset = $state("balanced");
	let targetMb = $state("");
	let selectedTag: number | null = $state(null);
	let compressError = $state("");

	let compressProgress = $state({
		show: false,
		pct: 0,
		labelKey: "status.compressing",
	});
	let compressBusy = $state(false);
	let compressResult: {
		href: string;
		download: string;
		original: string;
		compressed: string;
		saved: string;
	} | null = $state(null);

	// KHỞI TẠO COMPRESSOR
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
		compressProgress = {
			show: false,
			pct: 0,
			labelKey: "status.compressing",
		};
		clearResult();
	}

	function clearFile() {
		compressFile = null;
		compressInput.value = "";
		compressError = "";
		compressBusy = false;
		compressProgress = {
			show: false,
			pct: 0,
			labelKey: "status.compressing",
		};
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

	function onDragLeave() {
		dragOver = false;
	}

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
		if (selectedTag === mb) {
			clearTargetSize();
			return;
		}
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
		if (bytes < 1_073_741_824)
			return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function setProgress(pct: number, labelKey?: string) {
		compressProgress = {
			...compressProgress,
			pct,
			labelKey: labelKey ?? compressProgress.labelKey,
		};
	}

	function startCompress() {
		if (!compressFile) {
			compressError = t("error.selectFile");
			return;
		}

		compressError = "";
		clearResult();
		compressBusy = true;
		compressProgress = {
			show: true,
			pct: 0,
			labelKey: "status.compressing",
		};

		const currentFile = compressFile;

		compressor.compress({
			file: currentFile,
			preset: hasTarget ? undefined : selectedPreset,
			targetMb: hasTarget ? Number(targetMb) : undefined,
			onProgress: (pct) => {
				setProgress(pct);
			},
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

				setProgress(100, "status.done");
				compressBusy = false;
			},
			onError: (err) => {
				compressError = err;
				compressBusy = false;
				compressProgress = {
					show: false,
					pct: 0,
					labelKey: "status.compressing",
				};
			},
		});
	}

	function clearResult() {
		if (compressResult?.href) URL.revokeObjectURL(compressResult.href);
		compressResult = null;
	}

	onDestroy(() => {
		compressor.cancel();
		clearResult();
	});
</script>

<svelte:head>
	<title>{t("compress.meta.title")}</title>
	<meta property="og:title" content={t("compress.meta.title")} />
	<meta name="description" content={t("compress.meta.desc")} />

	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html t("compress.hero.title")}</h1>
			<p>{t("compress.hero.sub")}</p>
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

		{#if !compressFile}
			<button
				class:over={dragOver}
				class="dz"
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
				<span class="btn-browse"
					><Folder size={14} strokeWidth={2} />
					{t("btn.browse")}</span
				>
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

		{#if compressFile}
			<div class="card">
				<div class="file-row">
					<div class="file-ico">
						<Film size={18} strokeWidth={1.8} />
					</div>
					<div class="file-info">
						<div class="file-name">{compressFile.name}</div>
						<div class="file-sz">
							{fmtBytes(compressFile.size)} · {compressFile.type ||
								t("file.type.video")}
						</div>
					</div>
					<button
						class="btn-rm"
						type="button"
						disabled={compressBusy}
						onclick={clearFile}
						title="Remove"
					>
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>

				<div class="csec">
					<span class="slabel">{t("sec.quickPreset")}</span>
					<div class="preset-grid">
						<button
							class:on={selectedPreset === "low" && !hasTarget}
							class:disabled-opt={hasTarget || compressBusy}
							disabled={hasTarget || compressBusy}
							class="pc"
							type="button"
							onclick={() => pickPreset("low")}
						>
							<span class="lb">{t("preset.low")}</span>
							<span class="sb">{t("preset.low.sub")}</span>
						</button>
						<button
							class:on={selectedPreset === "balanced" &&
								!hasTarget}
							class:disabled-opt={hasTarget || compressBusy}
							disabled={hasTarget || compressBusy}
							class="pc"
							type="button"
							onclick={() => pickPreset("balanced")}
						>
							<span class="lb">{t("preset.balanced")}</span>
							<span class="sb">{t("preset.balanced.sub")}</span>
						</button>
						<button
							class:on={selectedPreset === "high" && !hasTarget}
							class:disabled-opt={hasTarget || compressBusy}
							disabled={hasTarget || compressBusy}
							class="pc"
							type="button"
							onclick={() => pickPreset("high")}
						>
							<span class="lb">{t("preset.high")}</span>
							<span class="sb">{t("preset.high.sub")}</span>
						</button>
					</div>
				</div>

				<div class="csec">
					<span class="slabel">{t("sec.targetSize")}</span>
					<div class="target-wrap">
						<div class="target-input-wrap">
							<input
								bind:value={targetMb}
								type="number"
								placeholder={t("input.target.ph")}
								min="1"
								max="4000"
								oninput={onTargetInput}
								disabled={compressBusy}
							/>
							{#if hasTarget}
								<button
									class="btn-clear-inline"
									type="button"
									disabled={compressBusy}
									onclick={clearTargetSize}
									title="Clear"
								>
									<X size={13} strokeWidth={2.5} />
								</button>
							{:else}
								<span class="target-unit">MB</span>
							{/if}
						</div>
						<div class="size-tags">
							{#each sizeTags as tag}
								<button
									class:on={selectedTag === tag.mb}
									disabled={compressBusy}
									class="stag"
									type="button"
									onclick={() => fillTargetSize(tag.mb)}
								>
									{tag.label}
									<span class="stag-size">{tag.mb} MB</span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<div class:show={compressProgress.show} class="prog">
					<div class="ptop">
						<span>{t(compressProgress.labelKey)}</span>
						<span class="pct">{compressProgress.pct}%</span>
					</div>
					<div class="pbar">
						<div
							class="pfill"
							style:width={`${compressProgress.pct}%`}
						></div>
					</div>

					<p class="keep-open-warning">
						{t("status.warning.keepOpen")}
					</p>
				</div>

				<div class:show={Boolean(compressError)} class="errbar">
					<AlertTriangle size={15} strokeWidth={2} />
					<span>{compressError}</span>
				</div>

				<div class="action">
					<button
						class="btn-go"
						type="button"
						disabled={compressBusy}
						onclick={startCompress}
					>
						<Zap size={16} strokeWidth={2.2} />
						{t("btn.compressNow")}
					</button>
				</div>
			</div>
		{/if}

		<div class:show={Boolean(compressResult)} class="res">
			<div class="res-head">
				<div class="res-ico">
					<CheckCircle2 size={16} strokeWidth={2} />
				</div>
				<div>
					<div class="res-title">{t("res.compress.title")}</div>
					<div class="res-sub">{t("res.compress.sub")}</div>
				</div>
			</div>
			<div class="stats">
				<div class="stat">
					<div class="sv">{compressResult?.original ?? "—"}</div>
					<div class="sl">{t("stat.original")}</div>
				</div>
				<div class="stat">
					<div class="sv">{compressResult?.compressed ?? "—"}</div>
					<div class="sl">{t("stat.compressed")}</div>
				</div>
				<div class="stat">
					<div class="sv g">{compressResult?.saved ?? "—"}</div>
					<div class="sl">{t("stat.saved")}</div>
				</div>
			</div>
			<a
				class="btn-dl"
				href={compressResult?.href ?? "#"}
				download={compressResult?.download}
			>
				<Download size={15} strokeWidth={2.2} />
				{t("btn.dl.compress")}
			</a>
		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>{@html t("note.privacy")}</p>
		</div>

		<div class="feats">
			<div class="feat">
				<div class="fi"><Cpu size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t("feat.speed.title")}</div>
					<div class="fd">{t("feat.speed.desc")}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Target size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t("feat.target.title")}</div>
					<div class="fd">{t("feat.target.desc")}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Infinity size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t("feat.free.title")}</div>
					<div class="fd">{t("feat.free.desc")}</div>
				</div>
			</div>
		</div>

		<!-- How to use — SEO content từ markdown -->
		{#if data.howToHtml}
			<section class="how-to-sec prose">
				{@html data.howToHtml}
			</section>
		{/if}

		<section
			class="faq-sec"
			itemscope
			itemtype="https://schema.org/FAQPage"
		>
			<h2>{t("faq.video.title")}</h2>
			<div class="faq-list">
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.1.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.1.a")}</span>
					</div>
				</details>
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.2.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.2.a")}</span>
					</div>
				</details>
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.3.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.3.a")}</span>
					</div>
				</details>
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.4.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.4.a")}</span>
					</div>
				</details>
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.5.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.5.a")}</span>
					</div>
				</details>
				<details
					class="faq-item"
					itemscope
					itemprop="mainEntity"
					itemtype="https://schema.org/Question"
				>
					<summary class="faq-q" itemprop="name"
						>{t("faq.video.6.q")}</summary
					>
					<div
						class="faq-a"
						itemscope
						itemprop="acceptedAnswer"
						itemtype="https://schema.org/Answer"
					>
						<span itemprop="text">{t("faq.video.6.a")}</span>
					</div>
				</details>
			</div>
		</section>
	</div>
</main>

<style>
	/* ── How-to-use section ── */
	.how-to-sec {
		margin-top: 0px;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}

	.how-to-sec :global(h1) {
		font-size: 1.35rem;
		font-weight: 700;
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
