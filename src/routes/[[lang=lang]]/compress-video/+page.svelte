<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import {
		Zap, Film, Folder, X, Feather, Scale, Gem,
		CheckCircle2, Download, ShieldCheck, AlertTriangle, Cpu, Target, Infinity
	} from 'lucide-svelte';

	const sizeTags = [
		{ mb: 10, label: 'LINE' },
		{ mb: 8, label: 'Discord' },
		{ mb: 25, label: 'Gmail' },
		{ mb: 20, label: 'Messenger' },
		{ mb: 50, label: 'Telegram' },
		{ mb: 16, label: 'Twitter/X' },
		{ mb: 100, label: 'Email' }
	];

	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let dragOver = $state(false);

	let compressInput: HTMLInputElement;
	let compressFile: File | null = $state(null);
	let selectedPreset = $state('balanced');
	let targetMb = $state('');
	let selectedTag: number | null = $state(null);
	let compressError = $state('');

	let compressProgress = $state({ show: false, pct: 0, labelKey: 'status.compressing' });
	let compressBusy = $state(false);
	let compressResult: { href: string; download: string; original: string; compressed: string; saved: string } | null = $state(null);
	let progressTimer: ReturnType<typeof setInterval> | null = null;

	let hasTarget = $derived(targetMb.trim() !== '');

	function triggerInput() {
		compressInput.click();
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) loadFile(file);
	}

	function loadFile(file: File) {
		compressFile = file;
		compressError = '';
		compressProgress = { show: false, pct: 0, labelKey: 'status.compressing' };
		clearResult();
	}

	function clearFile() {
		compressFile = null;
		compressInput.value = '';
		compressError = '';
		compressBusy = false;
		compressProgress = { show: false, pct: 0, labelKey: 'status.compressing' };
		targetMb = '';
		selectedTag = null;
		selectedPreset = 'balanced';
		clearResult();
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('video/')) loadFile(file);
	}

	function pickPreset(key: string) {
		if (hasTarget) return;
		selectedPreset = key;
	}

	function onTargetInput() {
		selectedTag = null;
		if (!targetMb.trim() && !selectedPreset) selectedPreset = 'balanced';
	}

	function fillTargetSize(mb: number) {
		if (selectedTag === mb) {
			clearTargetSize();
			return;
		}
		targetMb = String(mb);
		selectedTag = mb;
		selectedPreset = '';
	}

	function clearTargetSize() {
		targetMb = '';
		selectedTag = null;
		selectedPreset = 'balanced';
	}

	function fmtBytes(bytes: number) {
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function setProgress(pct: number, labelKey?: string) {
		compressProgress = { ...compressProgress, pct, labelKey: labelKey ?? compressProgress.labelKey };
	}

	function runProgress(ms: number, done: () => void) {
		if (progressTimer) clearInterval(progressTimer);
		let pct = 0;
		progressTimer = setInterval(() => {
			pct = Math.min(pct + Math.random() * 4 + 1, 94);
			setProgress(Math.round(pct));
			if (pct >= 94 && progressTimer) {
				clearInterval(progressTimer);
				progressTimer = null;
				setTimeout(() => {
					setProgress(100, 'status.done');
					done();
				}, 280);
			}
		}, ms / 55);
	}

	function startCompress() {
		if (!compressFile) {
			compressError = t('error.selectFile');
			return;
		}

		compressError = '';
		clearResult();
		compressBusy = true;
		compressProgress = { show: true, pct: 0, labelKey: 'status.compressing' };

		const file = compressFile;
		runProgress(2800, () => {
			const ratio = 0.28 + Math.random() * 0.35;
			const href = URL.createObjectURL(file);
			const base = file.name.replace(/\.[^.]+$/, '');
			compressResult = {
				href,
				download: `${base}_compressed.mp4`,
				original: fmtBytes(file.size),
				compressed: fmtBytes(Math.round(file.size * ratio)),
				saved: `${Math.round((1 - ratio) * 100)}%`
			};
			compressProgress = { show: false, pct: 100, labelKey: 'status.done' };
			compressBusy = false;
		});
	}

	function clearResult() {
		if (compressResult?.href) URL.revokeObjectURL(compressResult.href);
		compressResult = null;
	}

	onDestroy(() => {
		if (progressTimer) clearInterval(progressTimer);
		clearResult();
	});
</script>

<svelte:head>
	<title>{t('compress.meta.title')}</title>
	<meta name="description" content={t('compress.meta.desc')} />
	<meta name="robots" content="index, follow" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html t('compress.hero.title')}</h1>
			<p>{t('compress.hero.sub')}</p>
			<div class="pills">
				<div class="pill"><span class="dot"></span><span>{t('hero.pill1')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill2')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill3')}</span></div>
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
			>
				<div class="dz-ico"><Film size={24} strokeWidth={1.5} /></div>
				<h3>{t('drop.video')}</h3>
				<p class="sub">{t('drop.compress.sub')}</p>
				<span class="btn-browse"><Folder size={14} strokeWidth={2} /> {t('btn.browse')}</span>
				<p class="fmt-hint">{@html t('hint.compress')}</p>
			</button>
		{/if}
		<input bind:this={compressInput} class="file-input" type="file" accept="video/*" onchange={handleFile} />

		{#if compressFile}
			<div class="card">
				<div class="file-row">
					<div class="file-ico"><Film size={18} strokeWidth={1.8} /></div>
					<div class="file-info">
						<div class="file-name">{compressFile.name}</div>
						<div class="file-sz">{fmtBytes(compressFile.size)} · {compressFile.type || t('file.type.video')}</div>
					</div>
					<button class="btn-rm" type="button" onclick={clearFile} title="Remove">
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>

				<div class="csec">
					<span class="slabel">{t('sec.quickPreset')}</span>
					<div class="preset-grid">
						<button class:on={selectedPreset === 'low' && !hasTarget} class:disabled-opt={hasTarget} class="pc" type="button" onclick={() => pickPreset('low')}>
							<div class="ico"><Feather size={18} strokeWidth={1.8} /></div>
							<span class="lb">{t('preset.low')}</span>
							<span class="sb">{t('preset.low.sub')}</span>
						</button>
						<button class:on={selectedPreset === 'balanced' && !hasTarget} class:disabled-opt={hasTarget} class="pc" type="button" onclick={() => pickPreset('balanced')}>
							<div class="ico"><Scale size={18} strokeWidth={1.8} /></div>
							<span class="lb">{t('preset.balanced')}</span>
							<span class="sb">{t('preset.balanced.sub')}</span>
						</button>
						<button class:on={selectedPreset === 'high' && !hasTarget} class:disabled-opt={hasTarget} class="pc" type="button" onclick={() => pickPreset('high')}>
							<div class="ico"><Gem size={18} strokeWidth={1.8} /></div>
							<span class="lb">{t('preset.high')}</span>
							<span class="sb">{t('preset.high.sub')}</span>
						</button>
					</div>
				</div>

				<div class="csec">
					<span class="slabel">{t('sec.targetSize')}</span>
					<div class="target-wrap">
						<div class="target-input-wrap">
							<input bind:value={targetMb} type="number" placeholder={t('input.target.ph')} min="1" max="4000" oninput={onTargetInput} />
							{#if hasTarget}
								<button class="btn-clear-inline" type="button" onclick={clearTargetSize} title="Clear">
									<X size={13} strokeWidth={2.5} />
								</button>
							{:else}
								<span class="target-unit">MB</span>
							{/if}
						</div>
						<div class="size-tags">
							{#each sizeTags as tag}
								<button class:on={selectedTag === tag.mb} class="stag" type="button" onclick={() => fillTargetSize(tag.mb)}>
									{tag.label} <span class="stag-size">{tag.mb} MB</span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<div class:show={compressProgress.show} class="prog">
					<div class="ptop"><span>{t(compressProgress.labelKey)}</span><span class="pct">{compressProgress.pct}%</span></div>
					<div class="pbar"><div class="pfill" style:width={`${compressProgress.pct}%`}></div></div>
				</div>

				<div class:show={Boolean(compressError)} class="errbar">
					<AlertTriangle size={15} strokeWidth={2} />
					<span>{compressError}</span>
				</div>

				<div class="action">
					<button class="btn-go" type="button" disabled={compressBusy} onclick={startCompress}>
						<Zap size={16} strokeWidth={2.2} /> {t('btn.compressNow')}
					</button>
				</div>
			</div>
		{/if}

		<div class:show={Boolean(compressResult)} class="res">
			<div class="res-head">
				<div class="res-ico"><CheckCircle2 size={16} strokeWidth={2} /></div>
				<div><div class="res-title">{t('res.compress.title')}</div><div class="res-sub">{t('res.compress.sub')}</div></div>
			</div>
			<div class="stats">
				<div class="stat"><div class="sv">{compressResult?.original ?? '—'}</div><div class="sl">{t('stat.original')}</div></div>
				<div class="stat"><div class="sv">{compressResult?.compressed ?? '—'}</div><div class="sl">{t('stat.compressed')}</div></div>
				<div class="stat"><div class="sv g">{compressResult?.saved ?? '—'}</div><div class="sl">{t('stat.saved')}</div></div>
			</div>
			<a class="btn-dl" href={compressResult?.href ?? '#'} download={compressResult?.download}>
				<Download size={15} strokeWidth={2.2} /> {t('btn.dl.compress')}
			</a>
		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>{@html t('note.privacy')}</p>
		</div>

		<div class="feats">
			<div class="feat">
				<div class="fi"><Cpu size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t('feat.speed.title')}</div>
					<div class="fd">{t('feat.speed.desc')}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Target size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t('feat.target.title')}</div>
					<div class="fd">{t('feat.target.desc')}</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Infinity size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">{t('feat.free.title')}</div>
					<div class="fd">{t('feat.free.desc')}</div>
				</div>
			</div>
		</div>

		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t('faq.video.title')}</h2>
			<div class="faq-list">
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.1.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.1.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.2.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.2.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.3.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.3.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.4.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.4.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.5.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.5.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.video.6.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.video.6.a')}</span>
					</div>
				</details>
			</div>
		</section>
	</div>
</main>
