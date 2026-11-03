# 字序 · 香港中文打字練習

以香港繁體中文為核心的本機優先倉頡／速成練習網站。React 19、TypeScript、Vite、Tailwind CSS 4；無付費 API、無後端資料收集、無需註冊。

[線上練習](https://kenneth0516.github.io/zi-typing/) · [GitHub 原始碼](https://github.com/Kenneth0516/zi-typing)

## 啟動

需要 Node.js 22.12+ 或 24，以及 pnpm 11.25。

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

正式輸出在 `dist/`，可放到支援 HTTPS 的靜態網站服務。

GitHub Pages 由 `.github/workflows/pages.yml` 自動部署：推送到 `main` 後先執行測試，再按 repository 名稱設定 Vite base 並建置及發佈。repository 的 Settings → Pages → Source 應選 GitHub Actions。

本機驗證相同的子路徑建置：

```sh
pnpm build --base=/zi-typing/
```

字表、來源文件、favicon 及原始碼下載均跟隨部署 base。`public/source.zip` 會在建置時自動產生，不提交到 Git。

## 已完成

1. **輸入引擎**：不受控原生 textarea，疊加同位置的目標及顏色提示；原生候選字、任意選取、Backspace、Delete、方向鍵及中途插入。IME 組字期間不重寫 value、不計分、不換句。`compositionend` 以 animation frame 讀取最後 DOM，兼容最後 input 早於或晚於 end 的常見順序，並按 value 去重。
2. **比對及練習**：字素分割、固定平手規則的 Levenshtein 對齊。即時對齊對未輸入尾段免罰；結算用完整對齊。59 句原創示例及 4 篇文章；書面語／廣東話、七個句子主題、隨機與主題篩選、同場不重複、近期二元字組相似度避讓。自由練習、10／20／50 句目標、30／60／120 秒測速、跳過及智能換句。
3. **查碼及成績**：固定 Rime 倉頡五代修訂，75,151 字條目；主動點選查碼，完整碼、字根及首尾速成碼。原始字表、版本及授權隨附。略去 Z 開頭的特殊符號／捷徑碼。CPM、最終與首次準確率、錯漏多字、修正、完成／帶錯／跳過／部分完成及查碼統計。
4. **儲存及介面**：IndexedDB 設定、已結算紀錄及草稿；恢復選取位置。JSON 備份、確認後合併、內容去重及衝突另存，整個合併用單一交易。四個主要頁面、7／30 日真實趨勢、裝置／輸入法分類／標點／提示／模式篩選、弱項句子推薦、深淺主題、手機查碼底部面板、鍵盤操作及對話框焦點管理。

## 關鍵規則

- 倉頡／速成選項只分類練習紀錄，不偵測或切換系統輸入法。
- 至少輸入目標有效字元數的 **80%** 才能手動「完成此句」。門檻只限制正常完成；隨時結束或測速到時，當前文字另記為「部分完成」，不增加完成句數。部分完成的正確中文字計入 CPM，未開始輸入的尾段不計漏字，已輸入範圍內的漏字仍計入。
- 完全正確才自動換句。帶錯完成保存最終錯誤。跳過不增加正確字數或完成句數，時間保留。
- CPM = 已結算非跳過項目的最終正確中文字 ÷ 有效秒數 × 60。標點永遠不增加中文字 CPM；輸入標點的時間保留。淨字數不從按鍵事件累加，反覆重打不重複計分。
- 首次準確率按「題目 ID＋目標字元位置」第一次已確認輸入計算，多字各次新嘗試列入分母。修正、撤銷保留歷史，不能改善已記錄位置的首次結果。CPM 使用最終對齊，首次準確率使用當次即時對齊。
- 自由練習首次已確認非空輸入才開始計時，手動暫停及查碼暫停。切離頁面不會自動暫停時鐘，請先手動暫停。測速不允許暫停，查碼照常倒數；期限後以最後已確認文字結算，未確認組字不計入。
- 貼上及拖放已攔截。可辨識的 `insertReplacementText` 等自動取代標記輔助，成績分析預設排除。無法可靠偵測所有外部自動輸入或作業系統文字替代，不聲稱防作弊。
- 固定題庫用盡會提早結算，包括「不限句數」及 50 句設定；不會偷偷重複題目湊數。
- 查碼不插入答案；自由練習查碼暫停，限時查碼不暫停。速成只取首尾，不提供跨系統通用的候選序號。
- 練習開始後核心選項鎖定，避免混合不同類別統計；結束後重新開一場即可更改。

## 模組

| 範疇 | 檔案 |
|---|---|
| 字素及 UTF-16 位置 | `src/core/text.ts` |
| 完整／即時序列對齊 | `src/core/alignment.ts` |
| IME 閘門及去重 | `src/core/ime.ts` |
| 原生編輯區及焦點 | `src/components/Editor.tsx` |
| 練習狀態、草稿、期限 | `src/hooks/usePractice.ts` |
| 單調時鐘 | `src/core/clock.ts` |
| 事件歷史及成績 | `src/core/scoring.ts` |
| 題庫及抽選 | `src/data/prompts.ts`、`src/core/prompts.ts` |
| 查碼及面板 | `src/data/dictionary.ts`、`src/components/LookupPanel.tsx` |
| IndexedDB／未來同步介面 | `src/storage/repository.ts` |
| 分析及弱項 | `src/components/Analytics.tsx` |
| 設定／備份 | `src/components/SettingsPage.tsx` |

`PracticeRepository` 是可替換儲存介面。未來同步應以 immutable session ID 合併，先展示合併確認，遇到內容衝突另存，不得覆蓋訪客資料。現時沒有假登入按鈕或假雲端狀態。

## 驗證

46 項 Vitest 測試：文字對齊 13 項、IME 閘門 7 項、計時 3 項、評分 8 項、題庫及碼轉換 3 項、IndexedDB 4 項、編輯及流程整合 8 項。涵蓋漏、多、錯、重複字、中途修正、增補平面中文字、標點忽略、兩種組字事件順序、取消組字、選取與查碼焦點、暫停原因獨立、30 秒到期、草稿不覆蓋及備份重複匯入。

以網址 `?qa=1` 可進入驗收工作區，使用獨立的 IndexedDB，測試紀錄不會混入正式練習。

`pnpm build` 同時執行 TypeScript strict 檢查。測試採用 synthetic DOM composition 事件及 fake IndexedDB，**不等於**真實各平台輸入法認證。

### 尚需實機驗收

Windows Chrome／Edge 倉頡與速成、macOS Safari／Chrome 倉頡、iOS Safari 原生鍵盤、Android Chrome 原生鍵盤：

1. 組碼、候選選字、取消組字、候選窗按 Enter，不得提早換句。
2. 任意位置觸控及滑鼠選取，補漏字、Delete、Backspace、取代、撤銷／重做。
3. IME 確認後 target／value／native selection 同步；組字期間 DOM 不被重建。
4. 虛擬鍵盤升起、旋轉螢幕、長文章捲動，當前編輯位置及查碼返回焦點。
5. 真實裝置的 IndexedDB 限額、私密模式、清除瀏覽資料及崩潰恢復。

## 已知限制及第五階段

- 原生跨平台 IME 實機矩陣尚未全部測試。部分極端事件順序、部分提交式 IME 需要實機回饋再調整；不以 synthetic 測試保證所有輸入法。
- 原生 textarea 保留游標及編輯語義；字色層以相同字體、換行及字距對位。任意拉丁字母、混合字型 fallback、不同系統字型或瀏覽器字形寬度，可能出現輕微視覺偏移；組字期間顯示原生文字。
- 重複字的多種合理對齊採固定平手規則，輸入更多上下文仍可能改變早前歧義的對齊。首次準確率保留首次已記錄位置，不事後美化。
- 此版本支援現代瀏覽器的 `Intl.Segmenter`、IndexedDB、Unicode property escapes。未提供舊版瀏覽器 polyfill。
- 草稿在確認輸入後排隊保存，另每三秒及頁面隱藏時保存時間／選取位置；崩潰可能損失最後一筆尚未完成的儲存交易。
- 題庫未達一千句；文章只涵蓋日常生活及學習教育。沒有適合某弱項字的題目時，會清楚提示，不生成不自然字串。
- 字碼參考倉頡五代，不保證與倉頡三代或所有系統異體字取碼一致。無可靠條目時顯示暫無資料。
- 本機儲存權限被拒時會通知；可以繼續練習，但不能保證保存。備份匯入目前只合併已結算歷史，不套用設定或草稿，避免蓋過現有進度。
- 帳戶、雲端同步、自適應難度及 Service Worker 離線安裝未實作，屬第五階段。

## 資料及授權

應用程式 GPL-3.0-or-later，完整授權在 `LICENSE`；本專案原創題目另以 CC0-1.0 提供。

字表來自 [Rime 倉頡](https://github.com/rime/rime-cangjie/tree/fcb3d7dd94ac1304663d575727d24d8107f6b082)，修訂 `fcb3d7dd94ac1304663d575727d24d8107f6b082`，版本 1.0。字表原始標頭註明 GPL，來源及作者說明保留於原始 YAML；上游根目錄授權原樣保留在 `public/data/LICENSE`。`metadata.json` 記錄 JSON 的 SHA-256。`scripts/build-dictionary.py` 可從固定修訂重建資料。

輸入事件設計參考 [W3C Input Events Level 2](https://www.w3.org/TR/input-events-2/) 及 [UI Events](https://www.w3.org/TR/uievents/)。實際瀏覽器可能有差異，故同時使用 composition 狀態、最後 DOM 讀取及去重，而非依賴單一事件順序。
