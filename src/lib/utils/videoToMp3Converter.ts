import {
	ALL_FORMATS,
	BlobSource,
	BufferTarget,
	Conversion,
	ConversionCanceledError,
	Input,
	Mp3OutputFormat,
	Output,
	canEncodeAudio,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

type ConvertOptions = {
	file: File;
	bitrate?: number;
	onProgress?: (pct: number) => void;
	onSuccess: (resultBlob: Blob, finalSize: number) => void;
	onError: (message: string) => void;
};

let mp3EncoderReady = false;

async function ensureMp3Encoder() {
	if (mp3EncoderReady) return;

	if (!(await canEncodeAudio("mp3"))) {
		registerMp3Encoder();
	}

	mp3EncoderReady = true;
}

export class VideoToMp3Converter {
	private conversion: Conversion | null = null;
	private canceled = false;

	async convert({
		file,
		bitrate = 192_000,
		onProgress,
		onSuccess,
		onError,
	}: ConvertOptions) {
		this.canceled = false;

		try {
			await ensureMp3Encoder();

			const input = new Input({
				source: new BlobSource(file),
				formats: ALL_FORMATS,
			});

			const output = new Output({
				format: new Mp3OutputFormat(),
				target: new BufferTarget(),
			});

			const conversion = await Conversion.init({
				input,
				output,
				tracks: "primary",
				video: {
					discard: true,
				},
				audio: {
					codec: "mp3",
					bitrate,
					forceTranscode: true,
				},
			});

			this.conversion = conversion;

			if (!conversion.isValid) {
				const reasons = conversion.discardedTracks
					.map((item) => item.reason)
					.join(", ");

				throw new Error(
					reasons
						? `Cannot convert this file. Reason: ${reasons}`
						: "Cannot convert this file to MP3.",
				);
			}

			conversion.onProgress = (progress) => {
				onProgress?.(Math.min(99, Math.round(progress * 100)));
			};

			await conversion.execute();

			const buffer = output.target.buffer;
			if (!buffer) {
				throw new Error("MP3 output is empty.");
			}

			const blob = new Blob([buffer], { type: "audio/mpeg" });

			onProgress?.(100);
			onSuccess(blob, blob.size);
		} catch (err) {
			if (this.canceled || err instanceof ConversionCanceledError) {
				return;
			}

			onError(
				err instanceof Error
					? err.message
					: "Conversion failed. Please try another video file.",
			);
		} finally {
			this.conversion = null;
		}
	}

	async cancel() {
		this.canceled = true;

		if (this.conversion) {
			await this.conversion.cancel();
			this.conversion = null;
		}
	}
}
