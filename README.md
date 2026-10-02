# 樂購商品報價工具

手機優先的 React + TypeScript + Vite 純前端報價工具／PWA。無登入、後端、資料庫或付費 API，計算與商品紀錄均留在使用者瀏覽器。

## 本機啟動

需要 Node.js 22.12+（建議 Node 24 LTS）與 npm。

```bash
npm install
npm run dev
```

正式版與檢查：

```bash
npm test                 # Vitest：公式、CSV、儲存與 UI
npm run lint
npm run build           # TypeScript + Vite + PWA 靜態檔案 → dist/
npm run preview         # 在本機驗證正式版
npx playwright install chromium
npm run test:e2e         # 桌面／手機完整流程與離線 PWA；先執行 build
```

若已有 Chromium，可略過下載：`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`。
`.npmrc` 使用專案內被忽略的 `.npm-cache`，避免雲端唯讀家目錄影響 npm。重建環境使用 `npm ci`。

## 檔案結構

```text
src/
  App.tsx                       頁面、記錄／編輯與狀態管理
  form.ts                       表單型別與初始化
  pricing.ts                    報價公式、目標淨利率預設值
  feeTable.ts                   材積 × 採購價查表、渠道優惠與版本
  data/fee-rates.json            52 × 16 × 2 原始費率數值
  storage.ts                    localStorage 記錄、版本與資料驗證
  csv.ts                        公司 I:S／完整 CSV 匯出
  components/
    QuoteForm.tsx               商品輸入與試算表補充欄位
    PlatformFees.tsx            樂購平台收費區塊
    CalculationSummary.tsx      最高進價、淨利、提交判定
    ProductHistory.tsx          商品清單、搜尋、刪除與匯出
  *.test.ts(x)                  單元／元件測試
public/                         PWA 圖示（SVG、192px、512px）
tests/quote.spec.ts              Playwright 桌面／手機驗收
vite.config.ts                  相對部署路徑、PWA manifest／service worker
.github/workflows/              CI 與手動 GitHub Pages 部署
```

## 計算與目標淨利率

`src/pricing.ts` 是唯一公式來源。預設 `DEFAULT_TARGET_MARGIN = 0.10`，使用者可在畫面設定 0% 至小於 100% 的目標。每筆紀錄保存當次 `input.targetMargin`，編輯時帶回原值。記錄後清空商品輸入，保留使用者的目標設定以方便連續作業。

- 材積 = 長 × 寬 × 高，單位 cm³。
- `G = floor(市售價 × 0.85)`。
- 所得稅 = `G × 0.02`；營業稅 = `(G − 廠商報價) × 0.05`。
- 銷售獎勵金 = `G × 0.03`；活動贊助費 = `G × 0.015`。
- `payout = G − handling − logistics − G × 0.03 − G × 0.015`。
- `maxVendorCost = (payout × (1 − targetMargin) − G × (0.02 + 0.05)) / (1 − 0.05)`。
- `profit = payout − vendorPrice − G × 0.02 − (G − vendorPrice) × 0.05`。
- `profitMargin = profit / payout`，與當次目標比較。
- 樂購毛利率採 `(市售價 − G) / 市售價`。

金額顯示 2 位小數，計算保留原始精度；臨界值以微小浮點容差比較。顯示四捨五入後的最高進價不是保證通過的整數／分幣報價，請以實際報價的狀態為準。撥款為 0 或負值時不可提交，避免除以零。營業稅沿用指定公式，不自行將負數截為 0。

## 費率表

費率來自使用者提供的 `費率.xlsx`：`寄倉處理費!D4:S55` 與 `物流運送費!F4:U55`。共 **52 個材積級距 × 16 個價值級距 × 2 項費用**，存放於 `src/data/fee-rates.json`，查價與優惠規則在 `src/feeTable.ts`。來源查價表標示 2026-07-24 / v1.0，網站版本為 `2026-07-24-v1.0-r1`。

- 商品價值採 **樂購採購價 G = floor(市售價 × 0.85)**（使用者確認）。
- 級距沿用試算表數字下界作近似查找。例如 100.5 cm³ 仍在下界 0 的級距，101 cm³ 才進入下一級，不另行對材積取整。
- **50,000 cm³ 邊界例外**：原表查找鍵是 50000，文字卻寫 `>50000`。依使用者確認，剛好 50000 屬前一級，只有大於 50000 才用最後一級。
- 原始獨立費率表包含下界 20001、22001 兩級；合併「查價對照表」漏列這兩級。網站保留完整原始 52 級，不沿用漏列。
- 預設「一般渠道」：兩項費用使用原價。選「優惠渠道（無外箱環境友善／宅配隔日到貨）」才套用表內自 2026-01-01 生效的優惠：G ≤ 25 元為 50%，26–50 元為 75%，51 元起原價。兩項各套一次，不把已折扣的查價表再次打折。
- 表內沒有額外加稅、按箱、重量或費用進位規則，因此不另加。保留三位以上費用精度參與計算，例如物流 3.7 × 75% = 2.775，畫面顯示 2.78。

