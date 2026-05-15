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
	preset?: 'low' | 'balanced' | 'high';
	targetMb?: number;
	onProgress?: (pct: number) => void;
	onSuccess?: (resultBlob: Blob, finalSize: number) => void;
	onError?: (error: string) => void;
}

function alignTo(value: number, align: number): number {
	return Math.floor(value / align) * align;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution ladder — mỗi tier định nghĩa:
//   minVideoBitrateKbps : dưới ngưỡng này H.264 WebCodecs sẽ từ chối hoặc cho
//                         ra artifact không chấp nhận được ở resolution này
//   audioBitrateKbps    : AAC stereo phù hợp với tier
// ─────────────────────────────────────────────────────────────────────────────
const RESOLUTION_TIERS = [
	{ shortSide: 1080, minVideoBitrateKbps: 1500, audioBitrateKbps: 192 },
	{ shortSide: 720,  minVideoBitrateKbps: 700,  audioBitrateKbps: 160 },
	{ shortSide: 480,  minVideoBitrateKbps: 400,  audioBitrateKbps: 160 },
	{ shortSide: 360,  minVideoBitrateKbps: 280,  audioBitrateKbps: 160 },
	{ shortSide: 240,  minVideoBitrateKbps: 250,  audioBitrateKbps: 160 },
] as const;

// Mỗi preset compress bao nhiêu % so với total bitrate gốc.
// Dùng ratio đảm bảo 3 preset LUÔN cho ra output khác nhau bất kể video gốc.
const PRESET_RATIOS: Record<'low' | 'balanced' | 'high', number> = {
	low:      0.25, // 25% — file nhỏ nhất, chấp nhận chất lượng thấp hơn
	balanced: 0.55, // 55% — cân bằng giữa size và chất lượng
	high:     0.80, // 80% — giữ phần lớn chất lượng, vẫn giảm được ~20% size
};

// "low" giới hạn resolution max 720p để file thực sự nhỏ.
// "balanced" / "high" giữ nguyên resolution gốc.
const PRESET_MAX_SHORT_SIDE: Record<'low' | 'balanced' | 'high', number> = {
	low:      720,
	balanced: Infinity,
	high:     Infinity,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getShortAndLong(w: number, h: number) {
	return { shortSide: Math.min(w, h), longSide: Math.max(w, h) };
}

/** Tính targetWidth cần truyền vào mediabunny (undefined = giữ nguyên). */
function resolveTargetWidth(
	originalWidth: number,
	originalHeight: number,
	targetShortSide: number,
): number | undefined {
	const isPortrait = originalHeight > originalWidth;
	const { shortSide, longSide } = getShortAndLong(originalWidth, originalHeight);

	// Không upscale
	if (targetShortSide >= shortSide) return undefined;

	const finalShortSide = alignTo(targetShortSide, 2);
	const finalLongSide  = alignTo(Math.round(finalShortSide * (longSide / shortSide)), 2);

	// mediabunny dùng `width` để scale: portrait → width = short side
	return isPortrait ? finalShortSide : finalLongSide;
}

interface EncodeTarget {
	videoKbps: number;
	audioKbps: number;
	targetWidth: number | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode 1: PRESET — tính budget từ ratio, dùng resolution ladder chọn tier
//
// Flow:
//   1. targetTotalKbps = originalTotalKbps × ratio (low/balanced/high)
//   2. Cap resolution theo preset (low → ≤720p)
//   3. Duyệt tier cao→thấp, chọn tier cao nhất budget đủ cover
//   4. Cap videoKbps không vượt original (không upscale chất lượng)
// ─────────────────────────────────────────────────────────────────────────────
function calcPresetTarget(
	preset: 'low' | 'balanced' | 'high',
	originalWidth: number,
	originalHeight: number,
	originalTotalKbps: number,
): EncodeTarget {
	const { shortSide: originalShortSide } = getShortAndLong(originalWidth, originalHeight);
	const targetTotalKbps = Math.round(originalTotalKbps * PRESET_RATIOS[preset]);
	const maxShortSide    = Math.min(originalShortSide, PRESET_MAX_SHORT_SIDE[preset]);
	const lowestTier      = RESOLUTION_TIERS[RESOLUTION_TIERS.length - 1];

	for (const tier of RESOLUTION_TIERS) {
		if (tier.shortSide > maxShortSide) continue;

		const audioKbps   = tier.audioBitrateKbps;
		const videoBudget = targetTotalKbps - audioKbps;

		if (videoBudget >= tier.minVideoBitrateKbps) {
			// Không upscale chất lượng so với gốc
			const videoKbps = Math.round(Math.min(videoBudget, originalTotalKbps * 0.95));
			return {
				videoKbps,
				audioKbps,
				targetWidth: resolveTargetWidth(originalWidth, originalHeight, tier.shortSide),
			};
		}
	}

	// Budget quá nhỏ cho mọi tier → tier thấp nhất ở minimum safe params.
	// Vẫn downscale resolution, vẫn compress — chỉ overshoot budget một chút.
	// KHÔNG bail về trim 12%: low preset phải compress nhiều hơn balanced/high, không ít hơn.
	return {
		videoKbps:   lowestTier.minVideoBitrateKbps,
		audioKbps:   lowestTier.audioBitrateKbps,
		targetWidth: resolveTargetWidth(originalWidth, originalHeight, lowestTier.shortSide),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode 2: TARGET SIZE — tính budget từ file size mục tiêu, tìm resolution
//         tốt nhất fit trong budget đó.
//
// Flow:
//   1. totalKbps = targetBytes × 8 / duration (bitrate thực sự cần thiết)
//   2. Duyệt từ tier cao → thấp, chọn tier cao nhất mà budget đủ cover
//      minVideoBitrateKbps của tier đó
//   3. Cap videoKbps không được vượt original (không upscale chất lượng)
// ─────────────────────────────────────────────────────────────────────────────
function calcTargetMbTarget(
	targetMb: number,
	durationSec: number,
	originalWidth: number,
	originalHeight: number,
	originalVideoBitrateKbps: number,
): EncodeTarget {
	const totalKbps = Math.floor((targetMb * 1024 * 1024 * 8) / durationSec / 1000);
	const { shortSide: originalShortSide } = getShortAndLong(originalWidth, originalHeight);

	for (const tier of RESOLUTION_TIERS) {
		if (tier.shortSide > originalShortSide) continue; // không upscale

		const audioKbps = tier.audioBitrateKbps;
		const videoBudget = totalKbps - audioKbps;

		if (videoBudget >= tier.minVideoBitrateKbps) {
			// Đủ budget cho tier này — dùng hết budget nhưng không vượt original
			const videoKbps = Math.round(Math.min(videoBudget, originalVideoBitrateKbps * 0.95));
			return {
				videoKbps,
				audioKbps,
				targetWidth: resolveTargetWidth(originalWidth, originalHeight, tier.shortSide),
			};
		}
	}

	// Budget cực kỳ eo hẹp → tier thấp nhất
	const lastTier = RESOLUTION_TIERS[RESOLUTION_TIERS.length - 1];
	return {
		videoKbps: lastTier.minVideoBitrateKbps,
		audioKbps: lastTier.audioBitrateKbps,
		targetWidth: resolveTargetWidth(originalWidth, originalHeight, lastTier.shortSide),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Main class
// ─────────────────────────────────────────────────────────────────────────────
export class VideoCompressor {
	private currentConversion: Conversion | null = null;
	private currentIntervalId: number = -1;

	private getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			video.preload = 'metadata';
			video.onloadedmetadata = () => {
				URL.revokeObjectURL(video.src);
				resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
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
			if (!duration || !isFinite(duration) || duration === 0) {
				// Fallback ước tính từ file size (174kB/s ≈ 1.4Mbps average)
				duration = Math.max(1, originalSize / 174_000);
			}

			// Bitrate video gốc ước tính (trừ ~192kbps audio overhead)
			const originalTotalKbps = (originalSize * 8) / duration / 1000;
			const originalVideoBitrateKbps = Math.max(originalTotalKbps - 192, 100);

			let encodeTarget: EncodeTarget;

			if (targetMb && targetMb > 0) {
				const targetBytes = targetMb * 1024 * 1024;

				if (targetBytes >= originalSize) {
					// Target lớn hơn gốc → không nén
					if (onSuccess) {
						onSuccess(file, originalSize);
					}
					return;
				}

				encodeTarget = calcTargetMbTarget(
					targetMb,
					duration,
					metadata.width,
					metadata.height,
					originalVideoBitrateKbps,
				);
			} else {
				const normalizedPreset =
					preset === 'low' || preset === 'balanced' || preset === 'high'
						? preset
						: 'balanced';

				encodeTarget = calcPresetTarget(
					normalizedPreset,
					metadata.width,
					metadata.height,
					originalTotalKbps,
				);
			}

			const { videoKbps, audioKbps, targetWidth } = encodeTarget;

			console.log('[VideoCompressor] encode target:', {
				preset, targetMb,
				originalSize: `${(originalSize / 1024 / 1024).toFixed(1)}MB`,
				originalVideoBitrateKbps: Math.round(originalVideoBitrateKbps),
				originalDimensions: `${metadata.width}×${metadata.height}`,
				targetWidth: targetWidth ?? 'unchanged',
				videoKbps, audioKbps,
			});

			const source = new BlobSource(file);
			const input  = new Input({ source, formats: ALL_FORMATS });
			const output = new Output({ target: new BufferTarget(), format: new Mp4OutputFormat() });

			this.currentConversion = await Conversion.init({
				input,
				output,
				tracks: 'primary',
				video: {
					width:                targetWidth,
					bitrate:              videoKbps * 1000,
					forceTranscode:       true,
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
				onProgress?.(Math.round(progress * 100));
			}, 100);

			await this.currentConversion.execute();

			clearInterval(this.currentIntervalId);
			this.currentIntervalId = -1;
			this.currentConversion = null;

			onProgress?.(100);

			const buffer = output.target.buffer!;
			const resultBlob = new Blob([buffer], { type: output.format.mimeType });
			onSuccess?.(resultBlob, buffer.byteLength);

		} catch (error) {
			console.error('[VideoCompressor] lỗi nén:', error);
			clearInterval(this.currentIntervalId);
			this.currentIntervalId = -1;
			if (this.currentConversion) {
				const conv = this.currentConversion;
				this.currentConversion = null;
				try { await conv.cancel(); } catch { /* bỏ qua */ }
			}
			onError?.(error instanceof Error ? error.message : String(error));
		}
	}
}
