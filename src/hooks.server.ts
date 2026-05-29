import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Lấy param lang từ URL (nếu không có thì mặc định là 'en')
	const lang = event.params.lang || 'en';

	// Render trang và thay thế '%lang%' bằng mã ngôn ngữ hiện tại
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});

	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	return response;
};
