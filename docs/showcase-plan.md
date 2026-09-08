# hudline 展示與用途描述

狀態：使用者已確認方案，已完成實作。此文件保留定位與展示決策。

## 已確認

- 第一受眾：Claude Code 使用者。
- 主訴求：額度掌握與 Token 使用狀況。
- 使用者選定的主句：「在 Claude Code 提示列下方，隨時看見 context 使用量與剩餘額度。」
- Token 使用狀況以副句補充。
- 主圖資訊深度：完整版，呈現 context、5 小時／每週剩餘額度、輸入／輸出 Token 累計、快取與 thinking 占比。
- 展示形式：一張完整版靜態主圖，加上欄位解說，讓讀者快速理解效果；本次不製作操作 GIF。
- 主圖資料來源：示範資料，由 hudline 實際渲染完整欄位，明確標示「示範數值」。保留輸入資料與產圖方式，以便重現及更新。

## 修改前的素材與缺口

- README 有預設狀態列的純文字範例，尚無實際呈現配色與模型底色的截圖。
- README 已解釋額度、context 與 Token 欄位，但開頭優先介紹 Format 與零依賴。
- 原有 default、limits、tokens 模板可作為展示起點；最終選用 default。
- README 的欄位表將 5 小時與每週額度標示為 Claude Pro/Max 功能；展示文案需說明適用條件。

## 已確認並實作的方案

- 延續 README 現有英文，開頭主句："See context usage and remaining quota beneath your Claude Code prompt."
- 副句："Track cumulative input and output tokens, with cache-read and thinking shares."
- 開頭排序：用途主副句、完整版主圖、示範資料與額度適用條件、兩組欄位解說、Quick start。客製化與跨 CLI 內容保留在後續章節。
- 主圖使用預設格式與預設 neon 主題的實際輸出，保留模型、effort、cost 等預設資訊；不額外模擬 Claude Code 工作階段。
- 額度組解說：CTX 是目前已用比例；5H／7D 是剩餘比例，方向不同。
- Token 組解說：SENT／OUT 是整段對話累計；CR 是輸入中的快取讀取占比；TH 是輸出中的 thinking 占比。Context 佔用與 Token 累計不可混淆。
- 同步 package.json 的 description，讓 npm 搜尋描述反映同一用途。
- 本次交付：README 開頭修改、package description、一張靜態圖、示範資料與可重現產圖方式。保留現有功能與預設格式。

沿用 CONTEXT.md 的既有術語：Context 佔用與跨對話回合累計的 Token flow 是不同指標；快取屬於 Input 的拆分，thinking 屬於 Output 的拆分，不能重複加總。

## 交付與驗證

- `README.md`：用途主副句、主圖、兩組欄位解說、快速安裝指引，並同步詳細欄位表的示範數值。
- `package.json`：同步 npm description。
- `docs/showcase/`：PNG、固定 payload 與 transcript、產圖腳本及重製說明。
- 主圖依 84 欄終端換行呈現，額度與 Token 資訊分別位於兩行；重設時間固定為 UTC。
- 既有 86 項測試全數通過；連續產圖兩次的 SHA-256 相同；已檢視圖片確認配色、文字與換行。
