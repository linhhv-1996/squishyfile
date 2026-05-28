import {
	Barcode,
	FileText,
	Image,
	Music,
	RefreshCcw,
	Type,
	Video,
	type Icon
} from 'lucide-svelte';

export type ToolSlug =
	| 'compress-video'
	| 'compress-pdf'
	| 'pdf-merge'
	| 'video-to-mp3'
	| 'video-converter'
	| 'mov-to-mp4'
	| 'avi-to-mp4'
	| 'mkv-to-mp4'
	| 'webm-to-mp4'
	| 'image-compressor'
	| 'jpg-compressor'
	| 'png-compressor'
	| 'reduce-image-size'
	| 'barcode-generator'
	| 'character-counter'
	| 'word-counter'
	| 'manuscript-counter'
	| 'sns-character-limit';

export type ToolConfig = {
	slug: ToolSlug;
	icon: typeof Icon;
	titleKey: string;
	descKey: string;
	related: ToolSlug[];
};

export type RelatedTool = {
	slug: ToolSlug;
	href: string;
	icon: typeof Icon;
	label: string;
	desc: string;
};

export const TOOL_CONFIG: Record<ToolSlug, ToolConfig> = {
	'compress-video': {
		slug: 'compress-video',
		icon: Video,
		titleKey: 'home.card.video.title',
		descKey: 'home.card.video.desc',
		related: ['compress-pdf', 'video-to-mp3', 'video-converter', 'mov-to-mp4']
	},

	'compress-pdf': {
		slug: 'compress-pdf',
		icon: FileText,
		titleKey: 'home.card.pdf.title',
		descKey: 'home.card.pdf.desc',
		related: ['pdf-merge', 'compress-video', 'image-compressor', 'reduce-image-size']
	},

	'pdf-merge': {
		slug: 'pdf-merge',
		icon: FileText,
		titleKey: 'home.card.pdfMerge.title',
		descKey: 'home.card.pdfMerge.desc',
		related: ['compress-pdf', 'image-compressor', 'reduce-image-size', 'barcode-generator']
	},

	'video-to-mp3': {
		slug: 'video-to-mp3',
		icon: Music,
		titleKey: 'home.card.mp3.title',
		descKey: 'home.card.mp3.desc',
		related: ['compress-video', 'video-converter', 'mov-to-mp4', 'compress-pdf']
	},

	'video-converter': {
		slug: 'video-converter',
		icon: RefreshCcw,
		titleKey: 'home.card.convert.title',
		descKey: 'home.card.convert.desc',
		related: ['mov-to-mp4', 'avi-to-mp4', 'mkv-to-mp4', 'webm-to-mp4']
	},

	'mov-to-mp4': {
		slug: 'mov-to-mp4',
		icon: RefreshCcw,
		titleKey: 'related.movToMp4.title',
		descKey: 'related.movToMp4.desc',
		related: ['video-converter', 'compress-video', 'video-to-mp3', 'avi-to-mp4']
	},

	'avi-to-mp4': {
		slug: 'avi-to-mp4',
		icon: RefreshCcw,
		titleKey: 'related.aviToMp4.title',
		descKey: 'related.aviToMp4.desc',
		related: ['video-converter', 'compress-video', 'mov-to-mp4', 'mkv-to-mp4']
	},

	'mkv-to-mp4': {
		slug: 'mkv-to-mp4',
		icon: RefreshCcw,
		titleKey: 'related.mkvToMp4.title',
		descKey: 'related.mkvToMp4.desc',
		related: ['video-converter', 'compress-video', 'avi-to-mp4', 'webm-to-mp4']
	},

	'webm-to-mp4': {
		slug: 'webm-to-mp4',
		icon: RefreshCcw,
		titleKey: 'related.webmToMp4.title',
		descKey: 'related.webmToMp4.desc',
		related: ['video-converter', 'compress-video', 'mov-to-mp4', 'mkv-to-mp4']
	},

	'image-compressor': {
		slug: 'image-compressor',
		icon: Image,
		titleKey: 'home.card.image.title',
		descKey: 'home.card.image.desc',
		related: ['jpg-compressor', 'png-compressor', 'reduce-image-size', 'pdf-merge']
	},

	'jpg-compressor': {
		slug: 'jpg-compressor',
		icon: Image,
		titleKey: 'related.jpgCompressor.title',
		descKey: 'related.jpgCompressor.desc',
		related: ['image-compressor', 'png-compressor', 'reduce-image-size', 'pdf-merge']
	},

	'png-compressor': {
		slug: 'png-compressor',
		icon: Image,
		titleKey: 'related.pngCompressor.title',
		descKey: 'related.pngCompressor.desc',
		related: ['image-compressor', 'jpg-compressor', 'reduce-image-size', 'compress-pdf']
	},

	'reduce-image-size': {
		slug: 'reduce-image-size',
		icon: Image,
		titleKey: 'related.reduceImageSize.title',
		descKey: 'related.reduceImageSize.desc',
		related: ['image-compressor', 'jpg-compressor', 'png-compressor', 'pdf-merge']
	},

	'barcode-generator': {
		slug: 'barcode-generator',
		icon: Barcode,
		titleKey: 'home.card.barcode.title',
		descKey: 'home.card.barcode.desc',
		related: ['character-counter', 'image-compressor', 'reduce-image-size', 'compress-pdf']
	},

	// ── Character counter family ───────────────────────────────────────────────
	'character-counter': {
		slug: 'character-counter',
		icon: Type,
		titleKey: 'related.characterCounter.title',
		descKey: 'related.characterCounter.desc',
		related: ['word-counter', 'manuscript-counter', 'sns-character-limit', 'barcode-generator']
	},

	'word-counter': {
		slug: 'word-counter',
		icon: Type,
		titleKey: 'related.wordCounter.title',
		descKey: 'related.wordCounter.desc',
		related: ['character-counter', 'manuscript-counter', 'sns-character-limit', 'barcode-generator']
	},

	'manuscript-counter': {
		slug: 'manuscript-counter',
		icon: Type,
		titleKey: 'related.manuscriptCounter.title',
		descKey: 'related.manuscriptCounter.desc',
		related: ['character-counter', 'word-counter', 'sns-character-limit', 'barcode-generator']
	},

	'sns-character-limit': {
		slug: 'sns-character-limit',
		icon: Type,
		titleKey: 'related.snsCharacterLimit.title',
		descKey: 'related.snsCharacterLimit.desc',
		related: ['character-counter', 'word-counter', 'manuscript-counter', 'barcode-generator']
	}
};

export function getToolHref(lang: string, slug: ToolSlug) {
	return lang === 'en' ? `/${slug}` : `/${lang}/${slug}`;
}

export function getRelatedTools(
	currentToolSlug: ToolSlug,
	lang: string,
	t: (key: string) => string
): RelatedTool[] {
	return TOOL_CONFIG[currentToolSlug].related.map((slug) => {
		const tool = TOOL_CONFIG[slug];

		return {
			slug: tool.slug,
			href: getToolHref(lang, tool.slug),
			icon: tool.icon,
			label: t(tool.titleKey),
			desc: t(tool.descKey)
		};
	});
}
