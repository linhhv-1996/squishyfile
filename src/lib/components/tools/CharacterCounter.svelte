<script lang="ts">
	import { Copy as CP, RotateCcw, ShieldCheck } from 'lucide-svelte';
	import RelatedTools from '$lib/components/RelatedTools.svelte';
	import { page } from '$app/stores';
	import { languages } from '$lib/i18n/languages';
	import { translations } from '$lib/i18n/translations';
	import type { RelatedTool } from '$lib/config/relatedTools';

	// ── Types ──────────────────────────────────────────────────────────────────
	type ToolPageType =
		| 'character-counter'
		| 'word-counter'
		| 'manuscript-counter'
		| 'sns-character-limit';

	type StatKey =
		| 'chars'
		| 'charsNoSpace'
		| 'words'
		| 'bytes'
		| 'sentences'
		| 'paragraphs'
		| 'lines'
		| 'readTime'
		| 'fullWidth'
		| 'halfWidth'
		| 'noPunct'
		| 'manuscript'
		| 'codePoints'
		| 'utf16Units'
		| 'visibleChars';

	type Copy = {
		placeholder: string;
		clearBtn: string;
		copyBtn: string;
		copiedBtn: string;

		// Primary stats
		statChars: string;
		statCharsNoSpace: string;
		statWords: string;
		statBytes: string;

		// Secondary stats
		statSentences: string;
		statParagraphs: string;
		statLines: string;
		statReadTime: string;

		// Advanced stats
		statFullWidth: string;
		statHalfWidth: string;
		statManuscript: string;
		statNoPunct: string;

		// Optional technical labels for byte-counter
		statCodePoints?: string;
		statUtf16Units?: string;
		statVisibleChars?: string;

		// Read time labels
		readTimeMin: (n: number) => string;
		readTimeSec: string;

		// Manuscript label
		manuscriptPage: (n: string) => string;

		privacyNote: string;
	};

	type Props = {
		copy: Copy;
		relatedTools?: RelatedTool[];
		pageType?: ToolPageType;
		primaryStats?: StatKey[];
		secondaryStats?: StatKey[];
	};

	let {
		copy,
		relatedTools = [],
		pageType = 'character-counter',
		primaryStats,
		secondaryStats
	}: Props = $props();

	// ── Result ordering presets ────────────────────────────────────────────────
	// pageType only sets the default focus/order. It does NOT navigate anywhere.
	// You can override primaryStats/secondaryStats manually from a route if needed.
	const RESULT_PRESETS: Record<ToolPageType, { primary: StatKey[]; secondary: StatKey[] }> = {
		'character-counter': {
			primary: ['chars', 'charsNoSpace', 'words', 'bytes'],
			secondary: [
				'sentences',
				'paragraphs',
				'lines',
				'readTime',
				'fullWidth',
				'halfWidth',
				'noPunct',
				'manuscript'
			]
		},

		'word-counter': {
			primary: ['words', 'chars', 'sentences', 'readTime'],
			secondary: [
				'charsNoSpace',
				'paragraphs',
				'lines',
				'bytes',
				'fullWidth',
				'halfWidth',
				'noPunct',
				'manuscript'
			]
		},

		'manuscript-counter': {
			primary: ['manuscript', 'chars', 'charsNoSpace', 'lines'],
			secondary: [
				'words',
				'sentences',
				'paragraphs',
				'readTime',
				'fullWidth',
				'halfWidth',
				'noPunct',
				'bytes'
			]
		},

		'sns-character-limit': {
			primary: ['chars', 'charsNoSpace', 'lines', 'readTime'],
			secondary: [
				'words',
				'sentences',
				'paragraphs',
				'bytes',
				'fullWidth',
				'halfWidth',
				'noPunct',
				'manuscript'
			]
		}
	};

	let activePrimaryStats = $derived(primaryStats ?? RESULT_PRESETS[pageType].primary);
	let activeSecondaryStats = $derived(secondaryStats ?? RESULT_PRESETS[pageType].secondary);

	// ── i18n ──────────────────────────────────────────────────────────────────
	let currentLangKey = $derived($page.params.lang || 'en');
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);

	let t = $derived(
		(key: string) => translations[activeLang.key]?.[key] || translations.en[key] || key
	);

	// ── State ──────────────────────────────────────────────────────────────────
	let text = $state('');
	let copied = $state(false);

	// ── Unicode helpers ────────────────────────────────────────────────────────
	// CJK/kana/hangul only. Used for reading-time estimate.
	const RE_CJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uAC00-\uD7AF]/g;

	// Full-width forms / punctuation / CJK symbols block.
	const RE_FULLWIDTH = /[\u3000-\u303F\uFF00-\uFFEF]/g;

	// Half-width: ASCII printable + half-width katakana.
	const RE_HALFWIDTH = /[\u0021-\u007E\uFF61-\uFF9F]/g;

	// Punctuation: Latin + common JP/ZH full-width punctuation.
	const RE_PUNCT =
		/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u3000-\u303F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\u30FB\u00B7]/g;

	function getSegmenter(granularity: 'grapheme' | 'word' | 'sentence') {
		const IntlWithSegmenter = Intl as typeof Intl & {
			Segmenter?: new (
				locales?: string | string[],
				options?: { granularity: 'grapheme' | 'word' | 'sentence' }
			) => {
				segment: (input: string) => Iterable<{
					segment: string;
					isWordLike?: boolean;
				}>;
			};
		};

		if (!IntlWithSegmenter.Segmenter) return null;

		try {
			// Locale is intentionally undefined:
			// route language != pasted input language.
			return new IntlWithSegmenter.Segmenter(undefined, { granularity });
		} catch {
			return null;
		}
	}

	function countVisibleCharacters(str: string): number {
		if (!str) return 0;

		const segmenter = getSegmenter('grapheme');
		if (segmenter) {
			return [...segmenter.segment(str)].length;
		}

		// Better fallback than .length for surrogate pairs.
		return Array.from(str).length;
	}

	function countWords(str: string): number {
		if (!str.trim()) return 0;

		const segmenter = getSegmenter('word');
		if (segmenter) {
			return [...segmenter.segment(str)].filter((s) => s.isWordLike).length;
		}

		// Best-effort fallback for Latin-like text.
		return (str.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
	}

	function countSentences(str: string): number {
		if (!str.trim()) return 0;

		const segmenter = getSegmenter('sentence');
		if (segmenter) {
			return [...segmenter.segment(str)].filter((s) => s.segment.trim().length > 0).length;
		}

		return (str.match(/[.!?。！？…]+/g) ?? []).length || 1;
	}

	// ── Stats ──────────────────────────────────────────────────────────────────
	// Visible characters / grapheme clusters — what users usually expect as chars.
	let chars = $derived(countVisibleCharacters(text));
	let charsNoSpace = $derived(countVisibleCharacters(text.replace(/\s/g, '')));
	let visibleChars = $derived(chars);

	// Technical counts.
	let bytes = $derived(new TextEncoder().encode(text).length);
	let codePoints = $derived(Array.from(text).length);
	let utf16Units = $derived(text.length);

	let fullWidthCount = $derived((text.match(RE_FULLWIDTH) ?? []).length);
	let halfWidthCount = $derived((text.match(RE_HALFWIDTH) ?? []).length);

	// Characters minus punctuation and whitespace.
	let noPunctCount = $derived(
		countVisibleCharacters(text.replace(RE_PUNCT, '').replace(/\s/g, ''))
	);

	let words = $derived(countWords(text));
	let sentences = $derived(countSentences(text));

	let paragraphs = $derived(
		text.trim() === '' ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim()).length || 1
	);

	let lines = $derived(text === '' ? 0 : text.split('\n').length);

	// Manuscript pages (原稿用紙): standard JP 400-character grid.
	let manuscriptPages = $derived((charsNoSpace / 400).toFixed(1));

	// Reading time estimate:
	// - CJK-like chars: ~500 chars/min
	// - Latin-like words: ~238 words/min
	// This is an estimate, not language detection.
	let readTimeSecs = $derived((): number => {
		if (!text.trim()) return 0;

		const cjkCount = (text.match(RE_CJK) ?? []).length;
		const latinishText = text.replace(RE_CJK, ' ');
		const latinWords = countWords(latinishText);

		const secsCjk = (cjkCount / 500) * 60;
		const secsLatin = (latinWords / 238) * 60;

		return Math.ceil(secsCjk + secsLatin);
	});

	let readTimeDisplay = $derived(
		chars === 0
			? '—'
			: readTimeSecs() < 60
				? copy.readTimeSec
				: copy.readTimeMin(Math.ceil(readTimeSecs() / 60))
	);

	function formatValue(value: number | string): string {
		return typeof value === 'number' ? value.toLocaleString() : value;
	}

	function getStatLabel(key: StatKey): string {
		switch (key) {
			case 'chars':
				return copy.statChars;
			case 'charsNoSpace':
				return copy.statCharsNoSpace;
			case 'words':
				return copy.statWords;
			case 'bytes':
				return copy.statBytes;
			case 'sentences':
				return copy.statSentences;
			case 'paragraphs':
				return copy.statParagraphs;
			case 'lines':
				return copy.statLines;
			case 'readTime':
				return copy.statReadTime;
			case 'fullWidth':
				return copy.statFullWidth;
			case 'halfWidth':
				return copy.statHalfWidth;
			case 'noPunct':
				return copy.statNoPunct;
			case 'manuscript':
				return copy.statManuscript;
			case 'codePoints':
				return copy.statCodePoints ?? 'Unicode code points';
			case 'utf16Units':
				return copy.statUtf16Units ?? 'UTF-16 units';
			case 'visibleChars':
				return copy.statVisibleChars ?? copy.statChars;
		}
	}

	function getStatValue(key: StatKey): number | string {
		switch (key) {
			case 'chars':
				return chars;
			case 'charsNoSpace':
				return charsNoSpace;
			case 'words':
				return words;
			case 'bytes':
				return bytes;
			case 'sentences':
				return sentences;
			case 'paragraphs':
				return paragraphs;
			case 'lines':
				return lines;
			case 'readTime':
				return readTimeDisplay;
			case 'fullWidth':
				return fullWidthCount;
			case 'halfWidth':
				return halfWidthCount;
			case 'noPunct':
				return noPunctCount;
			case 'manuscript':
				return copy.manuscriptPage(manuscriptPages);
			case 'codePoints':
				return codePoints;
			case 'utf16Units':
				return utf16Units;
			case 'visibleChars':
				return visibleChars;
		}
	}

	// ── Actions ────────────────────────────────────────────────────────────────
	function clearText() {
		text = '';
	}

	function getResultsText(): string {
		const statKeys = [...activePrimaryStats, ...activeSecondaryStats];

		return statKeys
			.map((statKey) => `${getStatLabel(statKey)}: ${formatValue(getStatValue(statKey))}`)
			.join('\n');
	}

	async function copyText() {
		if (!text) return;

		try {
			await navigator.clipboard.writeText(getResultsText());
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			// Clipboard can fail in insecure contexts; no-op is fine.
		}
	}
