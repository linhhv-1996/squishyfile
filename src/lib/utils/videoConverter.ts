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
	canEncode,
	type AudioCodec,
	type VideoCodec,
} from "mediabunny";

import { AviVideoConverter } from "./aviVideoConverter";

export type VideoOutputFormat = "mp4" | "webm" | "mov" | "mkv";

export type VideoConvertMode =
	/**
	 * Auto:
	 * - Mediabunny copy/remux nếu có thể.
	 * - Có thể nhanh hơn.
	 * - Nhưng KHÔNG đảm bảo output play được rộng rãi.
	 */
	| "auto"

	/**
	 * Force transcode:
	 * - Ép normalize codec bằng WebCodecs.
	 * - Nên dùng cho output MP4 public/download để dễ xem.
	 */
	| "force-transcode";

export type VideoConvertOptions = {
	file: File;
	outputFormat?: VideoOutputFormat;

	/**
	 * Nếu không truyền:
	 * - output mp4 + input không phải mp4/m4v => force-transcode
	 * - còn lại => auto
	 */
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
	 * Default theo outputFormat.
	 */
	videoCodec?: VideoCodec;

	/**
	 * Chỉ dùng trong force-transcode.
	 * Default theo outputFormat.
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

// const INPUT_EXTENSIONS_UNSUPPORTED_BY_MEDIABUNNY = new Set(["avi"]);

function debug(...args: unknown[]) {
	if (DEBUG) console.log(LABEL, ...args);
}

function debugError(...args: unknown[]) {
	console.error(LABEL, ...args);
}

function errorKeyFromError(error: unknown) {
	if (error instanceof Error && error.message.startsWith("error.")) {
		return error.message;
	}

	return "error.videoConverterFailed";
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

function isAviFile(file: File) {
	return getFileExtension(file) === "avi";
}

function createOutputFormat(format: VideoOutputFormat) {
	switch (format) {
		case "mp4":
			return new Mp4OutputFormat({
				/**
				 * Giúp MP4 stream/play sớm hơn, metadata ở đầu file.
				 */
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
			throw new Error("error.videoConverterUnsupportedOutputFormat");
		}
	}
}

function getDefaultVideoCodec(format: VideoOutputFormat): VideoCodec {
	switch (format) {
		case "mp4":
		case "mov":
			/**
			 * H.264/AVC là lựa chọn an toàn nhất cho MP4/MOV.
			 */
			return "avc";

		case "webm":
			return "vp9";

		case "mkv":
			/**
			 * MKV support nhiều codec, nhưng AVC dễ play hơn.
			 */
			return "avc";

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
			return "aac";

		case "webm":
			return "opus";

		case "mkv":
			/**
			 * MKV support nhiều codec, nhưng AAC tương đối phổ biến.
			 */
			return "aac";

		default: {
			const exhaustive: never = format;
			throw new Error(`Unsupported output format: ${exhaustive}`);
		}
	}
}

/**
 * Auto mode nhanh nhưng không đảm bảo output play được.
 *
 * Với output MP4, nếu input là webm/mkv/mov thì nên force transcode
 * sang H.264 + AAC để tránh file MP4 tạo ra nhưng không xem được.
 */
function getDefaultMode(file: File, outputFormat: VideoOutputFormat): VideoConvertMode {
	const ext = getFileExtension(file);

	// if (INPUT_EXTENSIONS_UNSUPPORTED_BY_MEDIABUNNY.has(ext)) {
	// 	throw new Error("error.videoConverterAviUnsupported");
	// }

	if (outputFormat === "mp4") {
		if (!["mp4", "m4v"].includes(ext)) {
			return "force-transcode";
		}
	}

	return "auto";
}

async function assertBrowserEncoderSupport() {
	if (typeof window === "undefined") {
		throw new Error("error.videoConverterBrowserOnly");
	}

	if (!("VideoEncoder" in window)) {
		throw new Error("error.videoConverterVideoEncoderUnsupported");
	}

	if (!("AudioEncoder" in window)) {
		throw new Error("error.videoConverterAudioEncoderUnsupported");
	}
}

