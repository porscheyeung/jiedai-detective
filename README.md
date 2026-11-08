# 借代小偵探

香港小五中文科「借代」互動教學網頁 V1。學生跟偵探小探按三步思考：**用了甚麼詞 → 真正指誰 → 為甚麼可以代替**。

公開網站：https://porscheyeung.github.io/jiedai-detective/

## 內容
1. 神秘廣播：白袍情境＋放大鏡揭示（觸控、滑鼠、鍵盤及「一次看清楚」按鈕）
2. 拆開借代：三步拆解「藍衣們」、普通／借代寫法比較、四張關係卡
3. 線索配對站：6 案 × 2 計分題（找詞及對象、說關係）
4. 真假借代：8 句分辨借代、比喻、普通描述，並選理由
5. 小偵探辦案：3 篇原創短文、4 個借代，須點出證據句
6. 我的借代句：引導改寫、三個場景自由創作、四項自我檢查、偵探筆記本（不自動評分）

另有偵探報告（首次答對／訂正後完成分開顯示）、徽章及等級、老師模式（討論提示、逐步揭曉）、大字投影、減少動畫、聲效開關、可列印工作紙及答案頁、教師使用說明。

## 技術
純前端 ES modules（index.html、style.css、data.js、app.js、fx.js），無 CDN、無登入；進度只存本機 localStorage（`jiedai-detective-v1`）。GitHub `porscheyeung/jiedai-detective`，main 根目錄 Pages。

## 測試
`node --test tests/*.test.mjs`；`tests/browser-check.mjs` 用 playwright-core，先在專案目錄開 `python3 -m http.server 8124`，設定 `PW_DIR`、`CHROME`（可選 `SHOTS`）。結果見 docs/TEST-RESULTS.md。
