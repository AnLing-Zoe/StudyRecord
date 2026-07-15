# StudyRecord

StudyRecord 是一個以 React 製作的響應式讀書紀錄工具。資料透過 Google Apps Script 儲存在同一份 Google 試算表的三張工作表中，統計與倒數結果由前端即時計算。

## Google Sheets 資料表

Apps Script 的 `setup()` 會自動建立：

- `讀書紀錄`：發生日期、讀書總時長(分鐘)、讀書科目、讀書備註
- `讀書科目`：讀書科目
- `考程`：考試名稱、考試日期、是否釘選

今日、本月、累計時數、最近 7 日趨勢、科目分佈及考試倒數不寫入試算表。

## 設定 Google Apps Script

1. 建立或開啟一份 Google 試算表。
2. 選擇「擴充功能 → Apps Script」。
3. 將 [`backend/Code.gs`](backend/Code.gs) 貼入編輯器。
4. 在 Apps Script 中執行一次 `setup()` 並完成授權。
5. 選擇「部署 → 新增部署作業 → 網頁應用程式」。
6. 執行身分選擇自己；存取權依部署需求設定，完成後複製 `/exec` 網址。
7. 在專案建立 `.env.local`：

```env
VITE_GOOGLE_APP_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

修改 Apps Script 後，需要建立新版本並重新部署。

> 若將網頁應用程式設為「任何人」可存取，知道部署網址的人便能讀寫資料；此版本沒有使用者登入或權限分流。

## 功能

- 顯示今日、本月與累計讀書時數
- 最近 7 日讀書趨勢圖與各科目時數排名
- 碼錶、25 分鐘番茄鐘與手動紀錄
- 新增、刪除讀書科目
- 新增、編輯、刪除及釘選考程
- 支援行動裝置版面與 `prefers-reduced-motion`

## 本機執行

需求：Node.js 與 npm。

```bash
npm install
npm run dev
```

開發伺服器預設位於 <http://localhost:3000>。

## 驗證與建置

```bash
npm test
npm run lint
npm run build
npm run preview
```

Screen Wake Lock 與 Web Audio 的可用性取決於瀏覽器；不支援時仍可使用主要功能。
