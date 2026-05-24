<script lang="ts">
	import {
		AlertTriangle,
		BarChart2,
		CheckCircle2,
		Download,
		Layers,
		Plus,
		ShieldCheck,
		X,
		Zap,
	} from 'lucide-svelte';
	import RelatedTools from '$lib/components/RelatedTools.svelte';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';

	// ── Types ──────────────────────────────────────────────────────────────────
	type BarcodeFormat =
		| 'CODE128'
		| 'CODE39'
		| 'EAN13'
		| 'EAN8'
		| 'JAN'
		| 'UPCA'
		| 'UPCE'
		| 'ITF14'
		| 'MSI'
		| 'pharmacode'
		| 'codabar';

	type BulkEntry = {
		id: string;
		value: string;
		dataUrl: string | null;
		svgString: string | null;
		error: string;
	};

	type FormatOption = {
		value: BarcodeFormat;
		label: string;
		sub?: string;
	};

	type Copy = {
		modeLabel: string;
		modeSingle: string;
		modeBulk: string;
		valueLabel: string;
		valuePlaceholder: string;
		formatLabel: string;
		heightLabel: string;
		lineWidthLabel: string;
		showTextLabel: string;
		showTextOn: string;
		showTextOff: string;
		customTextLabel: string;
		customTextPlaceholder: string;
		outputLabel: string;
		generateButton: string;
		generateAllButton: string;
		addRow: string;
		download: string;
		downloadAll: string;
		newBarcode: string;
		resultTitle: string;
		resultBulkDone: string;
		privacyNote: string;
		errorEmpty: string;
		errorInvalid: string;
		errorGenerate: string;
		remove: string;
		formatOptions?: FormatOption[];
	};

	let {
		copy,
		relatedTools = [] as { href: string; label: string; icon?: any }[],
		initialFormat = undefined as BarcodeFormat | undefined,
		type = undefined as string | undefined,
	} = $props<{
		copy: Copy;
		relatedTools?: { href: string; label: string; icon?: any }[];
		initialFormat?: BarcodeFormat;
		type?: string;
	}>();

	// ── i18n ──────────────────────────────────────────────────────────────────
	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived(
		(key: string) => translations[activeLang.key]?.[key] || translations['en'][key] || key,
	);

	// ── Format options ─────────────────────────────────────────────────────────
	const defaultFormats: FormatOption[] = [
		{ value: 'CODE128', label: 'CODE 128', sub: 'Universal' },
		{ value: 'CODE39', label: 'CODE 39', sub: 'Alphanumeric' },
		{ value: 'EAN13', label: 'EAN-13', sub: 'Retail' },
		{ value: 'JAN', label: 'JAN', sub: 'Japan retail' },
		{ value: 'EAN8', label: 'EAN-8', sub: 'Small retail' },
		{ value: 'UPCA', label: 'UPC-A', sub: 'US retail' },
		{ value: 'ITF14', label: 'ITF-14', sub: 'Shipping' },
	];
	let formatOptions = $derived(copy.formatOptions ?? defaultFormats);

	function normalizeFormat(value?: string): BarcodeFormat | undefined {
		if (!value) return undefined;
		const normalized = value.trim().toUpperCase();
		if (normalized === 'JAN' || normalized === 'JAN13' || normalized === 'JAN-13') return 'JAN';
		if (normalized === 'EAN13' || normalized === 'EAN-13') return 'EAN13';
		if (normalized === 'EAN8' || normalized === 'EAN-8') return 'EAN8';
		if (normalized === 'UPCA' || normalized === 'UPC-A') return 'UPCA';
		if (normalized === 'UPCE' || normalized === 'UPC-E') return 'UPCE';
		if (normalized === 'ITF14' || normalized === 'ITF-14') return 'ITF14';
		if (normalized === 'CODE128' || normalized === 'CODE-128') return 'CODE128';
		if (normalized === 'CODE39' || normalized === 'CODE-39') return 'CODE39';
		if (normalized === 'MSI') return 'MSI';
		if (normalized === 'PHARMACODE') return 'pharmacode';
		if (normalized === 'CODABAR') return 'codabar';
		return undefined;
	}

	// ── Shared options ─────────────────────────────────────────────────────────
	let barcodeFormat = $state<BarcodeFormat>(
		normalizeFormat(untrack(() => type)) ?? untrack(() => initialFormat) ?? 'CODE128',
	);

	let height = $state(100);
	let lineWidth = $state(2);
	let showText = $state(true);
	let outputFormat = $state<'png' | 'svg'>('png');

	// ── Mode ───────────────────────────────────────────────────────────────────
	let mode = $state<'single' | 'bulk'>('single');

	// ── Single ─────────────────────────────────────────────────────────────────
	let singleValue = $state('');
	let singleCustomText = $state('');
	let singleError = $state('');
	let singleResult = $state<{ dataUrl: string; svgString: string; filename: string } | null>(null);

	// ── Bulk ───────────────────────────────────────────────────────────────────
	function uid() {
		return Math.random().toString(36).slice(2, 10);
	}
	let entries = $state<BulkEntry[]>([{ id: uid(), value: '', dataUrl: null, svgString: null, error: '' }]);

	let busy = $state(false);

	// ── Lazy-load JsBarcode ────────────────────────────────────────────────────
	let JsBarcode: any = null;
	let JSZip: any = null;

	async function loadJsBarcode() {
		if (!JsBarcode) {
			const mod = await import('jsbarcode');
			JsBarcode = mod.default ?? mod;
		}
	}
	async function loadJSZip() {
		if (!JSZip) {
			const mod = await import('jszip');
			JSZip = mod.default ?? mod;
		}
	}

	// ── Barcode generation helpers ─────────────────────────────────────────────
	const jsBarcodeOptions = $derived({
		format: barcodeFormat === 'JAN' ? 'EAN13' : barcodeFormat,
		height,
		width: lineWidth,
		displayValue: showText,
		margin: 10,
		background: '#ffffff',
		lineColor: '#000000',
		fontOptions: '',
		font: 'monospace',
		textAlign: 'center',
		textPosition: 'bottom',
		fontSize: 14,
	});

	async function renderToPng(value: string, text?: string): Promise<string> {
		await loadJsBarcode();
		const canvas = document.createElement('canvas');
		const opts = text ? { ...jsBarcodeOptions, text } : { ...jsBarcodeOptions };
		JsBarcode(canvas, value, opts);
		return canvas.toDataURL('image/png');
	}

	async function renderToSvg(value: string, text?: string): Promise<string> {
		await loadJsBarcode();
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const opts = text ? { ...jsBarcodeOptions, text } : { ...jsBarcodeOptions };
		JsBarcode(svg, value, { ...opts, xmlDocument: document });
		const serializer = new XMLSerializer();
		return serializer.serializeToString(svg);
	}

	// ── Single generate / download ─────────────────────────────────────────────
	async function generateSingle() {
		if (!singleValue.trim()) {
			singleError = copy.errorEmpty;
			return;
		}
		singleError = '';
		busy = true;
		try {
			const text = singleCustomText.trim() || undefined;
			const dataUrl = await renderToPng(singleValue.trim(), text);
			const svgString = await renderToSvg(singleValue.trim(), text);
			singleResult = {
				dataUrl,
				svgString,
				filename: singleValue.trim().replace(/\W+/g, '-').slice(0, 60) || 'barcode',
			};
		} catch {
			singleError = copy.errorInvalid;
		} finally {
			busy = false;
		}
	}

	function downloadSingle() {
		if (!singleResult) return;
		if (outputFormat === 'png') {
			const a = document.createElement('a');
			a.href = singleResult.dataUrl;
			a.download = `${singleResult.filename}.png`;
			a.click();
		} else {
			const blob = new Blob([singleResult.svgString], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${singleResult.filename}.svg`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}

	function resetSingle() {
		singleResult = null;
		singleValue = '';
		singleCustomText = '';
		singleError = '';
	}

	// ── Bulk generate / download ───────────────────────────────────────────────
	async function generateAll() {
		const hasAny = entries.some((e) => e.value.trim());
		if (!hasAny) {
			entries = entries.map((e) => ({ ...e, error: copy.errorEmpty }));
			return;
		}
		busy = true;
		const updated = await Promise.all(
			entries.map(async (e) => {
				if (!e.value.trim()) return { ...e, dataUrl: null, svgString: null, error: '' };
				try {
					const dataUrl = await renderToPng(e.value.trim());
					const svgString = await renderToSvg(e.value.trim());
					return { ...e, dataUrl, svgString, error: '' };
				} catch {
					return { ...e, dataUrl: null, svgString: null, error: copy.errorInvalid };
				}
			}),
		);
		entries = updated;
		busy = false;
	}

	function downloadEntry(e: BulkEntry) {
		const filename = e.value.trim().replace(/\W+/g, '-').slice(0, 60) || 'barcode';
		if (outputFormat === 'svg' && e.svgString) {
			const blob = new Blob([e.svgString], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${filename}.svg`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} else {
			if (!e.dataUrl) return;
			const a = document.createElement('a');
			a.href = e.dataUrl;
			a.download = `${filename}.png`;
			a.click();
		}
	}

	async function downloadAllZip() {
		const ready = entries.filter((e) => e.dataUrl);
		if (!ready.length) return;
		await loadJSZip();
		const zip = new JSZip();
		const usedNames = new Map<string, number>();
		const ext = outputFormat === 'svg' ? 'svg' : 'png';
		for (const e of ready) {
			const base = e.value.trim().replace(/\W+/g, '-').slice(0, 60) || 'barcode';
			const count = usedNames.get(base) ?? 0;
			usedNames.set(base, count + 1);
			const name = count > 0 ? `${base}-${count}.${ext}` : `${base}.${ext}`;
			if (outputFormat === 'svg' && e.svgString) {
				zip.file(name, e.svgString);
			} else {
				const b64 = e.dataUrl!.split(',')[1];
				zip.file(name, b64, { base64: true });
			}
		}
		const blob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'barcodes.zip';
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 2000);
	}

	function resetBulk() {
		entries = [{ id: uid(), value: '', dataUrl: null, svgString: null, error: '' }];
	}

	function addRow() {
		entries = [...entries, { id: uid(), value: '', dataUrl: null, svgString: null, error: '' }];
	}

	function removeRow(id: string) {
		if (entries.length <= 1) return;
		entries = entries.filter((e) => e.id !== id);
	}

	function updateEntry(id: string, value: string) {
		entries = entries.map((e) => (e.id === id ? { ...e, value, dataUrl: null, svgString: null } : e));
	}

	let bulkDone = $derived(entries.some((e) => e.dataUrl));
	let readyCount = $derived(entries.filter((e) => e.dataUrl).length);
