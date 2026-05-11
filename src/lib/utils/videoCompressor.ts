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

export class VideoCompressor {
	private currentConversion: Conversion | null = null;
	private currentIntervalId: number = -1;

	// Đọc siêu dữ liệu (Metadata) của video trước khi nén
	private getVideoMetadata(file: File): Promise<{ duration: number, width: number, height: number }> {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			video.preload = 'metadata';
			video.onloadedmetadata = () => {
				URL.revokeObjectURL(video.src);
				resolve({
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight
				});
			};
			video.onerror = () => reject(new Error('Không thể đọc thông tin video. File có thể bị hỏng.'));
			video.src = URL.createObjectURL(file);
		});
	}

	public async compress(options: CompressOptions) {
		await this.cancel();
		const { file, preset, targetMb, onProgress, onSuccess, onError } = options;

		try {
			// 1. LẤY METADATA (Rất quan trọng để scale video không bị vỡ)
			const metadata = await this.getVideoMetadata(file);
			const originalSize = file.size;

			// Fallback nếu trình duyệt không lấy được duration (rất hiếm)
			let duration = metadata.duration;
			if (!duration || duration === Infinity || duration === 0) {
				duration = Math.max(1, originalSize / 174000); // Tạm tính trung bình 1MB ~ 6s
			}

			// 2. LOGIC TARGET SIZE
			let targetBytes = originalSize * 0.6; // Mặc định là Balanced (60%)

			if (targetMb && targetMb > 0) {
				const requestedBytes = targetMb * 1024 * 1024;
				if (requestedBytes >= originalSize) {
					// FIX LỖI 1: Yêu cầu nén lớn hơn hoặc bằng file gốc -> Đẩy về Balanced
					console.info("Target size >= Original size. Fallback to Balanced.");
					targetBytes = originalSize * 0.6;
				} else {
					targetBytes = requestedBytes;
				}
			} else if (preset === 'low') {
				targetBytes = originalSize * 0.30;
			} else if (preset === 'high') {
				targetBytes = originalSize * 0.85;
			}

			// 3. TÍNH TOÁN BITRATE
			let targetTotalBitrateBps = (targetBytes * 8) / duration;

			// FIX LỖI 3: Hard-limit tối thiểu (Bảo vệ video khỏi bị nát)
			// Không bao giờ cho phép tổng bitrate dưới 150kbps (Video ~100k, Audio ~50k)
			const MIN_TOTAL_BITRATE = 150 * 1000; 
			if (targetTotalBitrateBps < MIN_TOTAL_BITRATE) {
				console.warn("Ép dung lượng quá nhỏ, tự động nâng bitrate lên mức tối thiểu để cứu video.");
				targetTotalBitrateBps = MIN_TOTAL_BITRATE; 
			}

			let audioBitrateBps = 128 * 1000; // Audio 128kbps chuẩn
			if (targetTotalBitrateBps < 500 * 1000) {
				audioBitrateBps = 64 * 1000; // Giảm audio xuống 64kbps nếu file quá gắt
			}

			const videoBitrateBps = Math.max(targetTotalBitrateBps - audioBitrateBps, 100 * 1000);

			// 4. SMART RESOLUTION (FIX LỖI 2: KHÔNG BAO GIỜ UPSCALE VIDEO)
			const isPortrait = metadata.height > metadata.width; // Xác định video dọc hay ngang
			let maxWidth = metadata.width;
			const videoKbps = videoBitrateBps / 1000;

			// Định tuyến kích thước chiều Rộng (Width) tối đa an toàn dựa trên Bitrate
			if (videoKbps < 500) {
				maxWidth = isPortrait ? 360 : 640; // Tương đương 360p
			} else if (videoKbps < 1000) {
				maxWidth = isPortrait ? 480 : 854; // Tương đương 480p
			} else if (videoKbps < 2500) {
				maxWidth = isPortrait ? 720 : 1280; // Tương đương 720p HD
			} else {
				maxWidth = isPortrait ? 1080 : 1920; // Full HD
			}

			// Chốt width: Lấy giá trị NHỎ HƠN giữa width gốc và maxWidth
			// Giúp video chỉ thu nhỏ đi, tuyệt đối không bị phóng to làm bể hạt
			let targetWidth: number | undefined = Math.min(metadata.width, maxWidth);
			
			// Nếu file gốc đã nhỏ sẵn rồi thì để undefined cho mediabunny giữ nguyên gốc
			if (targetWidth === metadata.width) {
				targetWidth = undefined; 
			}

			// 5. CHẠY TIẾN TRÌNH MEDIABUNNY
			const source = new BlobSource(file);
			const input = new Input({ source, formats: ALL_FORMATS });
			const output = new Output({ target: new BufferTarget(), format: new Mp4OutputFormat() });

			this.currentConversion = await Conversion.init({
				input,
				output,
				tracks: 'primary',
				video: {
					width: targetWidth,
					bitrate: Math.round(videoBitrateBps),
				},
				audio: {
					bitrate: Math.round(audioBitrateBps),
				},
			});

			if (!this.currentConversion.isValid) {
				throw new Error('Định dạng video không được hỗ trợ để nén.');
			}

			// Update Progress Bar
			let progress = 0;
			this.currentConversion.onProgress = (newProgress) => { progress = newProgress; };

			this.currentIntervalId = window.setInterval(() => {
				if (onProgress) onProgress(Math.round(progress * 100));
			}, 100);

			// Bắt đầu nén
			await this.currentConversion.execute();
			
			// Xong tiến trình
			clearInterval(this.currentIntervalId);
			if (onProgress) onProgress(100);

			const buffer = output.target.buffer!;
			const resultBlob = new Blob([buffer], { type: output.format.mimeType });
			
			if (onSuccess) onSuccess(resultBlob, buffer.byteLength);

		} catch (error) {
			console.error("Lỗi nén:", error);
			await this.cancel();
			if (onError) onError(error instanceof Error ? error.message : String(error));
		}
	}

	public async cancel() {
		clearInterval(this.currentIntervalId);
		if (this.currentConversion) {
			await this.currentConversion.cancel();
			this.currentConversion = null;
		}
	}
}
