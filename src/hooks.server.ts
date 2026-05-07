import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Lấy param lang từ URL (nếu không có thì mặc định là 'en')
	const lang = event.params.lang || 'en';

	// Render trang và thay thế '%lang%' bằng mã ngôn ngữ hiện tại
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});

	return response;
};
