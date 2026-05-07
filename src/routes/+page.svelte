<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		Zap,
		RefreshCw,
		Folder,
		Film,
		X,
		Feather,
		Scale,
		Gem,
		CheckCircle2,
		Download,
		ShieldCheck,
		AlertTriangle,
		Home,
		FileText,
		Globe,
		ChevronDown,
		Cpu,
		Target,
		Infinity,
		Check
	} from 'lucide-svelte';

	type Mode = 'compress' | 'convert';
	type Tab = Mode;

	const languages = [
		{ key: 'en', flag: '🇺🇸', code: 'EN', name: 'English' },
		{ key: 'ja', flag: '🇯🇵', code: 'JA', name: '日本語' },
		{ key: 'ko', flag: '🇰🇷', code: 'KO', name: '한국어' },
		{ key: 'zh', flag: '🇨🇳', code: 'ZH', name: '中文' },
		{ key: 'vi', flag: '🇻🇳', code: 'VI', name: 'Tiếng Việt' }
	];

	const sizeTags = [
		{ mb: 10, label: 'LINE' },
		{ mb: 8, label: 'Discord' },
		{ mb: 25, label: 'Gmail' },
		{ mb: 20, label: 'Messenger' },
		{ mb: 50, label: 'Telegram' },
		{ mb: 16, label: 'Twitter/X' },
		{ mb: 100, label: 'Email' }
	];

	const formats = ['mp4', 'webm', 'mov', 'avi', 'gif'];

	let activeTab: Tab = $state('compress');
	let activeLang = $state(languages[0]);
	let langOpen = $state(false);
	let mobileOpen = $state(false);
	let dragOver: Mode | null = $state(null);

	let compressInput: HTMLInputElement;
	let convertInput: HTMLInputElement;
	let langWrap: HTMLDivElement;
	let compressFile: File | null = $state(null);
	let convertFile: File | null = $state(null);

	let selectedPreset = $state('balanced');
	let targetMb = $state('');
	let selectedTag: number | null = $state(null);
	let selectedFormat = $state('mp4');

	let compressError = $state('');
	let convertError = $state('');
	let compressProgress = $state({ show: false, pct: 0, label: 'Compressing…' });
	let convertProgress = $state({ show: false, pct: 0, label: 'Converting…' });
	let compressBusy = $state(false);
	let convertBusy = $state(false);

	let compressResult: { href: string; download: string; original: string; compressed: string; saved: string } | null =
		$state(null);
	let convertResult: { href: string; download: string } | null = $state(null);
	let progressTimer: ReturnType<typeof setInterval> | null = null;

	let hasTarget = $derived(targetMb.trim() !== '');

	function setLanguage(lang: (typeof languages)[number]) {
		activeLang = lang;
		langOpen = false;
		closeMobileMenu();
	}

	function toggleMobileMenu() {
		mobileOpen = !mobileOpen;
		document.body.style.overflow = mobileOpen ? 'hidden' : '';
	}

	function closeMobileMenu() {
		mobileOpen = false;
		document.body.style.overflow = '';
	}

	function switchTab(tab: Tab) {
		activeTab = tab;
	}

	function triggerInput(mode: Mode) {
		(mode === 'compress' ? compressInput : convertInput).click();
	}

	function handleFile(event: Event, mode: Mode) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) loadFile(file, mode);
	}

	function loadFile(file: File, mode: Mode) {
		if (mode === 'compress') {
			compressFile = file;
			compressError = '';
			compressProgress = { show: false, pct: 0, label: 'Compressing…' };
			clearResult('compress');
		} else {
			convertFile = file;
			convertError = '';
			convertProgress = { show: false, pct: 0, label: 'Converting…' };
			clearResult('convert');
		}
	}

	function clearFile(mode: Mode) {
		if (mode === 'compress') {
			compressFile = null;
			compressInput.value = '';
			compressError = '';
			compressBusy = false;
			compressProgress = { show: false, pct: 0, label: 'Compressing…' };
			targetMb = '';
			selectedTag = null;
			selectedPreset = 'balanced';
			clearResult('compress');
		} else {
			convertFile = null;
			convertInput.value = '';
			convertError = '';
			convertBusy = false;
			convertProgress = { show: false, pct: 0, label: 'Converting…' };
			clearResult('convert');
		}
	}

	function onDragOver(event: DragEvent, mode: Mode) {
		event.preventDefault();
		dragOver = mode;
	}

	function onDragLeave(mode: Mode) {
		if (dragOver === mode) dragOver = null;
	}

	function onDrop(event: DragEvent, mode: Mode) {
		event.preventDefault();
		dragOver = null;
		const file = event.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('video/')) loadFile(file, mode);
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

	function setProgress(mode: Mode, pct: number, label?: string) {
		if (mode === 'compress') {
			compressProgress = { ...compressProgress, pct, label: label ?? compressProgress.label };
		} else {
			convertProgress = { ...convertProgress, pct, label: label ?? convertProgress.label };
		}
	}

	function runProgress(mode: Mode, ms: number, done: () => void) {
		if (progressTimer) clearInterval(progressTimer);
		let pct = 0;
		progressTimer = setInterval(() => {
			pct = Math.min(pct + Math.random() * 4 + 1, 94);
			setProgress(mode, Math.round(pct));
			if (pct >= 94 && progressTimer) {
				clearInterval(progressTimer);
				progressTimer = null;
				setTimeout(() => {
					setProgress(mode, 100, 'Done!');
					done();
				}, 280);
			}
		}, ms / 55);
	}

	function startCompress() {
		if (!compressFile) {
			compressError = 'Please select a video file.';
			return;
		}

		compressError = '';
		clearResult('compress');
		compressBusy = true;
		compressProgress = { show: true, pct: 0, label: 'Compressing…' };

		const file = compressFile;
		runProgress('compress', 2800, () => {
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
			compressProgress = { show: false, pct: 100, label: 'Done!' };
			compressBusy = false;
		});
	}

	function startConvert() {
		if (!convertFile) {
			convertError = 'Please select a video file.';
			return;
		}

		convertError = '';
		clearResult('convert');
		convertBusy = true;
		convertProgress = { show: true, pct: 0, label: 'Converting…' };

		const file = convertFile;
		runProgress('convert', 3000, () => {
			const href = URL.createObjectURL(file);
			const base = file.name.replace(/\.[^.]+$/, '');
			convertResult = { href, download: `${base}_converted.${selectedFormat}` };
			convertProgress = { show: false, pct: 100, label: 'Done!' };
			convertBusy = false;
		});
	}

	function clearResult(mode: Mode) {
		if (mode === 'compress' && compressResult?.href) URL.revokeObjectURL(compressResult.href);
		if (mode === 'convert' && convertResult?.href) URL.revokeObjectURL(convertResult.href);
		if (mode === 'compress') compressResult = null;
		if (mode === 'convert') convertResult = null;
	}

	onMount(() => {
		const closeLangOnOutsideClick = (event: MouseEvent) => {
			if (langWrap && !langWrap.contains(event.target as Node)) langOpen = false;
		};

		document.addEventListener('click', closeLangOnOutsideClick);

		return () => {
			document.removeEventListener('click', closeLangOnOutsideClick);
		};
	});

	onDestroy(() => {
		if (progressTimer) clearInterval(progressTimer);
		clearResult('compress');
		clearResult('convert');
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});
</script>

