// src/lib/workers/pdf-worker.ts
/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent) => {
	const { fileUrl, password } = e.data;

	try {
		const response = await fetch(fileUrl);
		const arrayBuffer = await response.arrayBuffer();

		let gsArgs = [
			"-sDEVICE=pdfwrite",
			"-dCompatibilityLevel=1.4",
			"-dPDFSETTINGS=/screen",
			"-DNOPAUSE",
			"-dQUIET",
			"-dBATCH"
		];

		if (password) {
			gsArgs.push(`-sPDFPassword=${password}`);
		}
		gsArgs.push("-sOutputFile=output.pdf", "input.pdf");

		const ModuleConfig = {
			preRun: [
				function () {
					// @ts-ignore
					(self as any).Module.FS.writeFile("input.pdf", new Uint8Array(arrayBuffer));
				}
			],
			postRun: [
				function () {
					try {
						// @ts-ignore
						const uarray = (self as any).Module.FS.readFile("output.pdf", { encoding: "binary" });
						
						// ✅ CHỈ GỬI DỮ LIỆU THÔ (uarray) VỀ MAIN THREAD
						self.postMessage({ success: true, pdfData: uarray });
						
					} catch (err) {
						self.postMessage({ success: false, error: "Sai mật khẩu hoặc file PDF bị hỏng cấu trúc." });
					}
				}
			],
			arguments: gsArgs,
			print: (text: any) => console.log("[GS LOG]:", text),
			printErr: (text: any) => console.error("[GS ERR]:", text),
			noExitRuntime: 1
		};

		// @ts-ignore
		if (!(self as any).Module) {
			// @ts-ignore
			(self as any).Module = ModuleConfig;
			
			// 🚀 CÁCH QUA MẶT VITE: Ghép chuỗi động với location.origin
			const gsScriptUrl = self.location.origin + '/gs-worker.js';
			import(/* @vite-ignore */ gsScriptUrl).catch(err => {
				console.error("🔥 LỖI LOAD GS-WORKER:", err);
				self.postMessage({ success: false, error: "Không tải được lõi xử lý PDF." });
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
		console.error("🔥 CHI TIẾT LỖI WORKER:", error);
		self.postMessage({ success: false, error: `Lỗi khởi tạo: ${error.message || error}` });
	}
};
