# StudyRecord

StudyRecord 是一個以 React 製作的響應式讀書紀錄工具。應用程式完全在瀏覽器中執行，資料儲存於目前瀏覽器的 `localStorage`，不需要登入、後端服務或環境變數。

## 功能

- 顯示今日、本月與累計讀書時數
- 最近 7 日讀書趨勢圖與各科目時數排名
- 碼錶與 25 分鐘番茄鐘
- 手動新增與刪除讀書紀錄
- 新增、編輯、刪除及釘選考試倒數
- 支援行動裝置版面與 `prefers-reduced-motion`
- 計時期間嘗試使用 Screen Wake Lock；番茄鐘結束時播放瀏覽器提示音

## 技術

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Recharts
- Lucide React

## 本機執行

需求：Node.js 與 npm。

```bash
npm install
npm run dev
```

開發伺服器預設位於 <http://localhost:3000>，並監聽區域網路介面。

## 可用指令

```bash
npm run dev      # 啟動開發伺服器
npm run lint     # 執行 TypeScript 型別檢查
npm run build    # 建立 production 版本至 dist/
npm run preview  # 預覽 production build
```

## 資料與瀏覽器支援

讀書紀錄與考試資料只存在目前瀏覽器，不會自動同步或備份。清除網站資料、使用無痕模式或更換瀏覽器後，資料可能無法保留。

Screen Wake Lock 與 Web Audio 的可用性取決於瀏覽器；不支援時仍可使用主要紀錄與倒數功能。

## 驗證

提交變更前執行：

```bash
npm run lint
npm run build
```