</script>

<!-- ── Textarea ───────────────────────────────────────────────────────────── -->
<div class="cc-wrap">
	<div class="cc-editor">
		<textarea
			class="cc-textarea"
			placeholder={copy.placeholder}
			bind:value={text}
			spellcheck="false"
		></textarea>

		<div class="cc-toolbar">
			<button class="cc-tool-btn" type="button" onclick={copyText} disabled={!text}>
				<CP size={13} strokeWidth={2.2} />
				{copied ? copy.copiedBtn : copy.copyBtn}
			</button>

			<button
				class="cc-tool-btn cc-tool-btn--ghost"
				type="button"
				onclick={clearText}
				disabled={!text}
			>
				<RotateCcw size={13} strokeWidth={2.2} />
				{copy.clearBtn}
			</button>
		</div>
	</div>

	<!-- ── Primary stats ─────────────────────────────────────────────────────── -->
	<div class="cc-primary">
		{#each activePrimaryStats as statKey}
			<div class="cc-pstat">
				<span class="cc-pstat-val">{formatValue(getStatValue(statKey))}</span>
				<span class="cc-pstat-label">{getStatLabel(statKey)}</span>
			</div>
		{/each}
	</div>

	<!-- ── Secondary stats ───────────────────────────────────────────────────── -->
	<div class="cc-secondary">
		{#each activeSecondaryStats as statKey}
			<div class="cc-sstat">
				<span class={typeof getStatValue(statKey) === 'string'
					? 'cc-sstat-val cc-sstat-val--sm'
					: 'cc-sstat-val'}
				>
					{formatValue(getStatValue(statKey))}
				</span>
				<span class="cc-sstat-label">{getStatLabel(statKey)}</span>
			</div>
		{/each}
	</div>

	{#if relatedTools.length > 0}
		<RelatedTools label={t('relatedTools.label')} tools={relatedTools} />
	{/if}
</div>

<!-- Privacy note -->
<div class="pnote">
	<span class="ni"><ShieldCheck size={16} strokeWidth={2} /></span>
	<p>{@html copy.privacyNote}</p>
</div>

<style>
	/* ── Wrapper ──────────────────────────────────────────────────────────────── */
	.cc-wrap {
		background: var(--surf);
		border: 1px solid var(--border);
		border-radius: var(--r);
		overflow: hidden;
		margin-bottom: 10px;
	}

	/* ── Textarea ─────────────────────────────────────────────────────────────── */
	.cc-editor {
		display: flex;
		flex-direction: column;
	}

	.cc-textarea {
		width: 100%;
		min-height: 200px;
		padding: 14px 16px;
		border: none;
		border-bottom: 1px solid var(--border);
		background: var(--bg);
		font-size: 14px;
		line-height: 1.7;
		color: var(--text);
		resize: vertical;
		outline: none;
		box-sizing: border-box;
		font-family: inherit;
	}

	.cc-textarea::placeholder {
		color: var(--muted);
		opacity: 0.55;
	}

	/* ── Toolbar ──────────────────────────────────────────────────────────────── */
	.cc-toolbar {
		display: flex;
		gap: 6px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border);
		background: var(--surf);
	}

	.cc-tool-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 12px;
		font-weight: 500;
		color: var(--text);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.cc-tool-btn:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}

	.cc-tool-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.cc-tool-btn--ghost {
		background: none;
		border-color: transparent;
		color: var(--muted);
	}

	.cc-tool-btn--ghost:hover:not(:disabled) {
		background: var(--bg);
		border-color: var(--border);
		color: var(--text);
	}

	/* ── Primary stats ───────────────────────────────────────────────────────── */
	.cc-primary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		border-bottom: 1px solid var(--border);
	}

	@media (max-width: 480px) {
		.cc-primary {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.cc-pstat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 16px 8px 14px;
		gap: 4px;
		border-right: 1px solid var(--border);
	}

	.cc-pstat:last-child {
		border-right: none;
	}

	@media (max-width: 480px) {
		.cc-pstat:nth-child(2) {
			border-right: none;
		}

		.cc-pstat:nth-child(3) {
			border-right: 1px solid var(--border);
		}

		.cc-pstat:nth-child(n + 3) {
			border-top: 1px solid var(--border);
		}
	}

	.cc-pstat-val {
		font-size: 26px;
		font-weight: 700;
		color: var(--accent);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.cc-pstat-label {
		font-size: 11.5px;
		font-weight: 500;
		color: var(--muted);
		text-align: center;
	}

	/* ── Secondary stats ─────────────────────────────────────────────────────── */
	.cc-secondary {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		background: var(--bg);
	}

	@media (max-width: 480px) {
		.cc-secondary {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.cc-sstat {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 11px 8px 10px;
		gap: 3px;
		border-right: 1px solid var(--border);
		border-top: 1px solid var(--border);
	}

	.cc-sstat:nth-child(4n) {
		border-right: none;
	}

	@media (max-width: 480px) {
		.cc-sstat:nth-child(4n) {
			border-right: 1px solid var(--border);
		}

		.cc-sstat:nth-child(2n) {
			border-right: none;
		}
	}

	.cc-sstat-val {
		font-size: 18px;
		font-weight: 600;
		color: var(--text);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.cc-sstat-val--sm {
		font-size: 14px;
	}

	.cc-sstat-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--muted);
		text-align: center;
		line-height: 1.3;
	}

	/* ── Privacy note ─────────────────────────────────────────────────────────── */
	:global(.pnote) {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 12px;
		color: var(--muted);
	}

	:global(.pnote .ni) {
		flex-shrink: 0;
		margin-top: 1px;
		opacity: 0.7;
	}

	:global(.pnote p) {
		margin: 0;
		line-height: 1.5;
	}
</style>
