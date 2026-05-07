export interface Language {
	key: string;
	flag: string;
	code: string;
	name: string;
}

export const languages: Language[] = [
	{ key: 'en', flag: '🇺🇸', code: 'EN', name: 'English' },
	{ key: 'ja', flag: '🇯🇵', code: 'JA', name: '日本語' },
	{ key: 'ko', flag: '🇰🇷', code: 'KO', name: '한국어' },
	{ key: 'zh', flag: '🇹🇼', code: 'ZH', name: '繁體中文' },
	{ key: 'de', flag: '🇩🇪', code: 'DE', name: 'Deutsch' },
	{ key: 'th', flag: '🇹🇭', code: 'TH', name: 'ภาษาไทย' },
];