</script>

<!-- ── Mode switcher ──────────────────────────────────────────────────────── -->
<div class="mode-row">
	<button
		class="mode-btn"
		class:mode-btn--on={mode === 'single'}
		type="button"
		onclick={() => {
			mode = 'single';
			singleResult = null;
		}}
	>
		<BarChart2 size={14} strokeWidth={2} />
		{copy.modeSingle}
	</button>
	<button
		class="mode-btn"
		class:mode-btn--on={mode === 'bulk'}
		type="button"
		onclick={() => {
			mode = 'bulk';
		}}
	>
		<Layers size={14} strokeWidth={2} />
		{copy.modeBulk}
	</button>
</div>

<!-- ════════════════════════════ SINGLE ════════════════════════════════════ -->
{#if mode === 'single' && !singleResult}
	<div class="p-card">
		<!-- Value input -->
		<div class="p-row">
			<span class="p-label">{copy.valueLabel}</span>
			<input
				class="p-input"
				type="text"
				placeholder={copy.valuePlaceholder}
				bind:value={singleValue}
				disabled={busy}
			/>
		</div>

		<!-- Barcode format -->
		<div class="p-row">
			<span class="p-label">{copy.formatLabel}</span>
			<div class="p-opts p-opts--wrap">
				{#each formatOptions as opt}
					<button
						class="p-opt"
						class:p-opt--on={barcodeFormat === opt.value}
						type="button"
						disabled={busy}
						onclick={() => (barcodeFormat = opt.value)}
					>
						{opt.label}
						{#if opt.sub}<span class="p-opt-sub">{opt.sub}</span>{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Height -->
		<div class="p-row">
			<span class="p-label">{copy.heightLabel}</span>
			<div class="p-opts">
				{#each [50, 80, 100, 150] as h}
					<button
						class="p-opt"
						class:p-opt--on={height === h}
						type="button"
						disabled={busy}
						onclick={() => (height = h)}
					>
						{h}px
					</button>
				{/each}
			</div>
		</div>

		<!-- Show text -->
		<div class="p-row">
			<span class="p-label">{copy.showTextLabel}</span>
			<div class="p-opts">
				<button
					class="p-opt"
					class:p-opt--on={showText}
					type="button"
					disabled={busy}
					onclick={() => (showText = true)}
				>
					{copy.showTextOn}
				</button>
				<button
					class="p-opt"
					class:p-opt--on={!showText}
					type="button"
					disabled={busy}
					onclick={() => (showText = false)}
				>
					{copy.showTextOff}
				</button>
			</div>
		</div>

		<!-- {#if showText}
			<div class="p-row">
				<span class="p-label">{copy.customTextLabel}</span>
				<input
					class="p-input"
					type="text"
					placeholder={copy.customTextPlaceholder}
					bind:value={singleCustomText}
					disabled={busy}
				/>
			</div>
		{/if} -->

		<!-- File format -->
		<div class="p-row">
			<span class="p-label">{copy.outputLabel}</span>
			<div class="p-opts">
				<button
					class="p-opt"
					class:p-opt--on={outputFormat === 'png'}
					type="button"
					disabled={busy}
					onclick={() => (outputFormat = 'png')}
				>
					PNG
				</button>
				<button
					class="p-opt"
					class:p-opt--on={outputFormat === 'svg'}
					type="button"
					disabled={busy}
					onclick={() => (outputFormat = 'svg')}
				>
					SVG
				</button>
			</div>
		</div>

		<!-- Error -->
		{#if singleError}
			<div class="p-error">
				<AlertTriangle size={14} strokeWidth={2} />
				<span>{singleError}</span>
			</div>
		{/if}

		<!-- Action -->
		<div class="p-action">
			<button class="p-submit" type="button" disabled={busy} onclick={generateSingle}>
				<Zap size={15} strokeWidth={2.2} />
				{copy.generateButton}
			</button>
		</div>
	</div>
{/if}

<!-- ── Single result ──────────────────────────────────────────────────────── -->
{#if mode === 'single' && singleResult}
	<div class="p-result">
		<div class="p-result-head">
			<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
			<div>
				<div class="p-result-title">{copy.resultTitle}</div>
				<div class="p-result-stats">
					{barcodeFormat} · {height}px · {outputFormat.toUpperCase()}
				</div>
			</div>
		</div>

		<div class="barcode-preview">
			<img src={singleResult.dataUrl} alt="Barcode" />
		</div>

		<div class="p-result-actions">
			<button class="p-btn-dl" type="button" onclick={downloadSingle}>
				<Download size={15} strokeWidth={2.2} />
				{copy.download}
			</button>
			<button class="p-btn-new" type="button" onclick={resetSingle}>
				{copy.newBarcode}
			</button>
		</div>

		{#if relatedTools.length > 0}
			<RelatedTools label={t('relatedTools.label')} tools={relatedTools} />
		{/if}
	</div>
{/if}

<!-- ════════════════════════════ BULK ══════════════════════════════════════ -->
{#if mode === 'bulk' && !bulkDone}
	<div class="p-card">
		<!-- Column header -->
		<div class="bulk-header">
			<span class="p-label">Value / Number</span>
			<span style="width:28px"></span>
		</div>

		<!-- Rows -->
		{#each entries as entry (entry.id)}
			<div class="bulk-row">
				<input
					class="p-input"
					type="text"
					placeholder={copy.valuePlaceholder}
					value={entry.value}
					disabled={busy}
					oninput={(e) => updateEntry(entry.id, (e.target as HTMLInputElement).value)}
				/>
				<button
					class="p-remove"
					type="button"
					title={copy.remove}
					onclick={() => removeRow(entry.id)}
					disabled={busy || entries.length <= 1}
				>
					<X size={13} strokeWidth={2.5} />
				</button>
			</div>
			{#if entry.error}
				<p class="bulk-row-error">
					<AlertTriangle
						size={12}
						strokeWidth={2}
						style="display:inline;vertical-align:-1px;margin-right:4px"
					/>
					{entry.error}
				</p>
			{/if}
		{/each}

		<!-- Add row -->
		<button class="add-row-btn" type="button" onclick={addRow} disabled={busy}>
			<Plus size={13} strokeWidth={2.5} />
			{copy.addRow}
		</button>

		<!-- Options -->
		<div class="p-row p-row--sep">
			<span class="p-label">{copy.formatLabel}</span>
			<div class="p-opts p-opts--wrap">
				{#each formatOptions as opt}
					<button
						class="p-opt"
						class:p-opt--on={barcodeFormat === opt.value}
						type="button"
						disabled={busy}
						onclick={() => (barcodeFormat = opt.value)}
					>
						{opt.label}
						{#if opt.sub}<span class="p-opt-sub">{opt.sub}</span>{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="p-row">
			<span class="p-label">{copy.heightLabel}</span>
			<div class="p-opts">
				{#each [50, 80, 100, 150] as h}
					<button
						class="p-opt"
						class:p-opt--on={height === h}
						type="button"
						disabled={busy}
						onclick={() => (height = h)}
					>
						{h}px
					</button>
				{/each}
			</div>
		</div>

		<div class="p-row">
			<span class="p-label">{copy.showTextLabel}</span>
			<div class="p-opts">
				<button
					class="p-opt"
					class:p-opt--on={showText}
					type="button"
					disabled={busy}
					onclick={() => (showText = true)}
				>
					{copy.showTextOn}
				</button>
				<button
					class="p-opt"
					class:p-opt--on={!showText}
					type="button"
					disabled={busy}
					onclick={() => (showText = false)}
				>
					{copy.showTextOff}
				</button>
			</div>
		</div>

		<!-- File format -->
		<div class="p-row">
			<span class="p-label">{copy.outputLabel}</span>
			<div class="p-opts">
				<button
					class="p-opt"
					class:p-opt--on={outputFormat === 'png'}
					type="button"
					disabled={busy}
					onclick={() => (outputFormat = 'png')}
				>
					PNG
				</button>
				<button
					class="p-opt"
					class:p-opt--on={outputFormat === 'svg'}
					type="button"
					disabled={busy}
					onclick={() => (outputFormat = 'svg')}
				>
					SVG
				</button>
			</div>
		</div>

		<!-- Action -->
		<div class="p-action">
			<button class="p-submit" type="button" disabled={busy} onclick={generateAll}>
				<Zap size={15} strokeWidth={2.2} />
				{copy.generateAllButton}
			</button>
		</div>
	</div>
{/if}

<!-- ── Bulk result ─────────────────────────────────────────────────────────── -->
{#if mode === 'bulk' && bulkDone}
	<div class="p-result">
		<div class="p-result-head">
			<div class="p-result-ico"><CheckCircle2 size={15} strokeWidth={2.2} /></div>
			<div>
				<div class="p-result-title">{copy.resultBulkDone.replace('{n}', String(readyCount))}</div>
				<div class="p-result-stats">{barcodeFormat} · {height}px · {outputFormat.toUpperCase()}</div>
			</div>
		</div>

		<!-- Barcode grid -->
		<div class="bulk-result-grid">
			{#each entries.filter((e) => e.dataUrl) as entry (entry.id)}
				<button
					class="bulk-result-item"
					type="button"
					onclick={() => downloadEntry(entry)}
					title={entry.value}
				>
					<img src={entry.dataUrl} alt={entry.value} />
					<div class="bulk-result-overlay">
						<Download size={22} strokeWidth={2} />
					</div>
				</button>
			{/each}
		</div>

		<!-- Actions -->
		<div class="p-result-actions">
			<button class="p-btn-dl" type="button" onclick={downloadAllZip}>
				<Download size={15} strokeWidth={2.2} />
				{copy.downloadAll} ({readyCount})
			</button>
			<button class="p-btn-new" type="button" onclick={resetBulk}>
				{copy.newBarcode}
			</button>
		</div>

		{#if relatedTools.length > 0}
			<div style="padding:0 16px 12px">
				<RelatedTools label={t('relatedTools.label')} tools={relatedTools} />
			</div>
		{/if}
	</div>
{/if}

<!-- Privacy note -->
<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>

<style>
	/* ── Mode row ────────────────────────────────────────────────────────────── */
	.mode-row {
		display: flex;
		gap: 6px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}
	.mode-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: var(--r);
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 13px;
		font-weight: 500;
		color: var(--muted);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s, background 0.15s;
	}
	.mode-btn:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.mode-btn--on {
		border-color: var(--accent);
		background: var(--surf);
		color: var(--accent);
	}

	/* ── Card ─────────────────────────────────────────────────────────────────── */
	.p-card {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* ── Row ──────────────────────────────────────────────────────────────────── */
	.p-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}
	.p-row--sep {
		border-top: 1px solid var(--border);
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

	/* ── Input ────────────────────────────────────────────────────────────────── */
	.p-input {
		flex: 1;
		padding: 7px 10px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 13px;
		color: var(--text);
		outline: none;
		transition: border-color 0.15s;
		width: 100%;
		box-sizing: border-box;
	}
	.p-input:focus {
		border-color: var(--accent);
	}
	.p-input:disabled {
		opacity: 0.5;
	}

	/* ── Option buttons ───────────────────────────────────────────────────────── */
	.p-opts {
		display: flex;
		gap: 6px;
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
	.p-opt:hover {
		border-color: var(--accent);
	}
	.p-opt--on {
		border-color: var(--accent);
		background: var(--surf);
		color: var(--accent);
	}
	.p-opt:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.p-opt-sub {
		font-size: 11px;
		font-weight: 400;
		color: var(--muted);
	}
	.p-opt--on .p-opt-sub {
		color: var(--accent);
		opacity: 0.7;
	}

	/* ── Error ────────────────────────────────────────────────────────────────── */
	.p-error {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 16px;
		font-size: 12.5px;
		color: #e05252;
		border-top: 1px solid var(--border);
	}

	/* ── Submit ───────────────────────────────────────────────────────────────── */
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
	.p-submit:hover {
		opacity: 0.88;
	}
	.p-submit:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* ── Result card ──────────────────────────────────────────────────────────── */
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

	/* ── Barcode preview ──────────────────────────────────────────────────────── */
	.barcode-preview {
		display: flex;
		justify-content: center;
		padding: 0px 16px;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		background: #fff;
	}
	.barcode-preview img {
		max-width: 100%;
		height: auto;
		display: block;
	}

	/* ── Result actions ───────────────────────────────────────────────────────── */
	.p-result-actions {
		padding: 12px 16px;
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
		cursor: pointer;
		border: none;
		transition: opacity 0.15s;
	}
	.p-btn-dl:hover {
		opacity: 0.88;
	}
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
	.p-btn-new:hover {
		color: var(--text);
	}

	/* ── Remove ───────────────────────────────────────────────────────────────── */
	.p-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.15s, background 0.15s;
	}
	.p-remove:hover {
		color: var(--text);
		background: var(--border);
	}
	.p-remove:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ── Bulk input ───────────────────────────────────────────────────────────── */
	.bulk-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px 6px;
		border-bottom: 1px solid var(--border);
	}
	.bulk-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--border);
	}
	.bulk-row .p-input {
		flex: 1;
	}
	.bulk-row-error {
		padding: 2px 16px 6px;
		font-size: 11.5px;
		color: #e05252;
		margin: 0;
	}
	.add-row-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 9px 16px;
		border: none;
		border-bottom: 1px solid var(--border);
		background: none;
		font-size: 13px;
		color: var(--muted);
		cursor: pointer;
		transition: background 0.15s;
		text-align: left;
	}
	.add-row-btn:hover {
		background: var(--surf);
		color: var(--text);
	}
	.add-row-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* ── Bulk result ──────────────────────────────────────────────────────────── */
	.bulk-result-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px;
		border-top: 1px solid var(--border);
		max-height: 320px;
		overflow-y: auto;
		overflow-x: hidden;
		background: var(--bg);
		box-sizing: border-box;
	}
	.bulk-result-item {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 10px 24px;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: var(--r);
		box-sizing: border-box;
		cursor: pointer;

		/* Important: để item tự cao theo barcode.
		   Không dùng overflow:hidden ở đây, vì barcode 100px/150px + text/margin
		   có thể cao hơn min-height và bị crop trên một số layout. */
		min-height: auto;
		height: auto;
		overflow: visible;
	}
	.bulk-result-item img {
		display: block;

		/* Không ép ảnh full width, vì barcode sẽ bị kéo méo/nhìn dính.
		   Chỉ scale xuống nếu barcode quá rộng so với card. */
		width: auto;
		max-width: 100%;
		height: auto;
		max-height: none;
		object-fit: contain;
	}
	.bulk-result-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--r);
		background: rgba(0, 0, 0, 0.42);
		color: #fff;
		opacity: 0;
		transition: opacity 0.15s;
		pointer-events: none;
	}
	.bulk-result-item:hover .bulk-result-overlay {
		opacity: 1;
	}
</style>