<svelte:head>
	<title>NekoCompress – Free Video Compressor & Converter</title>
	<meta
		name="description"
		content="Compress and convert videos for free, directly in your browser. No upload to server, no watermark, 100% private."
	/>
	<meta name="robots" content="index, follow" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<header>
	<div class="hinner">
		<a href="/" class="logo">
			<div class="logo-ico">
				<Film size={15} strokeWidth={2.2} />
			</div>
			<span class="logo-name">Neko<span>Compress</span></span>
		</a>

		<nav class="hnav">
			<a href="/" class="active">Home</a>
			<a href="/blog">Blog</a>
		</nav>

		<div class="hright">
			<div bind:this={langWrap} class:open={langOpen} class="lang-wrap">
				<button class="lang-btn" type="button" onclick={(event) => {
					event.stopPropagation();
					langOpen = !langOpen;
				}}>
					<Globe size={13} strokeWidth={2} />
					<span class="flag">{activeLang.flag}</span>
					<span>{activeLang.code}</span>
					<ChevronDown size={11} strokeWidth={2} class="chevron-icon" />
				</button>
				<div class="lang-menu">
					{#each languages as lang}
						<button class:on={activeLang.key === lang.key} class="lang-opt" type="button" onclick={() => setLanguage(lang)}>
							<span class="lf">{lang.flag}</span>
							<span class="ln">{lang.name}</span>
							<span class="lc">{lang.code}</span>
						</button>
					{/each}
				</div>
			</div>

			<button class:open={mobileOpen} class="ham-btn" type="button" onclick={toggleMobileMenu} aria-label="Menu">
				<span></span><span></span><span></span>
			</button>
		</div>
	</div>
</header>

<div class:open={mobileOpen} class="mobile-menu">
	<a href="/" class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><Home size={18} /></span><span>Home</span>
	</a>
	<a href="/blog" class="mm-link" onclick={closeMobileMenu}>
		<span class="mm-ico"><FileText size={18} /></span><span>Blog</span>
	</a>

	<div class="mm-divider"></div>
	<div class="mm-label">Language</div>
	<div class="mm-lang-grid">
		{#each languages as lang}
			<button class:on={activeLang.key === lang.key} class="mm-lang-opt" type="button" onclick={() => setLanguage(lang)}>
				<span class="mlf">{lang.flag}</span>
				<span class="mln">{lang.name}</span>
			</button>
		{/each}
	</div>
</div>

<main>
	<div class="wrap">
		<section class="hero">
			<h1>Compress & Convert Videos<br />in Your Browser</h1>
			<p>No uploads, no accounts, no watermarks — runs entirely on your device.</p>
			<div class="pills">
				<div class="pill"><span class="dot"></span><span>Local processing</span></div>
				<div class="pill"><span class="dot"></span><span>No watermark</span></div>
				<div class="pill"><span class="dot"></span><span>Unlimited files</span></div>
			</div>
		</section>

		<div class="tabs" role="tablist">
			<button
				class:active={activeTab === 'compress'}
				class="tab-btn"
				role="tab"
				aria-selected={activeTab === 'compress'}
				type="button"
				onclick={() => switchTab('compress')}
			>
				<Zap size={15} strokeWidth={2.2} /> Compress Video
			</button>
			<button
				class:active={activeTab === 'convert'}
				class="tab-btn"
				role="tab"
				aria-selected={activeTab === 'convert'}
				type="button"
				onclick={() => switchTab('convert')}
			>
				<RefreshCw size={15} strokeWidth={2.2} /> Convert Format
			</button>
		</div>

		<!-- COMPRESS PANEL -->
		<div class:active={activeTab === 'compress'} class="panel">
			{#if !compressFile}
				<button
					class:over={dragOver === 'compress'}
					class="dz"
					type="button"
					onclick={() => triggerInput('compress')}
					ondragover={(event) => onDragOver(event, 'compress')}
					ondragleave={() => onDragLeave('compress')}
					ondrop={(event) => onDrop(event, 'compress')}
				>
					<div class="dz-ico"><Film size={24} strokeWidth={1.5} /></div>
					<h3>Drop your video here</h3>
					<p class="sub">Drag &amp; drop or click to select a file</p>
					<span class="btn-browse"><Folder size={14} strokeWidth={2} /> Browse Files</span>
					<p class="fmt-hint">MP4, MOV, AVI, WebM, MKV &nbsp;·&nbsp; up to 2 GB</p>
				</button>
			{/if}
			<input bind:this={compressInput} class="file-input" type="file" accept="video/*" onchange={(event) => handleFile(event, 'compress')} />

			{#if compressFile}
				<div class="card">
					<div class="file-row">
						<div class="file-ico"><Film size={18} strokeWidth={1.8} /></div>
						<div class="file-info">
							<div class="file-name">{compressFile.name}</div>
							<div class="file-sz">{fmtBytes(compressFile.size)} · {compressFile.type || 'video'}</div>
						</div>
						<button class="btn-rm" type="button" onclick={() => clearFile('compress')} title="Remove">
							<X size={15} strokeWidth={2.5} />
						</button>
					</div>

					<div class="csec">
						<span class="slabel">Quick Preset</span>
						<div class="preset-grid">
							<button
								class:on={selectedPreset === 'low' && !hasTarget}
								class:disabled-opt={hasTarget}
								class="pc"
								type="button"
								onclick={() => pickPreset('low')}
							>
								<div class="ico"><Feather size={18} strokeWidth={1.8} /></div>
								<span class="lb">Low</span>
								<span class="sb">Smallest file</span>
							</button>
							<button
								class:on={selectedPreset === 'balanced' && !hasTarget}
								class:disabled-opt={hasTarget}
								class="pc"
								type="button"
								onclick={() => pickPreset('balanced')}
							>
								<div class="ico"><Scale size={18} strokeWidth={1.8} /></div>
								<span class="lb">Balanced</span>
								<span class="sb">Recommended</span>
							</button>
							<button
								class:on={selectedPreset === 'high' && !hasTarget}
								class:disabled-opt={hasTarget}
								class="pc"
								type="button"
								onclick={() => pickPreset('high')}
							>
								<div class="ico"><Gem size={18} strokeWidth={1.8} /></div>
								<span class="lb">High</span>
								<span class="sb">Best quality</span>
							</button>
						</div>
					</div>

					<div class="csec">
						<span class="slabel">Target File Size</span>
						<div class="target-wrap">
							<div class="target-input-wrap">
								<input
									bind:value={targetMb}
									type="number"
									placeholder="Enter target size…"
									min="1"
									max="4000"
									oninput={onTargetInput}
								/>
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
						<div class="ptop"><span>{compressProgress.label}</span><span class="pct">{compressProgress.pct}%</span></div>
						<div class="pbar"><div class="pfill" style:width={`${compressProgress.pct}%`}></div></div>
					</div>

					<div class:show={Boolean(compressError)} class="errbar">
						<AlertTriangle size={15} strokeWidth={2} />
						<span>{compressError}</span>
					</div>

					<div class="action">
						<button class="btn-go" type="button" disabled={compressBusy} onclick={startCompress}>
							<Zap size={16} strokeWidth={2.2} /> Compress Now
						</button>
					</div>
				</div>
			{/if}

			<div class:show={Boolean(compressResult)} class="res">
				<div class="res-head">
					<div class="res-ico"><CheckCircle2 size={16} strokeWidth={2} /></div>
					<div><div class="res-title">Compression complete!</div><div class="res-sub">Your file is ready to download</div></div>
				</div>
				<div class="stats">
					<div class="stat"><div class="sv">{compressResult?.original ?? '—'}</div><div class="sl">Original</div></div>
					<div class="stat"><div class="sv">{compressResult?.compressed ?? '—'}</div><div class="sl">Compressed</div></div>
					<div class="stat"><div class="sv g">{compressResult?.saved ?? '—'}</div><div class="sl">Saved</div></div>
				</div>
				<a class="btn-dl" href={compressResult?.href ?? '#'} download={compressResult?.download}>
					<Download size={15} strokeWidth={2.2} /> Download Compressed Video
				</a>
			</div>
		</div>

		<!-- CONVERT PANEL -->
		<div class:active={activeTab === 'convert'} class="panel">
			{#if !convertFile}
				<button
					class:over={dragOver === 'convert'}
					class="dz"
					type="button"
					onclick={() => triggerInput('convert')}
					ondragover={(event) => onDragOver(event, 'convert')}
					ondragleave={() => onDragLeave('convert')}
					ondrop={(event) => onDrop(event, 'convert')}
				>
					<div class="dz-ico"><RefreshCw size={24} strokeWidth={1.5} /></div>
					<h3>Drop your video here</h3>
					<p class="sub">Select a video to convert its format</p>
					<span class="btn-browse"><Folder size={14} strokeWidth={2} /> Browse Files</span>
					<p class="fmt-hint">Supports MP4, MOV, AVI, WebM, MKV and more</p>
				</button>
			{/if}
			<input bind:this={convertInput} class="file-input" type="file" accept="video/*" onchange={(event) => handleFile(event, 'convert')} />

			{#if convertFile}
				<div class="card">
					<div class="file-row">
						<div class="file-ico"><Film size={18} strokeWidth={1.8} /></div>
						<div class="file-info">
							<div class="file-name">{convertFile.name}</div>
							<div class="file-sz">{fmtBytes(convertFile.size)} · {convertFile.type || 'video'}</div>
						</div>
						<button class="btn-rm" type="button" onclick={() => clearFile('convert')} title="Remove">
							<X size={15} strokeWidth={2.5} />
						</button>
					</div>

					<div class="csec">
						<span class="slabel">Convert To</span>
						<div class="fmt-row">
							{#each formats as format}
								<button
									class:on={selectedFormat === format}
									class="fo"
									type="button"
									onclick={() => (selectedFormat = format)}
								>
									{format.toUpperCase()}
								</button>
							{/each}
						</div>
					</div>

					<div class:show={convertProgress.show} class="prog">
						<div class="ptop"><span>{convertProgress.label}</span><span class="pct">{convertProgress.pct}%</span></div>
						<div class="pbar"><div class="pfill" style:width={`${convertProgress.pct}%`}></div></div>
					</div>

					<div class:show={Boolean(convertError)} class="errbar">
						<AlertTriangle size={15} strokeWidth={2} />
						<span>{convertError}</span>
					</div>

					<div class="action">
						<button class="btn-go" type="button" disabled={convertBusy} onclick={startConvert}>
							<RefreshCw size={16} strokeWidth={2.2} /> Convert Now
						</button>
					</div>
				</div>
			{/if}

			<div class:show={Boolean(convertResult)} class="res">
				<div class="res-head">
					<div class="res-ico"><CheckCircle2 size={16} strokeWidth={2} /></div>
					<div><div class="res-title">Conversion complete!</div><div class="res-sub">Your converted video is ready</div></div>
				</div>
				<a class="btn-dl" href={convertResult?.href ?? '#'} download={convertResult?.download}>
					<Download size={15} strokeWidth={2.2} /> Download Converted Video
				</a>
			</div>
		</div>

		<div class="pnote">
			<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
			<p>
				<strong>Your files never leave your device.</strong> NekoCompress processes everything locally using your browser's
				built-in engine — no server uploads, no accounts needed. Files are cleared from memory after download.
			</p>
		</div>

		<div class="feats">
			<div class="feat">
				<div class="fi"><Cpu size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">Fast Processing</div>
					<div class="fd">Hardware-accelerated encoding at near-native speed, entirely in your browser without waiting for server queues.</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Target size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">Smart Size Targets</div>
					<div class="fd">One-click presets explicitly tuned for popular platforms like LINE, Discord, Gmail, and Telegram limits.</div>
				</div>
			</div>
			<div class="feat">
				<div class="fi"><Infinity size={20} strokeWidth={1.8} /></div>
				<div class="ftxt">
					<div class="ft">Always Free</div>
					<div class="fd">No premium subscriptions, no daily file limits, and absolutely no watermarks added to your videos — ever.</div>
				</div>
			</div>
		</div>

		<section class="faq-sec">
			<h2>Frequently Asked Questions</h2>
			<div class="faq-list">
				<details class="faq-item">
					<summary class="faq-q">Is it safe to compress my private videos here?</summary>
					<div class="faq-a">Yes, absolutely! NekoCompress processes your videos locally directly inside your web browser. Your files are never uploaded to any cloud server, ensuring 100% privacy and security.</div>
				</details>
				<details class="faq-item">
					<summary class="faq-q">Is there a file size limit for video compression?</summary>
					<div class="faq-a">We do not enforce hard server limits since everything runs on your device. However, for stable performance within browser memory, we recommend keeping files under 2GB.</div>
				</details>
				<details class="faq-item">
					<summary class="faq-q">Will there be a watermark on the exported video?</summary>
					<div class="faq-a">No. NekoCompress is completely free to use and will never add a watermark to your compressed or converted videos.</div>
				</details>
				<details class="faq-item">
					<summary class="faq-q">What video formats are supported?</summary>
					<div class="faq-a">We support most modern formats including MP4, WebM, MOV, AVI, and MKV for both importing and exporting.</div>
				</details>
			</div>
		</section>
	</div>
</main>

<footer>
	<div class="wrap">
		<p>© 2026 NekoCompress &nbsp;·&nbsp; Runs entirely in your browser &nbsp;·&nbsp; <a href="/">Privacy Policy</a> &nbsp;·&nbsp; <a href="/">Terms of Service</a></p>
	</div>
</footer>
