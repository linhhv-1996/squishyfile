import {
	Input,
	ALL_FORMATS,
	BlobSource,
	Output,
	BufferTarget,
	Mp4OutputFormat,
	Conversion
} from 'mediabunny';

export interface CompressOptions {
	file: File;
	preset?: 'low' | 'balanced' | 'high' | string;
	targetMb?: number;
	onProgress?: (pct: number) => void;
	onSuccess?: (resultBlob: Blob, finalSize: number) => void;
	onError?: (error: string) => void;
}

// Căn lên bội số gần nhất (dùng cho width/height — AVC yêu cầu chia hết cho 2)
function alignTo(value: number, align: number): number {
	return Math.floor(value / align) * align;
}

// Trả về { videoKbps, audioKbps, targetWidth } an toàn cho WebCodecs
function calcEncodeParams(opts: {
	originalBitrateKbps: number;
	isPortrait: boolean;
	originalWidth: number;
	originalHeight: number;
	targetRatio: number; // 0..1, tỉ lệ so với bitrate gốc
	minVideoBitrateKbps?: number;
}) {
	const {
		originalBitrateKbps,
		isPortrait,
		originalWidth,
		originalHeight,
		targetRatio,
		minVideoBitrateKbps = 150,
	} = opts;

	// --- Bitrate ---
	// Tính từ bitrate gốc thực tế thay vì % file size
	// File size % không đáng tin vì container overhead, audio ratio khác nhau
	let totalKbps = Math.max(
		Math.round(originalBitrateKbps * targetRatio),
		minVideoBitrateKbps + 96, // video min + audio min (96kbps AAC stereo floor)
	);

	// Audio: 96kbps nếu đủ budget, 64kbps nếu chật
	const audioKbps = totalKbps >= 500 ? 128 : 96; // AAC stereo cần tối thiểu 96kbps
	const videoKbps = Math.max(totalKbps - audioKbps, minVideoBitrateKbps);

	// --- Resolution ---
	// Ngưỡng resolution an toàn cho WebCodecs AVC encoder
	// Dựa trên videoKbps để tránh encoder từ chối config quá thấp
	let maxShortSide: number;
	if (videoKbps < 200) {
		maxShortSide = 240;
	} else if (videoKbps < 400) {
		maxShortSide = 360;
	} else if (videoKbps < 800) {
		maxShortSide = 480;
	} else if (videoKbps < 2000) {
		maxShortSide = 720;
	} else {
		maxShortSide = 1080;
	}

	// Tính targetWidth từ short side để đúng với cả portrait lẫn landscape
	const shortSide = Math.min(originalWidth, originalHeight);
	const longSide = Math.max(originalWidth, originalHeight);
	const aspectRatio = longSide / shortSide;

	let targetShortSide = Math.min(shortSide, maxShortSide);
	targetShortSide = alignTo(targetShortSide, 2);

	let targetLongSide = Math.round(targetShortSide * aspectRatio);
	targetLongSide = alignTo(targetLongSide, 2);

	// Chuyển lại thành width (không upscale)
	let targetWidth: number | undefined;
	if (isPortrait) {
		// portrait: width = short side
		targetWidth = targetShortSide < originalWidth ? targetShortSide : undefined;
	} else {
		// landscape: width = long side
		targetWidth = targetLongSide < originalWidth ? targetLongSide : undefined;
	}

	return { videoKbps, audioKbps, targetWidth };
}

export class VideoCompressor {
	private currentConversion: Conversion | null = null;
	private currentIntervalId: number = -1;

	private getVideoMetadata(file: File): Promise<{ duration: number, width: number, height: number }> {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			video.preload = 'metadata';
			video.onloadedmetadata = () => {
				URL.revokeObjectURL(video.src);
				resolve({
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight,
				});
			};
			video.onerror = () => reject(new Error('Không thể đọc thông tin video. File có thể bị hỏng.'));
			video.src = URL.createObjectURL(file);
		});
	}

	public async cancel(): Promise<void> {
		clearInterval(this.currentIntervalId);
		this.currentIntervalId = -1;
		if (this.currentConversion) {
			const conv = this.currentConversion;
			this.currentConversion = null;
			await conv.cancel();
		}
	}

	public async compress(options: CompressOptions) {
		await this.cancel();

		const { file, preset, targetMb, onProgress, onSuccess, onError } = options;

		try {
			const metadata = await this.getVideoMetadata(file);
			const originalSize = file.size;

			let duration = metadata.duration;
			if (!duration || duration === Infinity || duration === 0) {
				duration = Math.max(1, originalSize / 174000);
			}

			const isPortrait = metadata.height > metadata.width;

			// Bitrate gốc thực tế (kbps) — đáng tin hơn % file size
			const originalBitrateKbps = (originalSize * 8) / duration / 1000;

			// targetRatio: tỉ lệ bitrate mong muốn so với gốc
			let targetRatio: number;

			if (targetMb && targetMb > 0) {
				const requestedBytes = targetMb * 1024 * 1024;
				if (requestedBytes >= originalSize) {
					// Target lớn hơn gốc → dùng balanced
					targetRatio = 0.6;
				} else {
					// Tính ratio từ target size / original size
					// (xấp xỉ đúng vì bitrate ~ proportional với file size)
					targetRatio = requestedBytes / originalSize;
				}
			} else if (preset === 'low') {
				targetRatio = 0.3;
			} else if (preset === 'high') {
				targetRatio = 0.85;
			} else {
				// balanced
				targetRatio = 0.6;
			}

			const { videoKbps, audioKbps, targetWidth } = calcEncodeParams({
				originalBitrateKbps,
				isPortrait,
				originalWidth: metadata.width,
				originalHeight: metadata.height,
				targetRatio,
			});

			console.log('Encode params:', {
				preset, targetRatio,
				originalBitrateKbps: Math.round(originalBitrateKbps),
				videoKbps, audioKbps, targetWidth,
				originalWidth: metadata.width,
				originalHeight: metadata.height,
			});

			const source = new BlobSource(file);
			const input = new Input({ source, formats: ALL_FORMATS });
			const output = new Output({ target: new BufferTarget(), format: new Mp4OutputFormat() });

			this.currentConversion = await Conversion.init({
				input,
				output,
				tracks: 'primary',
				video: {
					width: targetWidth,
					bitrate: videoKbps * 1000,
					forceTranscode: true,
					hardwareAcceleration: 'prefer-software',
				},
				audio: {
					bitrate: audioKbps * 1000,
				},
			});

			if (!this.currentConversion.isValid) {
				throw new Error('Định dạng video không được hỗ trợ để nén.');
			}

			let progress = 0;
			this.currentConversion.onProgress = (p) => { progress = p; };

			this.currentIntervalId = window.setInterval(() => {
				if (onProgress) onProgress(Math.round(progress * 100));
			}, 100);

			await this.currentConversion.execute();

			clearInterval(this.currentIntervalId);
			this.currentIntervalId = -1;
			this.currentConversion = null;

			if (onProgress) onProgress(100);

			const buffer = output.target.buffer!;
			const resultBlob = new Blob([buffer], { type: output.format.mimeType });
			if (onSuccess) onSuccess(resultBlob, buffer.byteLength);

		} catch (error) {
			console.error("Lỗi nén:", error);
			clearInterval(this.currentIntervalId);
			this.currentIntervalId = -1;
			if (this.currentConversion) {
				const conv = this.currentConversion;
				this.currentConversion = null;
				try { await conv.cancel(); } catch { /* bỏ qua */ }
			}
			if (onError) onError(error instanceof Error ? error.message : String(error));
		}
	}
}