可選「手動輸入／試算」，兩項費用需完整填寫（0 需明確輸入）。紀錄保存當次費用、渠道、查價金額、倍率、版本和結果快照；舊紀錄不因更新費率自動變更。編輯表格費率紀錄時按目前表格重算，手動紀錄仍帶回原費用。舊版手動／待補費率紀錄仍可讀取。

匯入工具（僅維護費率時需要 Python + openpyxl；網站本身只需 Node）：

```bash
python3 scripts/import_fee_table.py /path/to/費率.xlsx
npm test
npm run build
```

工具只擷取兩張費率矩陣，並與「查價對照表」可對照的 **1,600 個折扣費率**核對。原始 Excel、訂單、廠商資料與交易紀錄不納入網站或 Git。網站完全使用靜態資料，無需連線 Google Sheets。

## 商品清單與 CSV

支援記錄後清空、重新整理保存、搜尋、編輯、單筆刪除確認、清空全部二次確認。資料在 `localStorage` 的 `legou.products.v1`。瀏覽器／裝置間不共享；清除網站資料會刪除紀錄，請定期匯出。儲存失敗不會清空輸入；損壞紀錄不會被自動覆寫，可下載原始備份再重設。

I:S CSV 嚴格輸出 11 欄（UTF-8 BOM、逗號分隔、雙引號跳脫）：

`品名｜長｜寬｜高｜材積(cm³)｜成本｜稅後進價｜check Fixed｜市價｜市價毛利｜實際售價`

I:S 預設**不含標題**，也可勾選標題。先將 CSV 匯入試算表，再把 11 欄複製到既有工作表 I:S；不要把未解析的 CSV 原文當作 Tab 分隔文字貼上。匯出目前搜尋結果；清空搜尋即匯出全部。完整 CSV 另外包含廠商報價、當次目標、費用來源、淨利、狀態、建立時間、運送渠道、查價金額與費率倍率。文字欄位若以公式符號起始會加上單引號，避免試算表公式注入。

因公司補充欄位尚未提供完整公式，採用可見、可編輯的對應：

| 欄位        | 初始對應                       |
| ----------- | ------------------------------ |
| 成本        | 廠商實際報價，可覆寫           |
| 稅後進價    | 留空，可手動填寫，不猜稅額定義 |
| check Fixed | 留空，可手動填寫               |
| 市價        | 商品市售價                     |
| 市價毛利    | 樂購毛利率，可覆寫             |
| 實際售價    | 樂購採購價，可覆寫             |

這些補充欄位只影響商品清單與匯出，不改變報價公式。編輯時保留已存補充值，若欲重新套用預設請清空該欄。

## 部署

所有平台使用 Node 24、安裝命令 `npm ci`、建置命令 `npm run build`、輸出目錄 `dist`。沒有環境變數或 API Key。`base: './'` 支援根目錄與 GitHub Pages 專案子路徑，頁面切換不需要伺服器 rewrite。

### GitHub Pages

1. 推送到 GitHub 的 `main`。
2. Repository Settings → Pages → Source 選 **GitHub Actions**。
3. 推送 `main` 會自動部署；也可在 Actions → **Deploy GitHub Pages** → **Run workflow** 選 `main` 手動重跑。
4. 使用部署工作產生的 Pages 網址；往後推送 `main` 即會更新。

已啟用 `main` 推送自動部署。首次須在 Repository Settings → Pages 設定 GitHub Actions，否則部署工作無法建立網站。另一個 Checks 工作會在 push／PR 跑 lint、單元測試、建置與 Playwright。

### Vercel / Cloudflare Pages

匯入此 GitHub repository，選 Vite（或手動填入上述建置命令及 `dist`），選 Node 24 並部署。不需要 Functions、Worker、資料庫或任何付費服務。Cloudflare 請選 **Pages** 靜態網站流程。

### PWA

正式版透過 HTTPS 提供安裝與離線功能；開發版不註冊 service worker。首次在線載入並完成快取後，可離線開啟與試算。圖示與程式碼都在站內，無外部字型／API 依賴。新版 service worker 等舊分頁關閉後才接管，避免輸入途中強制重新載入。

## 驗收測試涵蓋

- 可調目標（0%、10%、20%、35%、99%）、精確邊界與未達標判定。
- 稅額、平台費用、無條件捨去、回推進價與缺失／無效費率。
- localStorage 往返、損壞資料、儲存失敗保留表單。
- 11 欄 CSV、空白補充欄位、文字跳脫與公式注入防護。
- 桌面與手機填寫、記錄、重新整理、編輯、搜尋、下載、刪除與離線啟動。
