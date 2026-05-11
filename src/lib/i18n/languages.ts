export interface Language {
	key: string;
	flag: string;
	code: string;
	name: string;
	hreflang: string;
}

export const languages: Language[] = [
	{ key: 'en', flag: '🇺🇸', code: 'EN', name: 'English',        hreflang: 'en' },
	{ key: 'ja', flag: '🇯🇵', code: 'JA', name: '日本語',          hreflang: 'ja' },
	{ key: 'ko', flag: '🇰🇷', code: 'KO', name: '한국어',          hreflang: 'ko' },
	{ key: 'zh', flag: '🇹🇼', code: 'ZH', name: '繁體中文',        hreflang: 'zh-TW' },
	{ key: 'de', flag: '🇩🇪', code: 'DE', name: 'Deutsch',        hreflang: 'de' },
	{ key: 'th', flag: '🇹🇭', code: 'TH', name: 'ภาษาไทย',       hreflang: 'th' },
	{ key: 'fr', flag: '🇫🇷', code: 'FR', name: 'Français',       hreflang: 'fr' },
	{ key: 'id', flag: '🇮🇩', code: 'ID', name: 'Indonesia',      hreflang: 'id' },
	{ key: 'es', flag: '🇪🇸', code: 'ES', name: 'Español',        hreflang: 'es' },
	{ key: 'pt', flag: '🇧🇷', code: 'PT', name: 'Português (BR)', hreflang: 'pt-BR' },
];
