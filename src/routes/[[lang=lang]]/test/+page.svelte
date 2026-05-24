<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { languages } from "$lib/i18n/languages";
	import { translations } from "$lib/i18n/translations";
	import {
		Barcode,
		FileSpreadsheet,
		Tags,
		Download,
		Copy,
		ShieldCheck,
		Upload,
		X,
		AlertTriangle,
		ChevronDown,
		Plus,
		Trash2
	} from "lucide-svelte";
	import { getRelatedTools } from "$lib/config/relatedTools.js";
	import RelatedTools from "$lib/components/RelatedTools.svelte";

	type Mode = "single" | "bulk" | "label";
	type BarcodeType = "code128" | "code39" | "ean13" | "upc" | "jan" | "isbn";

	let currentLangKey = $derived($page.params.lang || "en");
	let activeLang = $derived(languages.find((l) => l.key === currentLangKey) || languages[0]);
	let t = $derived((key: string) =>
		translations[activeLang.key]?.[key] || translations["en"]?.[key] || localCopy[activeLang.key]?.[key] || localCopy.en[key] || key
	);

	let { data } = $props();

	let mode = $state<Mode>("single");
	let value = $state("ABC-123456");
	let barcodeType = $state<BarcodeType>("code128");
	let bulkText = $state("SKU-001\nSKU-002\nSKU-003\nSKU-004\nSKU-005");
	let showText = $state(true);
	let labelCols = $state(3);
	let labelRows = $state(6);
	let error = $state("");
	let copied = $state(false);
	let moreOpen = $state(false);
	let fileInput: HTMLInputElement;

	let bulkItems = $derived(
		bulkText
			.split(/\r?\n/)
			.map((x) => x.trim())
			.filter(Boolean)
			.slice(0, 300)
	);

	let currentItems = $derived(mode === "single" ? [value.trim() || "ABC-123456"] : bulkItems);
	let previewItems = $derived(mode === "single" ? currentItems : currentItems.slice(0, mode === "label" ? labelCols * labelRows : 8));
	
	let canExport = $derived(mode === "single" ? !!value.trim() : bulkItems.length > 0);

	let jsonLd = $derived(JSON.stringify({
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: t("barcode.meta.title"),
		description: t("barcode.meta.desc"),
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "All",
		browserRequirements: "Requires JavaScript",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
	}));

	onMount(() => {
		const path = $page.url.pathname;
		if (path.includes("bulk-barcode")) mode = "bulk";
		else if (path.includes("barcode-label")) mode = "label";
		else mode = "single";
	});

	function setMode(next: Mode) {
		mode = next;
		error = "";
		moreOpen = false;
	}

	function triggerFile() {
		fileInput.click();
	}

	async function handleCsv(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		const text = await file.text();
		bulkText = text
			.split(/\r?\n/)
			.map((row) => row.split(",")[0]?.trim())
			.filter(Boolean)
			.join("\n");
		mode = "bulk";
	}

	function addSample() {
		bulkText = [bulkText.trim(), "SKU-006", "SKU-007", "SKU-008"].filter(Boolean).join("\n");
	}

	function clearBulk() {
		bulkText = "";
		if (fileInput) fileInput.value = "";
	}

	function validate() {
		error = "";
		if (mode === "single" && !value.trim()) error = t("barcode.error.empty");
		if ((mode === "bulk" || mode === "label") && bulkItems.length === 0) error = t("barcode.error.bulkEmpty");
		return !error;
	}

	function downloadSvg(code = value.trim() || "ABC-123456") {
		if (!validate()) return;
		const svg = makeDemoBarcodeSvg(code, barcodeType, showText);
		const blob = new Blob([svg], { type: "image/svg+xml" });
		const href = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = href;
		a.download = `${safeName(code)}.svg`;
		a.click();
		URL.revokeObjectURL(href);
	}

	function downloadBulkTxt() {
		if (!validate()) return;
		const content = currentItems.map((x) => `${x}.svg`).join("\n");
		const blob = new Blob([content], { type: "text/plain" });
		const href = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = href;
		a.download = mode === "label" ? "barcode-labels-demo.txt" : "barcode-bulk-demo.txt";
		a.click();
		URL.revokeObjectURL(href);
	}

	async function copySvg() {
		if (!validate()) return;
		await navigator.clipboard.writeText(makeDemoBarcodeSvg(value.trim() || "ABC-123456", barcodeType, showText));
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}

	function safeName(input: string) {
		return input.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "barcode";
	}

	function makeDemoBarcodeSvg(code: string, type: string, withText: boolean) {
		// UI demo only. Replace with JsBarcode/bwip-js in production.
		const bars = Array.from(code).slice(0, 32).map((ch, i) => 2 + ((ch.charCodeAt(0) + i * 7) % 4));
		let x = 16;
		let rects = "";
		for (const w of bars) {
			rects += `<rect x="${x}" y="18" width="${w}" height="54" rx="0.5"/>`;
			x += w + 2;
		}
		const width = Math.max(210, x + 16);
		const h = withText ? 108 : 88;
		const text = withText ? `<text x="${width / 2}" y="96" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#0f172a">${escapeHtml(code)}</text>` : "";
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}"><rect width="100%" height="100%" rx="10" fill="white"/><g fill="#0f172a">${rects}</g><text x="16" y="12" font-family="Arial, sans-serif" font-size="8" fill="#94a3b8">${type.toUpperCase()}</text>${text}</svg>`;
	}

	function escapeHtml(input: string) {
		return input.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
	}

	function md(text: string) {
		return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
	}

	const localCopy: Record<string, Record<string, string>> = {
		en: {
			"barcode.meta.title": "Barcode Generator — Free Online Barcode Maker",
			"barcode.meta.desc": "Create single, bulk, and printable barcode labels online. Export SVG, PNG, or PDF-ready labels.",
			"barcode.hero.title": "Barcode Generator",
			"barcode.hero.sub": "Create product barcodes, bulk barcodes, and print-ready labels in one browser tool.",
			"barcode.tab.single": "Single",
			"barcode.tab.bulk": "Bulk",
			"barcode.tab.label": "Labels",
			"barcode.input.value": "Barcode value",
			"barcode.type": "Type",
			"barcode.showText": "Show text",
			"barcode.bulk.label": "Codes",
			"barcode.bulk.hint": "One code per line. CSV uses the first column.",
			"barcode.bulk.upload": "Upload CSV",
			"barcode.bulk.count": "codes",
			"barcode.label.layout": "Label layout",
			"barcode.more": "Options",
			"barcode.btn.downloadSvg": "Download SVG",
			"barcode.btn.downloadAll": "Export demo",
			"barcode.btn.copySvg": "Copy SVG",
			"barcode.preview.title": "Live preview",
			"barcode.error.empty": "Enter a barcode value first.",
			"barcode.error.bulkEmpty": "Paste or upload at least one code.",
			"note.privacy": "Barcode values are processed in your browser. Nothing is uploaded while generating this demo.",
			"hero.pill1": "Free",
			"hero.pill2": "No upload",
			"hero.pill3": "CSV ready",
			"relatedTools.label": "Also try",
			"faq.barcode.title": "Barcode Generator FAQ",
			"faq.barcode.1.q": "Which barcode type should I use?",
			"faq.barcode.1.a": "Use **Code128** for internal SKUs, **EAN-13/JAN** for retail products, and **UPC** for US retail products.",
			"faq.barcode.2.q": "Can I create many barcodes at once?",
			"faq.barcode.2.a": "Yes. Use Bulk mode to paste a list or upload a CSV file.",
			"faq.barcode.3.q": "Can I print barcode labels?",
			"faq.barcode.3.a": "Yes. Use Labels mode to prepare a print-friendly barcode grid."
		},
		ja: {
			"barcode.meta.title": "バーコード作成｜無料オンラインバーコード生成ツール",
			"barcode.meta.desc": "単一バーコード、Excel/CSVの一括作成、印刷用バーコードラベルをブラウザで作成できます。",
			"barcode.hero.title": "バーコード作成",
			"barcode.hero.sub": "商品バーコード、一括作成、印刷用ラベルを1つのツールで作成できます。",
			"barcode.tab.single": "単一",
			"barcode.tab.bulk": "一括",
			"barcode.tab.label": "ラベル",
			"barcode.input.value": "バーコード値",
			"barcode.type": "種類",
			"barcode.showText": "テキスト表示",
			"barcode.bulk.label": "コード一覧",
			"barcode.bulk.hint": "1行に1つ。CSVは1列目を読み込みます。",
			"barcode.bulk.upload": "CSVをアップロード",
			"barcode.bulk.count": "件",
			"barcode.label.layout": "ラベル配置",
			"barcode.more": "詳細設定",
			"barcode.btn.downloadSvg": "SVGをダウンロード",
			"barcode.btn.downloadAll": "デモ出力",
			"barcode.btn.copySvg": "SVGをコピー",
			"barcode.preview.title": "プレビュー",
			"barcode.error.empty": "バーコード値を入力してください。",
			"barcode.error.bulkEmpty": "コードを1件以上入力またはアップロードしてください。",
			"note.privacy": "バーコード値はブラウザ内で処理されます。このデモではアップロードしません。",
			"hero.pill1": "無料",
			"hero.pill2": "アップロード不要",
			"hero.pill3": "CSV対応",
			"relatedTools.label": "関連ツール",
			"faq.barcode.title": "バーコード作成 FAQ",
			"faq.barcode.1.q": "どのバーコード種類を使うべきですか？",
			"faq.barcode.1.a": "社内SKUには **Code128**、日本の商品コードには **JAN**、海外商品には **EAN-13/UPC** がよく使われます。",
			"faq.barcode.2.q": "複数のバーコードを一括作成できますか？",
			"faq.barcode.2.a": "はい。一括モードでリストを貼り付けるか、CSVをアップロードできます。",
			"faq.barcode.3.q": "バーコードラベルを印刷できますか？",
			"faq.barcode.3.a": "はい。ラベルモードで印刷用のバーコード配置を作成できます。"
		},
		"zh-TW": {
			"barcode.meta.title": "條碼產生器｜免費線上製作 Code128、EAN 條碼",
			"barcode.meta.desc": "線上產生單筆條碼、批次條碼與可列印的條碼標籤，支援 Code128、EAN、JAN、UPC。",
			"barcode.hero.title": "條碼產生器",
			"barcode.hero.sub": "製作商品條碼、批次條碼，或直接產生可列印的條碼標籤。",
			"barcode.tab.single": "單筆",
			"barcode.tab.bulk": "批次",
			"barcode.tab.label": "標籤",
			"barcode.input.value": "條碼內容",
			"barcode.type": "類型",
			"barcode.showText": "顯示文字",
			"barcode.bulk.label": "條碼清單",
			"barcode.bulk.hint": "每行一筆。CSV 會讀取第一欄。",
			"barcode.bulk.upload": "上傳 CSV",
			"barcode.bulk.count": "筆",
			"barcode.label.layout": "標籤版面",
			"barcode.more": "更多設定",
			"barcode.btn.downloadSvg": "下載 SVG",
			"barcode.btn.downloadAll": "下載示範",
			"barcode.btn.copySvg": "複製 SVG",
			"barcode.preview.title": "即時預覽",
			"barcode.error.empty": "請先輸入條碼內容。",
			"barcode.error.bulkEmpty": "請輸入或上傳至少一筆條碼。",
			"note.privacy": "條碼內容會在瀏覽器中處理。此示範不會上傳你的檔案。",
			"hero.pill1": "免費",
			"hero.pill2": "不用上傳",
			"hero.pill3": "支援 CSV",
			"relatedTools.label": "也可以試試",
			"faq.barcode.title": "條碼產生器常見問題",
			"faq.barcode.1.q": "應該使用哪一種條碼？",
			"faq.barcode.1.a": "內部 SKU 可用 **Code128**，零售商品常用 **EAN-13/JAN**，美國商品常用 **UPC**。",
			"faq.barcode.2.q": "可以批次產生條碼嗎？",
			"faq.barcode.2.a": "可以。使用批次模式貼上清單或上傳 CSV。",
			"faq.barcode.3.q": "可以列印條碼標籤嗎？",
			"faq.barcode.3.a": "可以。使用標籤模式產生適合列印的條碼版面。"
		},
		th: {
			"barcode.meta.title": "สร้างบาร์โค้ด｜เครื่องมือสร้างบาร์โค้ดออนไลน์ฟรี",
			"barcode.meta.desc": "สร้างบาร์โค้ดเดี่ยว สร้างบาร์โค้ดหลายรายการ และทำฉลากบาร์โค้ดสำหรับพิมพ์ได้ในเบราว์เซอร์",
			"barcode.hero.title": "สร้างบาร์โค้ด",
			"barcode.hero.sub": "สร้างบาร์โค้ดสินค้า หลายรายการ และฉลากสำหรับพิมพ์ในเครื่องมือเดียว",
			"barcode.tab.single": "เดี่ยว",
			"barcode.tab.bulk": "หลายรายการ",
			"barcode.tab.label": "ฉลาก",
			"barcode.input.value": "ค่าบาร์โค้ด",
			"barcode.type": "ประเภท",
			"barcode.showText": "แสดงข้อความ",
			"barcode.bulk.label": "รายการรหัส",
			"barcode.bulk.hint": "หนึ่งรหัสต่อหนึ่งบรรทัด CSV ใช้คอลัมน์แรก",
			"barcode.bulk.upload": "อัปโหลด CSV",
			"barcode.bulk.count": "รหัส",
			"barcode.label.layout": "รูปแบบฉลาก",
			"barcode.more": "ตัวเลือก",
			"barcode.btn.downloadSvg": "ดาวน์โหลด SVG",
			"barcode.btn.downloadAll": "ดาวน์โหลดตัวอย่าง",
			"barcode.btn.copySvg": "คัดลอก SVG",
			"barcode.preview.title": "ตัวอย่างสด",
			"barcode.error.empty": "กรุณาใส่ค่าบาร์โค้ดก่อน",
			"barcode.error.bulkEmpty": "กรุณาใส่หรืออัปโหลดอย่างน้อยหนึ่งรหัส",
			"note.privacy": "ค่าบาร์โค้ดถูกประมวลผลในเบราว์เซอร์ เดโมนี้ไม่อัปโหลดไฟล์ของคุณ",
			"hero.pill1": "ฟรี",
			"hero.pill2": "ไม่ต้องอัปโหลด",
			"hero.pill3": "รองรับ CSV",
			"relatedTools.label": "เครื่องมือที่เกี่ยวข้อง",
			"faq.barcode.title": "คำถามที่พบบ่อย",
			"faq.barcode.1.q": "ควรใช้บาร์โค้ดประเภทไหน?",
			"faq.barcode.1.a": "ใช้ **Code128** สำหรับ SKU ภายใน, **EAN-13/JAN** สำหรับสินค้า retail และ **UPC** สำหรับสินค้าสหรัฐฯ",
			"faq.barcode.2.q": "สร้างบาร์โค้ดหลายรายการได้ไหม?",
			"faq.barcode.2.a": "ได้ ใช้โหมดหลายรายการเพื่อวางลิสต์หรืออัปโหลด CSV",
			"faq.barcode.3.q": "พิมพ์ฉลากบาร์โค้ดได้ไหม?",
			"faq.barcode.3.a": "ได้ ใช้โหมดฉลากเพื่อจัดวางบาร์โค้ดสำหรับพิมพ์"
		}
	};
