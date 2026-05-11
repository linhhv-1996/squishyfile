<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import {
		FileText, Folder, X, CheckCircle2, Download,
		ShieldCheck, AlertTriangle, Cpu, Target, Infinity, KeyRound
	} from 'lucide-svelte';

	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key);

	let dragOver = $state(false);

	let pdfInput: HTMLInputElement;
	let pdfFile: File | null = $state(null);
	let pdfPassword = $state('');
	let removePdfPassword = $state(false);
	let pdfError = $state('');

	let pdfProgress = $state({ show: false, pct: 0, labelKey: 'status.removingPass' });
	let pdfBusy = $state(false);
	let pdfResult: { href: string; download: string } | null = $state(null);
	let progressTimer: ReturnType<typeof setInterval> | null = null;

	function triggerInput() {
		pdfInput.click();
	}

	function handleFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) loadFile(file);
	}

	function loadFile(file: File) {
		pdfFile = file;
		pdfError = '';
		pdfProgress = { show: false, pct: 0, labelKey: 'status.removingPass' };
		clearResult();
	}

	function clearFile() {
		pdfFile = null;
		pdfInput.value = '';
		pdfError = '';
		pdfBusy = false;
		pdfPassword = '';
		removePdfPassword = false;
		pdfProgress = { show: false, pct: 0, labelKey: 'status.removingPass' };
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
		if (file && file.type === 'application/pdf') loadFile(file);
	}

	function fmtBytes(bytes: number) {
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function setProgress(pct: number, labelKey?: string) {
		pdfProgress = { ...pdfProgress, pct, labelKey: labelKey ?? pdfProgress.labelKey };
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

	function startPdfUnlock() {
		if (!pdfFile) {
			pdfError = t('error.selectPdf');
			return;
		}
		if (removePdfPassword && !pdfPassword.trim()) {
			pdfError = t('error.enterPassword');
			return;
		}

		pdfError = '';
		clearResult();
		pdfBusy = true;
		pdfProgress = { show: true, pct: 0, labelKey: 'status.removingPass' };

		const file = pdfFile;
		runProgress(2200, () => {
			const href = URL.createObjectURL(file);
			const base = file.name.replace(/\.[^.]+$/, '');
			pdfResult = { href, download: `${base}_compressed.pdf` };
			pdfProgress = { show: false, pct: 100, labelKey: 'status.done' };
			pdfBusy = false;
		});
	}

	function clearResult() {
		if (pdfResult?.href) URL.revokeObjectURL(pdfResult.href);
		pdfResult = null;
	}

	onDestroy(() => {
		if (progressTimer) clearInterval(progressTimer);
		clearResult();
	});
</script>

<svelte:head>
	<title>{t('pdf.meta.title')}</title>
	<meta name="description" content={t('pdf.meta.desc')} />
	<meta name="robots" content="index, follow" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>{@html t('pdf.hero.title')}</h1>
			<p>{t('pdf.hero.sub')}</p>
			<div class="pills">
				<div class="pill"><span class="dot"></span><span>{t('hero.pill1')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill2')}</span></div>
				<div class="pill"><span class="dot"></span><span>{t('hero.pill3')}</span></div>
			</div>
		</section>

		{#if !pdfFile}
			<button
				class:over={dragOver}
				class="dz dz--pdf"
				type="button"
				onclick={triggerInput}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				ondrop={onDrop}
			>
				<div class="dz-ico dz-ico--pdf"><FileText size={24} strokeWidth={1.5} /></div>
				<h3>{t('drop.pdf')}</h3>
				<p class="sub">{t('drop.pdf.sub')}</p>
				<span class="btn-browse"><Folder size={14} strokeWidth={2} /> {t('btn.browse')}</span>
				<p class="fmt-hint">{t('hint.pdf')}</p>
			</button>
		{/if}
		<input bind:this={pdfInput} class="file-input" type="file" accept="application/pdf" onchange={handleFile} />

		{#if pdfFile}
			<div class="card">
				<div class="file-row">
					<div class="file-ico file-ico--pdf"><FileText size={18} strokeWidth={1.8} /></div>
					<div class="file-info">
						<div class="file-name">{pdfFile.name}</div>
						<div class="file-sz">{fmtBytes(pdfFile.size)} · PDF</div>
					</div>
					<button class="btn-rm" type="button" onclick={clearFile} title="Remove">
						<X size={15} strokeWidth={2.5} />
					</button>
				</div>

				<div class="csec">
					<span class="slabel">
						<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
							<input type="checkbox" bind:checked={removePdfPassword} style="cursor: pointer;" />
							{t('sec.pdfPasswordOpt')}
						</label>
					</span>
					{#if removePdfPassword}
						<div class="target-input-wrap" style="margin-top: 10px;">
							<KeyRound size={15} strokeWidth={2} class="pass-ico" />
							<input
								bind:value={pdfPassword}
								type="password"
								placeholder={t('input.password.ph')}
								class="pass-input"
							/>
						</div>
						<p class="pass-hint">{t('pdf.password.hint')}</p>
					{/if}
				</div>

				<div class:show={pdfProgress.show} class="prog">
					<div class="ptop"><span>{t(pdfProgress.labelKey)}</span><span class="pct">{pdfProgress.pct}%</span></div>
					<div class="pbar"><div class="pfill pfill--pdf" style:width={`${pdfProgress.pct}%`}></div></div>
				</div>

				<div class:show={Boolean(pdfError)} class="errbar">
					<AlertTriangle size={15} strokeWidth={2} />
					<span>{pdfError}</span>
				</div>

				<div class="action">
					<button class="btn-go btn-go--pdf" type="button" disabled={pdfBusy} onclick={startPdfUnlock}>
						<FileText size={16} strokeWidth={2.2} /> {t('btn.removePassword')}
					</button>
				</div>
			</div>
		{/if}

		<div class:show={Boolean(pdfResult)} class="res">
			<div class="res-head">
				<div class="res-ico"><CheckCircle2 size={16} strokeWidth={2} /></div>
				<div><div class="res-title">{t('res.pdf.title')}</div><div class="res-sub">{t('res.pdf.sub')}</div></div>
			</div>
			<a class="btn-dl" href={pdfResult?.href ?? '#'} download={pdfResult?.download}>
				<Download size={15} strokeWidth={2.2} /> {t('btn.dl.pdf')}
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
			<h2>{t('faq.pdf.title')}</h2>
			<div class="faq-list">
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.1.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.1.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.2.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.2.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.3.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.3.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.4.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.4.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.5.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.5.a')}</span>
					</div>
				</details>
				<details class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
					<summary class="faq-q" itemprop="name">{t('faq.pdf.6.q')}</summary>
					<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
						<span itemprop="text">{t('faq.pdf.6.a')}</span>
					</div>
				</details>
			</div>
		</section>
	</div>
</main>

<style>
	.dz--pdf:hover,
	.dz--pdf.over {
		border-color: var(--accent2);
	}

	.dz-ico--pdf {
		background: linear-gradient(135deg, rgba(124, 92, 252, .12), rgba(124, 92, 252, .04));
		color: var(--accent2);
	}

	.file-ico--pdf {
		color: var(--accent2);
	}

	.pfill--pdf {
		background: linear-gradient(90deg, var(--accent2), #4f8cff);
	}

	.pass-input {
		width: 100%;
		padding: 10px 14px 10px 40px;
		background: var(--surf2);
		border: 1px solid var(--border);
		border-radius: var(--rsm);
		color: var(--text);
		font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
		font-size: 14px;
		font-weight: 500;
		outline: none;
		transition: border-color .18s;
	}

	.pass-input:focus {
		border-color: var(--accent2);
	}

	.pass-input::placeholder {
		color: var(--muted);
	}

	:global(.pass-ico) {
		position: absolute;
		left: 13px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
	}

	.pass-hint {
		margin-top: 8px;
		font-size: 11.5px;
		color: var(--muted);
		line-height: 1.5;
	}

	.btn-go--pdf {
		background: linear-gradient(135deg, #7c5cfc, #4f8cff);
	}
</style>
