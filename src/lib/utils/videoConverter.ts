import {
	ALL_FORMATS,
	BlobSource,
	BufferTarget,
	Conversion,
	Input,
	MkvOutputFormat,
	MovOutputFormat,
	Mp4OutputFormat,
	Output,
	WebMOutputFormat,
	QUALITY_HIGH,
	type AudioCodec,
	type VideoCodec,
} from "mediabunny";

export type VideoOutputFormat = "mp4" | "webm" | "mov" | "mkv";

export type VideoConvertMode =
	/**
	 * Default.
	 *
	 * Không ép codec/bitrate.
	 * Mediabunny sẽ copy/remux nếu có thể, chỉ transcode nếu bắt buộc.
	 */
	| "auto"

	/**
	 * Ép transcode video/audio bằng WebCodecs.
	 * Chỉ dùng khi muốn normalize codec hoặc auto output không play được.
	 */
	| "force-transcode";

export type VideoConvertOptions = {
	file: File;
	outputFormat?: VideoOutputFormat;
	mode?: VideoConvertMode;

	/**
	 * Default: true
	 * Chỉ lấy primary video + primary audio.
	 */
	primaryTracksOnly?: boolean;

	/**
	 * Chỉ dùng trong force-transcode.
	 * Default: "no-preference"
	 */
	hardwareAcceleration?: "no-preference" | "prefer-hardware" | "prefer-software";

	/**
	 * Chỉ dùng trong force-transcode.
	 */
	videoCodec?: VideoCodec;

	/**
	 * Chỉ dùng trong force-transcode.
	 */
	audioCodec?: AudioCodec;

	onProgress?: (pct: number) => void;
	onSuccess?: (blob: Blob, finalSize: number) => void;
	onError?: (message: string) => void;
};

const LABEL = "[VideoConverter]";
const DEBUG = import.meta.env.DEV;

const OUTPUT_MIME: Record<VideoOutputFormat, string> = {
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	mkv: "video/x-matroska",
};

function debug(...args: unknown[]) {
	if (DEBUG) console.log(LABEL, ...args);
}

function debugError(...args: unknown[]) {
	console.error(LABEL, ...args);
}

function messageFromError(error: unknown) {
	return error instanceof Error ? error.message : String(error || "Unknown error");
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

function createOutputFormat(format: VideoOutputFormat) {
	switch (format) {
		case "mp4":
			return new Mp4OutputFormat({
				fastStart: "in-memory",
			});

		case "webm":
			return new WebMOutputFormat();

		case "mov":
			return new MovOutputFormat();

		case "mkv":
			return new MkvOutputFormat();

		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported output format: ${exhaustive}`);
		}
	}
}

function getDefaultVideoCodec(format: VideoOutputFormat): VideoCodec {
	switch (format) {
		case "mp4":
		case "mov":
		case "mkv":
			return "avc";

		case "webm":
			return "vp9";

		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported output format: ${exhaustive}`);
		}
	}
}

function getDefaultAudioCodec(format: VideoOutputFormat): AudioCodec {
	switch (format) {
		case "mp4":
		case "mov":
		case "mkv":
			return "aac";

		case "webm":
			return "opus";

		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported output format: ${exhaustive}`);
		}
	}
}

function stringifyForDebug(value: unknown) {
	try {
		return JSON.stringify(
			value,
			(_key, item) => {
				if (typeof item === "function") return undefined;
				if (item instanceof Error) return item.message;
				return item;
			},
			2,
		);
	} catch {
		return String(value);
	}
}

export class VideoConverter {
	private conversion: Conversion | null = null;

	async convert(options: VideoConvertOptions) {
		const {
			file,
			outputFormat = "mp4",
			mode = "auto",
			primaryTracksOnly = true,
			hardwareAcceleration = "no-preference",
			videoCodec,
			audioCodec,
			onProgress,
			onSuccess,
			onError,
		} = options;

		try {
			if (typeof window === "undefined") {
				throw new Error("VideoConverter chỉ chạy trong browser.");
			}

			if (!file) {
				throw new Error("Không có file đầu vào.");
			}

			if (mode === "force-transcode") {
				if (!("VideoEncoder" in window)) {
					throw new Error(
						"Browser không hỗ trợ WebCodecs VideoEncoder, không thể force transcode video.",
					);
				}

				if (!("AudioEncoder" in window)) {
					throw new Error(
						"Browser không hỗ trợ WebCodecs AudioEncoder, không thể force transcode audio.",
					);
				}
			}

			debug(
				"Convert:",
				file.name,
				"→",
				outputFormat,
				`mode=${mode}`,
				`size=${formatBytes(file.size)}`,
			);

			onProgress?.(1);

			const input = new Input({
				source: new BlobSource(file),
				formats: ALL_FORMATS,
			});

			const target = new BufferTarget();

			const output = new Output({
				format: createOutputFormat(outputFormat),
				target,
			});

			onProgress?.(3);

			let conversion: Conversion;

			if (mode === "auto") {
				/**
				 * QUAN TRỌNG:
				 *
				 * Auto mode KHÔNG truyền video/audio options.
				 *
				 * Nếu truyền codec hoặc bitrate, Mediabunny có thể ép transcode.
				 * Auto đúng nghĩa:
				 * - copy/remux nếu codec đã compatible
				 * - chỉ transcode nếu thật sự bắt buộc
				 */
				conversion = await Conversion.init({
					input,
					output,
					tracks: primaryTracksOnly ? "primary" : "all",
				});
			} else {
				/**
				 * Force-transcode mode:
				 * Chỉ mode này mới set codec/bitrate/hardwareAcceleration.
				 */
				conversion = await Conversion.init({
					input,
					output,
					tracks: primaryTracksOnly ? "primary" : "all",

					video: {
						codec: videoCodec ?? getDefaultVideoCodec(outputFormat),
						bitrate: QUALITY_HIGH,
						hardwareAcceleration,
						forceTranscode: true,
					},

					audio: {
						codec: audioCodec ?? getDefaultAudioCodec(outputFormat),
						bitrate: QUALITY_HIGH,
						forceTranscode: true,
					},
				});
			}

			this.conversion = conversion;

			if (!conversion.isValid) {
				const detail =
					conversion.discardedTracks.length > 0
						? stringifyForDebug(conversion.discardedTracks)
						: "Không có detail từ Mediabunny.";

				throw new Error(`Mediabunny không convert được file này.\n${detail}`);
			}

			if (conversion.discardedTracks.length > 0) {
				debug("Discarded tracks:", conversion.discardedTracks);
			}

			conversion.onProgress = (progress: number) => {
				const pct = Math.min(99, Math.max(4, Math.round(progress * 99)));
				onProgress?.(pct);
			};

			debug("Executing Mediabunny conversion...");

			await conversion.execute();

			const buffer = target.buffer;

			if (!buffer || buffer.byteLength === 0) {
				throw new Error("Output rỗng sau khi convert.");
			}

			const blob = new Blob([buffer], {
				type: OUTPUT_MIME[outputFormat],
			});

			debug("Done:", formatBytes(blob.size));

			onProgress?.(100);
			onSuccess?.(blob, blob.size);

			return blob;
		} catch (error) {
			const message = messageFromError(error);

			debugError("Failed:", error);
			onError?.(message);

			throw error;
		} finally {
			this.conversion = null;
		}
	}

	async cancel() {
		const conversion = this.conversion;

		if (!conversion) return;

		this.conversion = null;

		try {
			await conversion.cancel();
			debug("Canceled.");
		} catch (error) {
			debugError("Cancel failed:", error);
		}
	}
}
