# Chess AI Game

一個在瀏覽器中執行的單人西洋棋練習網站。玩家執白棋，和本機 AI 對弈。

## 功能

- 可選 21 個 **Estimated Elo** 強度：200、300、…、2200。
- 分數是產品難度估計，不是 Chess.org 官方評分，也不保證等同於人類 Elo。
- `chess.js` 驗證所有玩家與 AI 走法，以及標準終局狀態。
- 200–1200 使用弱化的合法走法 AI；1300–2200 使用瀏覽器 Web Worker 內的 Stockfish。
- AI 思考時鎖定棋盤，防止重複走棋。

## 必要條件

- Node.js 20 或更新版本
- npm 10 或更新版本

## 執行專案

在專案根目錄執行：

```bash
npm install
npm run dev
```

終端機會顯示本機網址，通常是 `http://localhost:5173`。使用瀏覽器開啟該網址即可開始遊戲。

若要讓同一個網路中的其他裝置存取：

```bash
npm run dev -- --host 0.0.0.0
```

## 驗證與建置

```bash
# 單元與元件測試
npm run test

# 瀏覽器端對端測試
npm run test:e2e

# TypeScript 檢查與正式版建置
npm run build
```

端對端測試首次執行若缺少 Chromium，請先安裝：

```bash
npx playwright install chromium
```

## 專案結構

- `src/domain/`：棋局規則與 Estimated Elo 強度目錄。
- `src/ai/`：弱化 AI 與 Stockfish Worker 的 UCI 介接。
- `src/components/`：新遊戲選擇與棋盤 UI。
- `e2e/`：Playwright 使用者流程測試。
- `docs/bdd/`：已核准的 BDD 規格與 Mermaid 邏輯圖。

## Stockfish 授權

本專案隨附的 Stockfish WebAssembly 檔案採 GPL-3.0。發布前請閱讀 [NOTICE](NOTICE) 與 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)，並確認對應源碼提供方式符合你的發布情境。