</script>

<svelte:head>
	<title>{t("barcode.meta.title")}</title>
	<meta property="og:title" content={t("barcode.meta.title")} />
	<meta name="description" content={t("barcode.meta.desc")} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<main>
	<div class="wrap barcode-wrap">
		<section class="barcode-hero">
			<div>
				<h1>{@html t("barcode.hero.title")}</h1>
				<p>{t("barcode.hero.sub")}</p>
			</div>
			<div class="hero-pills" aria-label="Tool features">
				<span>{t("hero.pill1")}</span>
				<span>{t("hero.pill2")}</span>
				<span>{t("hero.pill3")}</span>
			</div>
		</section>

		<section class="tool-card" aria-label="Barcode tool">
			<div class="mode-switch" role="tablist" aria-label="Barcode modes">
				<button class:active={mode === "single"} type="button" onclick={() => setMode("single")}>
					<Barcode size={15} strokeWidth={2.2} />
					<span>{t("barcode.tab.single")}</span>
				</button>
				<button class:active={mode === "bulk"} type="button" onclick={() => setMode("bulk")}>
					<FileSpreadsheet size={15} strokeWidth={2.2} />
					<span>{t("barcode.tab.bulk")}</span>
				</button>
				<button class:active={mode === "label"} type="button" onclick={() => setMode("label")}>
					<Tags size={15} strokeWidth={2.2} />
					<span>{t("barcode.tab.label")}</span>
				</button>
			</div>

			<div class="input-zone">
				{#if mode === "single"}
					<div class="main-input-row">
						<label class="text-field primary-field">
							<span>{t("barcode.input.value")}</span>
							<input bind:value type="text" placeholder="ABC-123456" autocomplete="off" />
						</label>

						<label class="select-field type-field">
							<span>{t("barcode.type")}</span>
							<select bind:value={barcodeType}>
								<option value="code128">Code128</option>
								<option value="code39">Code39</option>
								<option value="ean13">EAN-13</option>
								<option value="upc">UPC</option>
								<option value="jan">JAN</option>
								<option value="isbn">ISBN</option>
							</select>
						</label>
					</div>
				{:else}
					<div class="bulk-head">
						<div>
							<span class="field-title">{t("barcode.bulk.label")}</span>
							<p>{t("barcode.bulk.hint")}</p>
						</div>
						<div class="bulk-actions">
							<button type="button" onclick={triggerFile}><Upload size={14} /> {t("barcode.bulk.upload")}</button>
							<button type="button" onclick={clearBulk} aria-label="Clear"><Trash2 size={14} /></button>
						</div>
					</div>

					<textarea class="bulk-input" bind:value={bulkText} rows="6" spellcheck="false"></textarea>
					<input bind:this={fileInput} class="file-input" type="file" accept=".csv,text/csv" onchange={handleCsv} />

					<div class="bulk-footer">
						<span>{bulkItems.length} {t("barcode.bulk.count")}</span>
						<button type="button" onclick={addSample}><Plus size={13} /> Sample</button>
					</div>

					<div class="main-input-row compact-row">
						<label class="select-field primary-field">
							<span>{t("barcode.type")}</span>
							<select bind:value={barcodeType}>
								<option value="code128">Code128</option>
								<option value="code39">Code39</option>
								<option value="ean13">EAN-13</option>
								<option value="upc">UPC</option>
								<option value="jan">JAN</option>
								<option value="isbn">ISBN</option>
							</select>
						</label>

						{#if mode === "label"}
							<label class="select-field tiny-field">
								<span>{t("barcode.label.layout")}</span>
								<select bind:value={labelCols}>
									<option value={2}>2 × {labelRows}</option>
									<option value={3}>3 × {labelRows}</option>
									<option value={4}>4 × {labelRows}</option>
								</select>
							</label>
						{/if}
					</div>
				{/if}

				<button class="more-toggle" type="button" onclick={() => (moreOpen = !moreOpen)}>
					<span>{t("barcode.more")}</span>
					<ChevronDown size={15} strokeWidth={2.2} />
				</button>

				{#if moreOpen}
					<div class="option-strip">
						<label class="check-pill">
							<input bind:checked={showText} type="checkbox" />
							<span>{t("barcode.showText")}</span>
						</label>
						{#if mode === "label"}
							<label class="mini-select">
								<span>Rows</span>
								<select bind:value={labelRows}>
									<option value={4}>4</option>
									<option value={6}>6</option>
									<option value={8}>8</option>
									<option value={10}>10</option>
								</select>
							</label>
						{/if}
					</div>
				{/if}

				{#if error}
					<div class="error-line"><AlertTriangle size={14} strokeWidth={2} /> {error}</div>
				{/if}
			</div>

			<div class="preview-zone">
				<div class="preview-top">
					<div>
						<span>{t("barcode.preview.title")}</span>
						<strong>{barcodeType.toUpperCase()}</strong>
					</div>
					{#if mode !== "single"}<em>{currentItems.length} items</em>{/if}
				</div>

				{#if mode === "label"}
					<div class="label-preview" style={`grid-template-columns: repeat(${labelCols}, minmax(0, 1fr));`}>
						{#each previewItems as item}
							<div class="label-tile">{@html makeDemoBarcodeSvg(item, barcodeType, showText)}</div>
						{/each}
					</div>
				{:else if mode === "bulk"}
					<div class="bulk-preview">
						{#each previewItems as item}
							<div class="mini-barcode">
								{@html makeDemoBarcodeSvg(item, barcodeType, showText)}
							</div>
						{/each}
					</div>
				{:else}
					<div class="single-preview">
						{@html makeDemoBarcodeSvg(value.trim() || "ABC-123456", barcodeType, showText)}
					</div>
				{/if}
			</div>

			<div class="action-bar">
				{#if mode === "single"}
					<button class="secondary-btn" type="button" onclick={copySvg} disabled={!canExport}>
						<Copy size={15} strokeWidth={2.2} /> {copied ? "Copied" : t("barcode.btn.copySvg")}
					</button>
					<button class="primary-btn" type="button" onclick={() => downloadSvg(value.trim() || "ABC-123456")} disabled={!canExport}>
						<Download size={15} strokeWidth={2.2} /> {t("barcode.btn.downloadSvg")}
					</button>
				{:else}
					<button class="primary-btn wide" type="button" onclick={downloadBulkTxt} disabled={!canExport}>
						<Download size={15} strokeWidth={2.2} /> {t("barcode.btn.downloadAll")}
					</button>
				{/if}
			</div>
		</section>

		<div class="privacy-line">
			<ShieldCheck size={15} strokeWidth={2.1} />
			<span>{@html t("note.privacy")}</span>
		</div>

		<div class="ad-slot ad-slot--after-tool" aria-label="Advertisement"></div>



		<section class="faq-sec" itemscope itemtype="https://schema.org/FAQPage">
			<h2>{t("faq.barcode.title")}</h2>
			<div class="faq-list">
				{#each Array.from({ length: 3 }, (_, i) => i + 1) as n}
					<details class="faq-item" open={n === 1} itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
						<summary class="faq-q" itemprop="name">{t(`faq.barcode.${n}.q`)}</summary>
						<div class="faq-a" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
							<span itemprop="text">{@html md(t(`faq.barcode.${n}.a`))}</span>
						</div>
					</details>
				{/each}
			</div>
		</section>

	
	</div>
</main>

<style>
	.barcode-wrap {
		max-width: 820px;
		margin: 0 auto;
	}

	.barcode-hero {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 18px;
		margin: 8px 0 14px;
	}
	.barcode-hero h1 {
		margin: 0;
		font-size: clamp(1.65rem, 4.4vw, 2.45rem);
		line-height: 1.08;
		letter-spacing: -0.04em;
		color: var(--text);
	}
	.barcode-hero p {
		max-width: 560px;
		margin: 8px 0 0;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--muted);
	}
	.hero-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 6px;
		min-width: 190px;
	}
	.hero-pills span {
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surf);
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.tool-card {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--surf) 94%, white), var(--surf));
		border: 1px solid var(--border);
		border-radius: 18px;
		box-shadow: 0 10px 26px rgba(15, 23, 42, 0.055);
		overflow: hidden;
	}

	.mode-switch {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 8px;
		background: color-mix(in srgb, var(--bg) 72%, var(--surf));
		border-bottom: 1px solid var(--border);
	}
	.mode-switch button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 38px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		color: var(--muted);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}
	.mode-switch button:hover {
		background: color-mix(in srgb, var(--surf) 70%, white);
		color: var(--text);
	}
	.mode-switch button.active {
		background: var(--surf);
		color: var(--accent);
		box-shadow: 0 1px 8px rgba(15, 23, 42, 0.07);
	}

	.input-zone {
		padding: 16px 16px 10px;
	}
	.main-input-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 170px;
		gap: 10px;
	}
	.compact-row {
		grid-template-columns: minmax(0, 1fr) 150px;
		margin-top: 10px;
	}
	.text-field,
	.select-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.text-field span,
	.select-field span,
	.field-title {
		font-size: 12px;
		font-weight: 750;
		color: var(--text);
	}
	.text-field input,
	.select-field select,
	.bulk-input,
	.mini-select select {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg);
		color: var(--text);
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
	}
	.text-field input,
	.select-field select {
		height: 46px;
		padding: 0 13px;
		font-size: 15px;
	}
	.primary-field input {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.01em;
	}
	.text-field input:focus,
	.select-field select:focus,
	.bulk-input:focus,
	.mini-select select:focus {
		border-color: color-mix(in srgb, var(--accent) 68%, var(--border));
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 12%, transparent);
		background: var(--surf);
	}

	.bulk-head,
	.bulk-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.bulk-head p {
		margin: 3px 0 0;
		font-size: 12.5px;
		color: var(--muted);
	}
	.bulk-actions,
	.bulk-footer {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.bulk-actions button,
	.bulk-footer button {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		min-height: 32px;
		padding: 0 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surf);
		color: var(--muted);
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
	}
	.bulk-actions button:hover,
	.bulk-footer button:hover {
		color: var(--text);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
	}
	.bulk-input {
		margin-top: 10px;
		min-height: 138px;
		padding: 12px;
		resize: vertical;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 13px;
		line-height: 1.55;
	}
	.bulk-footer {
		margin-top: 7px;
		font-size: 12px;
		color: var(--muted);
	}
	.file-input { display: none; }

	.more-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		margin-top: 10px;
		padding: 9px 0 2px;
		border: 0;
		background: transparent;
		color: var(--muted);
		font-size: 12.5px;
		font-weight: 700;
		cursor: pointer;
	}
	.more-toggle :global(svg) { transition: transform 0.15s; }
	.more-toggle :global(svg.rotate) { transform: rotate(180deg); }
	.option-strip {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0 2px;
	}
	.check-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 34px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg);
		font-size: 12.5px;
		font-weight: 650;
		color: var(--muted);
	}
	.check-pill input { accent-color: var(--accent); }
	.mini-select {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 12.5px;
		font-weight: 650;
		color: var(--muted);
	}
	.mini-select select {
		height: 34px;
		min-width: 72px;
		padding: 0 9px;
		font-size: 12.5px;
	}
	.error-line {
		display: flex;
		align-items: center;
		gap: 7px;
		margin-top: 9px;
		font-size: 12.5px;
		font-weight: 650;
		color: #dc2626;
	}

	.preview-zone {
		margin: 0 16px 14px;
		padding: 12px;
		border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
		border-radius: 16px;
		background:
			linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0)),
			color-mix(in srgb, var(--bg) 76%, var(--surf));
	}
	.preview-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	.preview-top div {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.preview-top span {
		font-size: 12px;
		font-weight: 750;
		color: var(--text);
	}
	.preview-top strong,
	.preview-top em {
		font-size: 11px;
		font-style: normal;
		font-weight: 750;
		color: var(--muted);
	}
	.single-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 176px;
		padding: 18px;
		border-radius: 14px;
		background: white;
	}
	.single-preview :global(svg) {
		max-width: 100%;
		height: auto;
		filter: drop-shadow(0 8px 18px rgba(15, 23, 42, 0.08));
	}
	.bulk-preview,
	.label-preview {
		display: grid;
		gap: 8px;
		max-height: 330px;
		overflow: auto;
	}
	.bulk-preview {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.mini-barcode,
	.label-tile {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		border-radius: 12px;
		background: white;
		border: 1px solid rgba(15, 23, 42, 0.06);
		overflow: hidden;
	}
	.mini-barcode {
		min-height: 110px;
		padding: 10px;
	}
	.label-preview {
		padding: 9px;
		border-radius: 12px;
		background: white;
	}
	.label-tile {
		min-height: 74px;
		padding: 5px;
		border-style: dashed;
	}
	.mini-barcode :global(svg),
	.label-tile :global(svg) {
		max-width: 100%;
		height: auto;
	}

	.action-bar {
		display: grid;
		grid-template-columns: 1fr 1.25fr;
		gap: 9px;
		padding: 0 16px 16px;
	}
	.primary-btn,
	.secondary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		height: 44px;
		border-radius: 13px;
		font-size: 14px;
		font-weight: 800;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.15s, border-color 0.15s;
	}
	.primary-btn {
		border: 0;
		background: var(--accent);
		color: white;
	}
	.secondary-btn {
		border: 1px solid var(--border);
		background: var(--surf);
		color: var(--text);
	}
	.primary-btn.wide { grid-column: 1 / -1; }
	.primary-btn:hover,
	.secondary-btn:hover {
		transform: translateY(-1px);
	}
	.primary-btn:disabled,
	.secondary-btn:disabled {
		opacity: 0.45;
		cursor: default;
		transform: none;
	}

	.privacy-line {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 10px 2px 16px;
		font-size: 12.5px;
		line-height: 1.45;
		color: var(--muted);
	}
	.privacy-line :global(svg) {
		flex: 0 0 auto;
		color: var(--accent);
	}
	.ad-slot {
		margin: 14px 0 18px;
		min-height: 90px;
		border-radius: var(--r);
		overflow: hidden;
		background: var(--surf);
	}
	.ad-slot:empty { display: none; }
	@media (min-width: 1024px) { .ad-slot--after-tool { display: none; } }

	.how-to-sec {
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	.how-to-sec :global(a) { color: #1550ae; }
	.how-to-sec :global(h1) { font-size: 1.35rem; font-weight: 650; color: var(--text); margin: 0 0 20px; line-height: 1.3; }
	.how-to-sec :global(h2) { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 15px 0 10px; }
	.how-to-sec :global(h3) { font-size: 0.95rem; font-weight: 600; color: var(--text); margin: 20px 0 8px; }
	.how-to-sec :global(p)  { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin: 0 0 12px; }
	.how-to-sec :global(ul), .how-to-sec :global(ol) { padding-left: 1.4em; margin: 8px 0 16px; }
	.how-to-sec :global(li) { font-size: 0.9rem; color: var(--muted); line-height: 1.7; margin-bottom: 6px; }
	.how-to-sec :global(li strong), .how-to-sec :global(strong) { color: var(--text); font-weight: 600; }
	.how-to-sec :global(hr) { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

	@media (max-width: 680px) {
		.barcode-hero {
			align-items: flex-start;
			flex-direction: column;
			gap: 10px;
		}
		.hero-pills {
			justify-content: flex-start;
			min-width: 0;
		}
		.main-input-row,
		.compact-row {
			grid-template-columns: 1fr;
		}
		.bulk-preview {
			grid-template-columns: 1fr;
		}
		.action-bar {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 420px) {
		.mode-switch button {
			font-size: 12px;
			gap: 5px;
		}
		.input-zone,
		.preview-zone,
		.action-bar {
			margin-left: 10px;
			margin-right: 10px;
			padding-left: 10px;
			padding-right: 10px;
		}
		.input-zone {
			margin: 0;
			padding: 12px 10px 8px;
		}
	}
</style>
