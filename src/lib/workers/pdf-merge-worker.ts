// src/lib/workers/pdf-merge-worker.ts
/// <reference lib="webworker" />

type MergeInput = {
	fileUrl: string;
	name?: string;
};

type MergeMessage = {
	files: MergeInput[];
};

function postError(error: string) {
	self.postMessage({
		success: false,
		error,
	});
}

self.onmessage = async (e: MessageEvent<MergeMessage>) => {
	const { files } = e.data;

	if (!files || !Array.isArray(files) || files.length < 2) {
		postError("Need at least two PDF files to merge.");
		return;
	}

	try {
		const pdfBuffers = await Promise.all(
			files.map(async (file) => {
				const response = await fetch(file.fileUrl);

				if (!response.ok) {
					throw new Error(`Could not read PDF file: ${file.name || file.fileUrl}`);
				}

				return response.arrayBuffer();
			})
		);

		const inputNames = pdfBuffers.map((_, index) => `input-${index + 1}.pdf`);

		const gsArgs = [
			"-sDEVICE=pdfwrite",
			"-dCompatibilityLevel=1.4",
			"-dNOPAUSE",
			"-dQUIET",
			"-dBATCH",

			// Merge only. Do NOT use -dPDFSETTINGS here.
			// Compression presets like /screen or /ebook can reduce image quality.
			"-dAutoRotatePages=/None",

			"-sOutputFile=output.pdf",
			...inputNames,
		];

		const ModuleConfig = {
			preRun: [
				function () {
					try {
						for (let i = 0; i < pdfBuffers.length; i++) {
							// @ts-ignore
							(self as any).Module.FS.writeFile(
								inputNames[i],
								new Uint8Array(pdfBuffers[i])
							);
						}
					} catch (err) {
						console.error("[GS MERGE preRun error]:", err);
						postError("Could not write PDF files into Ghostscript.");
					}
				},
			],

			postRun: [
				function () {
					try {
						// @ts-ignore
						const uarray = (self as any).Module.FS.readFile("output.pdf", {
							encoding: "binary",
						});

						self.postMessage({
							success: true,
							pdfData: uarray,
						});

						try {
							for (const inputName of inputNames) {
								// @ts-ignore
								(self as any).Module.FS.unlink(inputName);
							}

							// @ts-ignore
							(self as any).Module.FS.unlink("output.pdf");
						} catch {
							// Ignore virtual FS cleanup errors.
						}
					} catch (err) {
						console.error("[GS MERGE postRun error]:", err);
						postError(
							"Could not merge these PDF files. One file may be encrypted, damaged, or unsupported."
						);
					}
				},
			],

			arguments: gsArgs,
			print: (text: any) => console.log("[GS MERGE LOG]:", text),
			printErr: (text: any) => console.error("[GS MERGE ERR]:", text),
			noExitRuntime: 1,
		};

		// Same pattern as current PDF compressor worker.
		// @ts-ignore
		if (!(self as any).Module) {
			// @ts-ignore
			(self as any).Module = ModuleConfig;

			const gsScriptUrl = self.location.origin + "/gs-worker.js";

			import(/* @vite-ignore */ gsScriptUrl).catch((err) => {
				console.error("🔥 LỖI LOAD GS-WORKER:", err);
				postError("Could not load the PDF processing engine.");
			});
		} else {
			// @ts-ignore
			(self as any).Module["calledRun"] = false;
			// @ts-ignore
			(self as any).Module["postRun"] = ModuleConfig.postRun;
			// @ts-ignore
			(self as any).Module["preRun"] = ModuleConfig.preRun;
			// @ts-ignore
			(self as any).Module["arguments"] = ModuleConfig.arguments;
			// @ts-ignore
			(self as any).Module.callMain(ModuleConfig.arguments);
		}
	} catch (error: any) {
		console.error("🔥 PDF MERGE WORKER ERROR:", error);

		postError(`Merge initialization failed: ${error.message || error}`);
	}
};