async function assertCanEncodeCodec(codec: VideoCodec | AudioCodec, errorKey: string) {
	const supported = await canEncode(codec);

	if (!supported) {
		throw new Error(errorKey);
	}
}

export class VideoConverter {
	private conversion: Conversion | null = null;
	private aviConverter: AviVideoConverter | null = null;

	async convert(options: VideoConvertOptions) {
		const {
			file,
			outputFormat = "mp4",
			mode,
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
				throw new Error("error.videoConverterBrowserOnly");
			}

			if (!file) {
				throw new Error("error.videoConverterMissingInputFile");
			}

			if (isAviFile(file)) {
				if (outputFormat !== "mp4") {
					throw new Error("error.videoConverterAviOnlySupportsMp4");
				}

				const aviConverter = new AviVideoConverter();
				this.aviConverter = aviConverter;
				this.conversion = null;

				try {
					return await aviConverter.convert({
						file,
						onProgress,
						onSuccess,
						onError,
					});
				} finally {
					this.aviConverter = null;
				}
			}

			const finalMode = mode ?? getDefaultMode(file, outputFormat);
			const finalVideoCodec = videoCodec ?? getDefaultVideoCodec(outputFormat);
			const finalAudioCodec = audioCodec ?? getDefaultAudioCodec(outputFormat);

			debug(
				"Convert:",
				file.name,
				"→",
				outputFormat,
				`mode=${finalMode}`,
				`video=${finalMode === "force-transcode" ? finalVideoCodec : "auto"}`,
				`audio=${finalMode === "force-transcode" ? finalAudioCodec : "auto"}`,
				`size=${formatBytes(file.size)}`,
			);

			onProgress?.(1);

			if (finalMode === "force-transcode") {
				await assertBrowserEncoderSupport();

				await assertCanEncodeCodec(
					finalVideoCodec,
					"error.videoConverterVideoCodecUnsupported",
				);

				await assertCanEncodeCodec(
					finalAudioCodec,
					"error.videoConverterAudioCodecUnsupported",
				);
			}

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

			if (finalMode === "auto") {
				/**
				 * Auto mode:
				 * Không truyền codec/bitrate để Mediabunny tự copy/remux/transcode nếu cần.
				 * Dùng cho tốc độ, không dùng khi cần đảm bảo MP4 play được rộng rãi.
				 */
				conversion = await Conversion.init({
					input,
					output,
					tracks: primaryTracksOnly ? "primary" : "all",
				});
			} else {
				/**
				 * Force-transcode:
				 * Normalize codec để output dễ play hơn.
				 *
				 * MP4 nên là:
				 * - video: avc / H.264
				 * - audio: aac
				 */
				conversion = await Conversion.init({
					input,
					output,
					tracks: primaryTracksOnly ? "primary" : "all",

					video: {
						codec: finalVideoCodec,
						bitrate: QUALITY_HIGH,
						hardwareAcceleration,
						forceTranscode: true,
					},

					audio: {
						codec: finalAudioCodec,
						bitrate: QUALITY_HIGH,
						forceTranscode: true,
					},
				});
			}

			this.conversion = conversion;

			if (!conversion.isValid) {
				if (conversion.discardedTracks.length > 0) {
					debug("Invalid conversion discarded tracks:", conversion.discardedTracks);
				}

				throw new Error("error.videoConverterInvalidConversion");
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
				throw new Error("error.videoConverterEmptyOutput");
			}

			const blob = new Blob([buffer], {
				type: OUTPUT_MIME[outputFormat],
			});

			debug("Done:", formatBytes(blob.size));

			onProgress?.(100);
			onSuccess?.(blob, blob.size);

			return blob;
		} catch (error) {
			const errorKey = errorKeyFromError(error);

			debugError("Failed:", error);
			onError?.(errorKey);

			throw error;
		} finally {
			this.conversion = null;
		}
	}

	async cancel() {
		const aviConverter = this.aviConverter;

		if (aviConverter) {
			this.aviConverter = null;
			aviConverter.cancel();
			return;
		}

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
