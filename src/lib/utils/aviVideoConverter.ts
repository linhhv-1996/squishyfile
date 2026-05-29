import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export type AviConvertOptions = {
	file: File;
	onProgress?: (pct: number) => void;
	onSuccess?: (blob: Blob, finalSize: number) => void;
	onError?: (message: string) => void;
};

const LABEL = "[AviVideoConverter]";
const DEBUG = import.meta.env.DEV;

const OUTPUT_MIME = "video/mp4";

const FFMPEG_CORE_BASE_URL =
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

// ─── logging ────────────────────────────────────────────────────────────────
// log() luôn in ra dù DEV hay PROD — xóa sau khi debug xong
function log(...args: unknown[]) {
	console.log(LABEL, ...args);
}

function debug(...args: unknown[]) {
	if (DEBUG) console.log(LABEL, ...args);
}

function debugError(...args: unknown[]) {
	console.error(LABEL, ...args);
}
// ────────────────────────────────────────────────────────────────────────────

function errorKeyFromError(error: unknown) {
	if (error instanceof Error && error.message.startsWith("error.")) {
		return error.message;
	}

	return "error.videoConverterAviFailed";
}

function formatBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB"];
	let value = bytes;
	let unit = 0;

	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}

	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getFileExtension(file: File) {
	const name = file.name || "";
	const ext = name.split(".").pop()?.toLowerCase();

	return ext && ext !== name.toLowerCase() ? ext : "";
}

function assertAviInput(file: File) {
	if (getFileExtension(file) !== "avi") {
		throw new Error("error.videoConverterAviOnly");
	}
}

function normalizeProgress(progress: number) {
	if (!Number.isFinite(progress)) return null;

	return Math.min(99, Math.max(15, Math.round(15 + progress * 84)));
}

async function loadFFmpeg(onProgress?: (pct: number) => void) {
	const ffmpeg = new FFmpeg();

	ffmpeg.on("log", ({ type, message }) => {
		// luôn log ffmpeg internal — quan trọng để biết nó đang làm gì
		console.log(LABEL, `[ffmpeg:${type}]`, message);
	});

	ffmpeg.on("progress", ({ progress, time }) => {
		debug("progress:", progress, "time:", time);

		const pct = normalizeProgress(progress);
		if (pct !== null) onProgress?.(pct);
	});

	log("📦 Loading ffmpeg.wasm from CDN...");
	log("   baseURL:", FFMPEG_CORE_BASE_URL);

	onProgress?.(2);

	log("   fetching ffmpeg-core.js...");
	const coreURL = await toBlobURL(
		`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`,
		"text/javascript",
	);
	log("   ✅ coreURL blob created");

	log("   fetching ffmpeg-core.wasm...");
	const wasmURL = await toBlobURL(
		`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`,
		"application/wasm",
	);
	log("   ✅ wasmURL blob created");

	log("   calling ffmpeg.load()...");


	await ffmpeg.load({
		coreURL,
		wasmURL,
	});

	log("✅ ffmpeg.wasm loaded and ready.");
	onProgress?.(8);

	return ffmpeg;
}

export class AviVideoConverter {
	private ffmpeg: FFmpeg | null = null;

	async convert(options: AviConvertOptions) {
		const { file, onProgress, onSuccess, onError } = options;

		const timestamp = Date.now();
		const inputName = `input-${timestamp}.avi`;
		const outputName = `output-${timestamp}.mp4`;

		let shouldTerminate = true;

		log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		log("▶ convert() called");
		log("   file.name    :", file?.name);
		log("   file.size    :", file ? formatBytes(file.size) : "N/A");
		log("   file.type    :", file?.type);
		log("   inputName    :", inputName);
		log("   outputName   :", outputName);
		log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

		try {
			if (typeof window === "undefined") {
				log("❌ window is undefined — not a browser environment");
				throw new Error("error.videoConverterBrowserOnly");
			}
			log("✅ window check passed");

			if (!file) {
				log("❌ file is null/undefined");
				throw new Error("error.videoConverterMissingInputFile");
			}
			log("✅ file check passed");

			log("   checking file extension...");
			assertAviInput(file);
			log("✅ assertAviInput passed — extension is .avi");

			log("⏳ [1%] starting...");
			onProgress?.(1);

			log("⏳ loading ffmpeg...");
			const ffmpeg = await loadFFmpeg(onProgress);
			this.ffmpeg = ffmpeg;
			log("✅ [9%] ffmpeg ready, reading file into ArrayBuffer...");
			onProgress?.(9);

			const inputBuffer = new Uint8Array(await file.arrayBuffer());
			log("✅ [10%] ArrayBuffer ready:", formatBytes(inputBuffer.byteLength));
			onProgress?.(10);

			log("⏳ [12%] writing input to ffmpeg virtual FS:", inputName);
			await ffmpeg.writeFile(inputName, inputBuffer);
			log("✅ [12%] input written to ffmpeg FS");
			onProgress?.(12);

			const args = [
				"-hide_banner",
				"-y",

                "-threads", "1",

				"-i",
				inputName,

				"-map",
				"0:v:0?",
				"-map",
				"0:a:0?",

				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-crf",
				"23",
				"-pix_fmt",
				"yuv420p",

				"-c:a",
				"aac",
				"-b:a",
				"160k",

				"-movflags",
				"+faststart",
				"-shortest",

				outputName,
			];

			log("⏳ calling ffmpeg.exec() with args:");
			log("   " + args.join(" "));

			/**
			 * Quan trọng:
			 * Không truyền AbortController vào exec nữa.
			 * Một số version @ffmpeg/ffmpeg xử lý option này không ổn.
			 *
			 * Tham số thứ 2 là timeout ms.
			 * -1 = không timeout.
			 */
			const exitCode = await ffmpeg.exec(args, -1);

			log("✅ ffmpeg.exec() returned. exitCode:", exitCode);

			if (exitCode !== 0) {
				log("❌ exitCode !== 0 — conversion failed");
				throw new Error("error.videoConverterAviFailed");
			}

			log("⏳ reading output from ffmpeg FS:", outputName);
			const data = await ffmpeg.readFile(outputName);

			if (!(data instanceof Uint8Array) || data.byteLength === 0) {
				log("❌ output data is empty or wrong type:", typeof data);
				throw new Error("error.videoConverterEmptyOutput");
			}

			log("✅ output read:", formatBytes(data.byteLength));

			const blob = new Blob([data.buffer as ArrayBuffer], {
                type: OUTPUT_MIME,
            });

			log("🎉 Done! AVI → MP4:", formatBytes(blob.size));

			onProgress?.(100);
			onSuccess?.(blob, blob.size);

			return blob;
		} catch (error) {
			const errorKey = errorKeyFromError(error);

			debugError("❌ Failed:", error);
			log("   errorKey:", errorKey);
			onError?.(errorKey);

			throw error;
		} finally {
			const ffmpeg = this.ffmpeg;
			this.ffmpeg = null;

			if (ffmpeg) {
				log("🧹 Cleaning ffmpeg FS...");

				await Promise.allSettled([
					ffmpeg.deleteFile(inputName),
					ffmpeg.deleteFile(outputName),
				]);

				if (shouldTerminate) {
					log("🛑 Terminating ffmpeg worker...");
					ffmpeg.terminate();
				}
			}

			log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
			log("▶ convert() finished");
			log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		}
	}

	cancel() {
		log("⚠️ cancel() called");

		try {
			this.ffmpeg?.terminate();
		} catch {
			// ignore
		}

		this.ffmpeg = null;

		log("🛑 Canceled.");
	}
}
