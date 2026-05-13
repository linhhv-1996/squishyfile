---
title: PDF 內部結構解剖與最佳化演算法：從底層邏輯理解檔案瘦身原理
description: 深入解析 PDF 檔案內部結構（Header、Body、XREF、Trailer），探討 FlateDecode、Font Subsetting、Image Downsampling 等核心演算法，從電腦科學角度理解 PDF 壓縮與最佳化的底層邏輯。
date: 2026-05-08
---

# PDF 內部結構解剖與最佳化演算法：從底層邏輯理解檔案瘦身原理

身為長期耕耘瀏覽器端多媒體處理的工程師，我經常遇到一個迷思：許多人認為「PDF 壓縮」只是把圖片畫質調低。然而從電腦科學的視角來看，**PDF 最佳化（PDF Optimization Algorithm）** 本質上是對一個物件導向資料庫進行結構重構與冗餘清除的過程。這篇文章將從 ISO 32000 規範出發，逐層剝開 PDF 的物理結構，並剖析 **Reduce PDF Size Logic** 在底層究竟如何運作。

---

## PDF 的物理結構：不只是文件，更是一個物件導向資料庫

多數使用者將 PDF 視為「不可編輯的文件格式」，但對系統工程師而言，PDF 其實是一個遵循 COS（Carousel Object Structure）語法的序列化物件流。一個合法的 PDF 檔案在物理層必須包含四個區段：

### 1. Header（檔頭）
標示 PDF 版本號，例如 `%PDF-1.7`。這個位元組序列不僅宣告版本，更決定了後續支援的進階功能（如 Object Stream、Cross-Reference Stream）。

### 2. Body（主體）
由一連串間接物件（Indirect Objects）組成，語法格式為：
```
n 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
```
這裡的 `n` 是物件編號，`0` 是世代號（Generation Number），`R` 則是參照（Reference）。Body 內容承載了頁面描述、影像串流（Image Streams）、字型資源（Font Resources）、中繼資料（Metadata）等所有內容。

### 3. Cross-Reference Table（XREF，交叉參照表）
XREF 是 PDF 作為「隨機存取格式」的核心。它記錄了每個物件在檔案中的位元組偏移量（Offset），讓解析器無需從頭掃描就能直接跳轉到特定物件。一個典型的 XREF 段落長這樣：
```
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
```
其中 `f` 表示自由物件（Free），`n` 表示使用中（In-use）。

### 4. Trailer（預告片／尾聲）
位於檔案最末端，包含 `/Size`（物件總數）、`/Root`（文件根目錄參照）、`/Info`（文件資訊字典），以及最重要的 `startxref` 數值——指向 XREF 表的起始位元組偏移量。

> **工程師視角**：PDF 的設計哲學與記憶體管理中的 Heap 結構驚人地相似。XREF 表就是物件配置表（Allocation Table），而 Incremental Update（增量更新）機制則類似 Append-only Log——這也是為什麼反覆編輯後的 PDF 會膨脹：舊物件並未被刪除，只是標記為自由狀態，新物件不斷追加到檔案尾端。

---

## 為什麼 PDF 會「膨脹」？隱藏的資料冗餘分析

從 **PDF Internal Structure** 的角度，檔案體積失控通常來自三個隱藏元兇：

### 1. 未壓縮的物件串流（Uncompressed Streams）
早期 PDF 產生器常將頁面內容流（Content Stream）以純文字 ASCII 儲存。一個包含大量向量繪圖的頁面，其操作碼（Operators）如 `m`（moveto）、`l`（lineto）、`f`（fill）會佔用驚人的位元組數。若未套用 `/Filter`（如 `/FlateDecode`），這些資料幾乎處於零壓縮狀態。

### 2. 累積的增量更新與孤兒物件（Orphan Objects）
如前所述，PDF 支援增量更新（Incremental Saving）。每次「儲存」實際上是在檔案尾端追加新的 Body + XREF + Trailer，並更新 `startxref` 指標。舊版物件雖不再被 XREF 表引用，卻仍實體存在於檔案中。這些 **Orphan Objects** 構成典型的空間洩漏（Space Leak）。

### 3. 冗余的中繼資料與編輯歷史（Metadata & History）
許多專業排版軟體會在 `/PieceInfo` 或 XMP 中嵌入完整的編輯歷史、圖層資訊、撤銷紀錄（Undo Stack），甚至嵌入原始源檔（如 InDesign 的內嵌結構）。對終端使用者而言這些是隱形的，但對檔案系統而言，它們是實實在在的位元組負擔。

---

## 影像與字型的最佳化技術：Reduce PDF Size Logic 的兩大支柱

真正的 **PDF Compression Technique** 並非單一演算法，而是針對不同資料型態採取最適策略。

### Image Downsampling：從訊號處理角度降低 DPI

當 PDF 內嵌高解析度影像（例如 300 DPI 甚至 600 DPI 的掃描圖），最佳化器會執行 **Downsampling**——這是一個訊號重取樣（Resampling）問題。常用的內插演算法有兩種：

