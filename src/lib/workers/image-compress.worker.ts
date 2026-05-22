type OutputFormat = "jpeg" | "png" | "webp" | "avif";

type CompressPayload = {
	file: File;
	outputFormat: OutputFormat;
	quality: number;
	width: number | null;
};

type CompressRequest = {
	id: number;
	type: "compress";
	payload: CompressPayload;
};

type EncodeModule = {
	encode: (data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer>;
};

function postProgress(id: number, progress: number) {
	self.postMessage({ id, progress });
}

function getMimeType(format: OutputFormat) {
	switch (format) {
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		case "avif":
			return "image/avif";
	}
}

function clampQuality(quality: number) {
	return Math.min(100, Math.max(1, Math.round(quality || 75)));
}

function getTargetSize(sourceWidth: number, sourceHeight: number, maxWidth: number | null) {
	if (!maxWidth || maxWidth >= sourceWidth) return { width: sourceWidth, height: sourceHeight };

	const width = Math.max(1, Math.round(maxWidth));
	const height = Math.max(1, Math.round((sourceHeight * width) / sourceWidth));

	return { width, height };
}

async function bitmapToImageData(file: File, maxWidth: number | null) {
	if (typeof createImageBitmap !== "function") {
		throw new Error("This browser does not support createImageBitmap in workers.");
	}

	if (typeof OffscreenCanvas === "undefined") {
		throw new Error("This browser does not support OffscreenCanvas in workers.");
	}

	const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	const target = getTargetSize(bitmap.width, bitmap.height, maxWidth);
	const canvas = new OffscreenCanvas(target.width, target.height);
	const context = canvas.getContext("2d", {
		alpha: true,
		colorSpace: "srgb",
		desynchronized: true,
	});

	if (!context) throw new Error("Cannot create image processing context.");

	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	context.clearRect(0, 0, target.width, target.height);
	context.drawImage(bitmap, 0, 0, target.width, target.height);
	bitmap.close();

	return context.getImageData(0, 0, target.width, target.height);
}

async function encodeImage(imageData: ImageData, format: OutputFormat, qualityInput: number) {
	const quality = clampQuality(qualityInput);

	switch (format) {
		case "jpeg": {
			const { encode } = (await import("@jsquash/jpeg")) as EncodeModule;
			return encode(imageData, {
				quality,
				progressive: true,
				optimize_coding: true,
			});
		}

		case "webp": {
			const { encode } = (await import("@jsquash/webp")) as EncodeModule;
			return encode(imageData, {
				quality,
				method: 4,
			});
		}

		case "avif": {
			const { encode } = (await import("@jsquash/avif")) as EncodeModule;
			const cqLevel = Math.round(63 - quality * 0.62);

			return encode(imageData, {
				quality,
				cqLevel,
				cqAlphaLevel: cqLevel,
				speed: 6,
				subsample: 1,
			});
		}

		case "png": {
			const { encode } = (await import("@jsquash/png")) as EncodeModule;
			return encode(imageData);
		}
	}
}

self.onmessage = async (event: MessageEvent<CompressRequest>) => {
	const message = event.data;
	if (!message || message.type !== "compress") return;

	const { id, payload } = message;

	try {
		postProgress(id, 10);

		const imageData = await bitmapToImageData(payload.file, payload.width);
		postProgress(id, 42);

		const buffer = await encodeImage(imageData, payload.outputFormat, payload.quality);
		postProgress(id, 92);

		self.postMessage(
			{
				id,
				ok: true,
				buffer,
				mimeType: getMimeType(payload.outputFormat),
			},
			[buffer],
		);
	} catch (err) {
		self.postMessage({
			id,
			ok: false,
			error: err instanceof Error ? err.message : "Cannot compress this image.",
		});
	}
};

export {};
