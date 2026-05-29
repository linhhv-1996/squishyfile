import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		},
		fs: {
			allow: ['static']
		}
	},
	optimizeDeps: {
		exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "@jsquash/jpeg", "@jsquash/png", "@jsquash/webp", "@jsquash/avif"],
	},
	worker: {
		format: 'es',
		rollupOptions: {
			output: {
				entryFileNames: '_app/immutable/workers/[name]-[hash].js'
			}
		}
	},
	build: {
		target: 'es2020',
	}
});