| 演算法 | 數學特性 | 適用場景 |
|---|---|---|
| **Bilinear Interpolation** | 線性權重計算，運算量低，保留高頻細節能力較弱 | 螢幕顯示、縮圖預覽 |
| **Bicubic Interpolation** | 三次多項式卷積，考慮 4×4 鄰域像素，平滑度高 | 印刷品質、漸層豐富的影像 |

從實作面來看，Downsampling 並非簡單的「丟棄像素」，而是透過卷積核（Convolution Kernel）進行低通濾波後再降取樣，避免混疊失真（Aliasing）。工程師在設計壓縮工具時，必須在 `lanczos3`、`bicubic`、`bilinear` 之間做運算成本與視覺品質的權衡。

### Font Subsetting：Glyph 層級的精準萃取

這是許多使用者忽略卻極具成效的技術。一套完整的 CJK 字型（如 Noto Sans CJK）動輒 10–20 MB，若直接 Embed 整套字型進 PDF，體積會瞬間爆炸。

**Font Subsetting** 的邏輯是：
1. 掃描文件內所有文字串（Text Strings），建立實際使用的字元集合（Used Glyph Set）。
2. 從原始字型的 CMap（Character Map）與 `glyf` / `CFF` 表中，萃取出對應的 Glyph 輪廓資料。
3. 重建一個迷你字型子集（Subset），只包含必要的 Glyphs、Hinting 與 Kerning 資訊。

對系統工程師而言，這相當於對字型資源進行「死碼刪除（Dead Code Elimination）」。一份僅使用 50 個獨特漢字的文件，經過 Subsetting 後，字型佔用可能從 15 MB 降至 30 KB。

---

## 壓縮核心：FlateDecode 與垃圾回收機制

談到 **FlateDecode**，我們必須回到 PDF 規範的第 7.4.4 節。這是 PDF 世界中最常見的串流過濾器（Stream Filter）。

### Flate / zlib / Deflate 的數學原理

FlateDecode 本質上是對 **zlib/Deflate** 演算法的封裝。Deflate 結合了兩種經典技術：
- **LZ77**：將重複出現的位元組序列替換為「長度-距離」對（Length-Distance Pair），消除空間冗餘。
- **Huffman Coding**：對出現頻率高的符號分配短編碼，出現頻率低的分配長編碼，消除統計冗餘。

在 PDF 的實作中，Stream Dictionary 會明確標示：
```
/Filter /FlateDecode
/Length 142
```
這告訴解析器：後續 142 位元組是經過 Deflate 壓縮的資料，解壓後即可還原原始內容流。對於以文字為主的頁面內容（如大量重複的 `BT` / `ET` 操作碼），FlateDecode 通常能達到 5:1 到 10:1 的壓縮比。

### 垃圾回收：重建 XREF 與清除孤兒物件

專業級的 **PDF Optimization Algorithm** 最後一步必定是「重寫（Rewrite）」而非「增量更新」。其流程如下：

1. **解析階段**：建立完整的物件圖（Object Graph），從 `/Root`（Catalog）開始遞迴追蹤所有可達物件（Reachable Objects）。
2. **標記階段**：標記所有被引用的物件，未被標記的即為孤兒物件（Orphan Objects）。
3. **壓縮階段**：對所有 Stream 重新套用 FlateDecode（若尚未壓縮或壓縮層級不足），並執行影像 Downsampling 與 Font Subsetting。
4. **重寫階段**：按物件編號順序連續寫入新的 Body，產生全新的線性化 XREF 表，徹底消除歷史遺留的位元組碎片。

這個過程在系統層面與程式語言中的 **Garbage Collection（GC）** 幾乎同構：標記-清除（Mark-and-Sweep）後進行記憶體壓實（Compaction），最終得到一個緊湊、連續、無碎片的檔案映像。

---

## 結論：PDF 最佳化是資料結構的重構工程

綜觀以上分析，**Reduce PDF Size Logic** 絕非單純的「把圖片變模糊」。從電腦科學的角度，這是一個涉及**資料結構遍歷、圖論可達性分析、訊號處理、熵編碼、字型子集化**的綜合性工程。

- 它要求解析器精確理解 PDF 的 **Object-Oriented Structure**；
- 它要求最佳化器運用 **Bicubic/Bilinear Interpolation** 在奈奎斯特頻率邊界上謹慎操作；
- 它要求壓縮引擎調用 **zlib/Deflate** 在 LZ77 視窗與 Huffman 樹之間取得平衡；
- 它要求重寫器像記憶體管理單元（MMU）一樣，重新配置 XREF 並回收無用物件。

對於開發者與進階使用者而言，理解這些底層原理不僅有助於選擇真正專業的壓縮工具，更能讓我們在處理機敏文件時，清楚知道每一個位元組（Byte）究竟發生了什麼事——而這正是資訊工程領域中「知其然，更知其所以然」的專業態度。

> **技術備註**：在 Squishyfile 的開發過程中，我們將類似的底層資料處理思維應用於瀏覽器端的 WASM 壓縮引擎。無論是 PDF 或影片，核心邏輯始終一致：**在客戶端完成所有運算，確保資料不離開本機記憶體，並以數學嚴謹性對待每一個位元組。**

