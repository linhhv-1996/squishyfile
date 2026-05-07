import { languages } from '$lib/i18n/languages';

// Hàm này kiểm tra xem param trên URL có nằm trong danh sách ngôn ngữ của bạn không
export function match(param: string) {
	return languages.some((l) => l.key === param);
}
