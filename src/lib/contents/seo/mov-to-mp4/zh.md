## MOV 影片在 Apple 以外的環境容易出問題

MOV 是 Apple 的原生影片格式，iPhone、iPad、Mac 和 QuickTime 都使用它。在 Apple 生態系內沒有問題 — 但當你把 MOV 檔案傳給使用 Windows 或 Android 的人，或嘗試上傳到預期接收 MP4 的平台時，相容性問題就會出現。檔案可能無法播放、上傳可能失敗，或剪輯軟體可能出現 codec 錯誤。

把 MOV 轉成 MP4 可以解決這個問題，而且不需要重新編碼到更低的畫質。MP4 幾乎到處都支援：Windows、Android、大多數瀏覽器、社群媒體平台、雲端硬碟，以及大部分的影片剪輯軟體。Squishyfile 在瀏覽器中使用 WebAssembly 和 FFmpeg 進行 mov轉mp4，影片在你的裝置上處理，不會上傳到伺服器，不需要帳號，輸出的 MP4 也沒有浮水印。

---

## 什麼時候需要轉換

不是每個 MOV 都需要轉換。如果你只是在自己的 Mac 或 iPhone 上用 QuickTime 播放，MOV 就夠用了。但在這些情況下，MP4 明顯是更好的選擇：

- 你想把 iPhone 錄的影片傳給使用 Android 或 Windows 的人，確保對方能打開
- 你要上傳到 Instagram、YouTube、Google 雲端硬碟或其他偏好 MP4 的平台
- 你要把影片附在 Email 或工作文件中，不希望對方遇到相容性問題
- 剪輯軟體匯入 MOV 不穩定或出現 codec 錯誤
- 你想用一個未來任何裝置都能播放的格式長期保存影片

iPhone 的 MOV 檔案還有另一個需要注意的地方：根據錄影設定不同，內部可能使用 H.264 或 HEVC 編碼。HEVC 的 MOV 雖然儲存空間較小，但在舊版 Windows 電腦和部分 Android 裝置上可能無法播放。如果你曾經傳 iPhone 影片給別人但對方打不開，HEVC MOV 通常就是原因。轉成 MP4（H.264）可以消除這個問題。

---

## 如何把 MOV 轉成 MP4

**步驟 1 — 選擇 MOV 檔案。** 將影片拖曳到上傳區域，或點擊選取裝置中的檔案。這個工具處理儲存在本機的 MOV 檔案，不支援從網址下載影片。

**步驟 2 — 確認輸出格式為 MP4。** 此頁面預設輸出 MP4，這是大多數 MOV 轉換情況下最合適的選擇，可以在最多的裝置和平台上播放。

**步驟 3 — 轉檔並下載。** 轉檔期間請保持瀏覽器分頁開啟。處理時間取決於檔案大小、影片長度、解析度和裝置效能。iPhone 的 4K 影片和長錄影會比短片花更多時間。轉換完成後下載 MP4。

---

## iPhone MOV 檔案為什麼容易造成問題

iPhone 根據設定用不同格式錄影。在某些情況下 — 透過 QuickTime 匯出、AirDrop 到 Mac，或從相片 App 匯出 — 輸出的檔案會是 MOV 格式。

內部的編碼格式是關鍵。使用 HEVC（又稱 H.265）錄影的 iPhone 會產生儲存效率高、但在沒有安裝額外 codec 的 Windows 電腦上難以播放的 MOV 檔案。這就是為什麼很多人傳了 iPhone 影片給別人，對方卻說打不開。轉成使用 H.264 的 MP4，可以讓檔案在 Windows、Android、舊版 Mac 和幾乎所有播放器上都能順利開啟，不需要對方安裝任何額外軟體。

---

## Mac、Windows、iPhone 和 Android 都可以使用

Squishyfile 在瀏覽器中運作，所以在 macOS、Windows、iPhone 和 Android 上的使用方式完全相同。Mac 上，從 Finder 把 MOV 拖曳到上傳區域。Windows 上，使用檔案總管。iPhone 上，在 Safari 開啟頁面，從檔案 App 或相片選取影片。

iPhone 的 4K 影片和長錄影通常檔案很大。這種情況下，電腦或筆電瀏覽器會比手機更穩定更快。手機轉換失敗或卡住時，改用電腦再試一次。轉檔期間保持分頁開啟，不要讓裝置進入睡眠。

---

## 其他影片轉檔工具

- [影片轉檔工具（全格式）](/zh/video-converter)
- [AVI 轉 MP4](/zh/avi-to-mp4)
- [MKV 轉 MP4](/zh/mkv-to-mp4)
- [WebM 轉 MP4](/zh/webm-to-mp4)

---

## 相關文章

- [iPhone 影片怎麼轉成 MP4？](/zh/blog/iphone-video-to-mp4-guide)
- [MOV、AVI、MKV、WebM 轉 MP4 有什麼差別？](/zh/blog/video-formats-to-mp4-differences)
- [為什麼選擇不上傳影片的轉檔工具？](/zh/blog/no-upload-video-converter-privacy)
