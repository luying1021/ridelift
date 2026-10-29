# RIDELIFT v2｜Firebase 雲端同步版（已填入 Firebase 專案設定）

## ✅ 此版本已經設定你的 Firebase Web App

已在 `firebase-config.js` 填好：`projectId = ridelift-29d45`；不用再手動貼你提供的 `initializeApp()` 與 `getAnalytics()` 範例。此網站使用 Firebase 官方 CDN ES modules，毋須 npm 或打包工具。**Google Authentication 與 Cloud Firestore 仍須在 Firebase Console 啟用**，而且真正的跨裝置同步要等你部署後用兩台裝置測試。

### 現在先做以下設定

1. Firebase Console → 專案 `RIDELIFT` → **Authentication**（可能在「安全性」分類）→ **開始使用 / Sign-in method** → **Google** → 啟用、選擇支援信箱、儲存。
2. **Authentication → Settings → Authorized domains** 新增 `你的 GitHub 使用者名稱.github.io`；**不要**輸入 `https://` 或 repository 路徑。
3. **Firestore Database**（可能在「資料庫和儲存空間」）→ **Create database** → 選擇離使用者近的區域 → 建立資料庫。**請勿使用公開讀寫的測試規則。**
4. **Firestore Database → Rules** → 將壓縮包內 `firestore.rules` 全部貼上並 **Publish**。此專案若也有其他應用程式，應先合併規則而非覆蓋。
5. 解壓縮後上傳檔案到 GitHub repo 的根目錄。開啟 **Settings → Pages** 以 `main /(root)` 發佈。上傳時一定要包含 `firebase-config.js`、`firebase-sync.js`、`firestore.rules`（Rules 檔只是部署參考，實際 Rules 要在 Firebase Console 發佈）。
6. 打開 GitHub Pages 網址 → 「目標與備份」→ **使用 Google 登入並同步**。在另一台裝置用相同 Google 帳號登入檢查紀錄。現有本機資料先匯出 JSON 再按「合併舊本機紀錄至雲端」。

**注意**：Firebase `apiKey` 和 `firebaseConfig` 是公開專案識別資料，並非服務帳號私鑰；個人紀錄的保護依靠 Authentication、Firestore Rules。需要的話，請在 Google Cloud Console 將此金鑰限制在適用的 Firebase API。使用公共電腦時不建議儲存這類私人紀錄，因為本機離線快取可能留在瀏覽器中。

---


這是你原本 RIDELIFT 81 → 75 kg 的升級版：**GitHub Pages 免費放網頁、Google 帳號登入、Firebase Cloud Firestore 在手機與電腦間同步紀錄**。

已保留原版全部功能（體重、每日營養、肌酸／補給打勾、每週三次騎車、PR 比較、圖表、JSON／CSV 匯出、PWA），並新增 **Google 登入、即時同步、舊本機資料合併**。不需要 Node.js、npm、CLI、後端伺服器。

## A. 建立／設定 Firebase 專案

1. 開啟 https://console.firebase.google.com/ ，建議為 RIDELIFT **另外建立一個 Firebase 專案**，避免不小心改到之前營隊的 Firestore Rules。如果真的沿用舊專案，務必**合併規則**，不要覆蓋其他 App 的規則。
2. 進入 **Authentication → Sign-in method**，啟用 **Google** 登入供應商，完成專案所需的支援信箱等設定。
3. 進入 **Authentication → Settings → Authorized domains**，新增你的 GitHub Pages **主機名稱**：例如 `yourname.github.io`（不要寫 `https://`，也不要包含 `/ridelift/` 路徑）。若使用自訂網域，請另外加入。
4. 進入 **Firestore Database → Create database**，選擇地區並建立資料庫。請勿使用完全開放的測試規則作為正式設定。
5. 在 Firestore Database → **Rules** 貼上本資料夾 `firestore.rules` 的內容並點擊 **Publish**。**若是共用舊 Firebase 專案，請把 RIDELIFT 的 `match /users/{userId}/...` 區塊加進原有規則中，不要覆蓋整份。**

### 必要安全規則

這份網頁將每日紀錄放在 `users/{uid}/entries/{yyyy-mm-dd}`、個人設定放在 `users/{uid}/profile/settings`。`firestore.rules` 確保每個登入者只能讀寫自己的 `uid` 路徑。

**Firebase Web 設定（`firebaseConfig`）是公開設定識別資訊，不是密碼。真正保護私人資料的是 Authentication + Firestore Rules。** 絕對不要把 `serviceAccount` JSON、Admin SDK 私鑰或其他秘密上傳至公開 GitHub。

## B. Firebase 網頁設定（這份壓縮包已經完成，通常可跳過）

**已套用你的 `ridelift-29d45` 設定。** 以下步驟僅供日後更換 Firebase 專案時參考。

1. Firebase Console → 齒輪 → **Project settings**（專案設定）→ **Your apps**。
2. 新增 **Web app**（`</>`），應用名稱例如 `RIDELIFT`，不需要勾選 Firebase Hosting（網頁將由 GitHub Pages 提供）。
3. Firebase 顯示 `firebaseConfig`，例如：

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  appId: "1:123456:web:abcdef",
  messagingSenderId: "123456"
};
```

4. 若日後更換 Firebase 專案，才需要修改 **`firebase-config.js`**，保留 `export default { ... }` 結構。不需要把 `<script>` 標籤或 `initializeApp()` 貼進去。
5. 尚未填設定時，RIDELIFT **仍可使用本機模式**，但不會自動同步。

## C. 放到 GitHub Pages

1. GitHub 建立 Repository，例如 `ridelift`。
2. 把本 ZIP **解壓縮後的檔案全部上傳至 Repository 根目錄**（`index.html`、`firebase-config.js`、`firebase-sync.js`、`firestore.rules` 等）。不要只上傳 ZIP。
3. **Settings → Pages → Deploy from a branch → main → /(root)**，儲存。
4. 使用 `https://你的帳號.github.io/ridelift/` 打開網頁。
5. 點右上角「◯ 本機紀錄」或到「目標與備份」→「使用 Google 登入並同步」，選擇 Google 帳號。
6. **換裝置時使用同一 Google 帳號登入**，等雲端紀錄載入，即能看到相同的資料。

## D. 舊版紀錄搬移：不會自動覆寫

原本 RIDELIFT v1 的資料在 `localStorage`；這個新版仍沿用同一組本機儲存 Key，以免刪掉舊資料。

1. **請先在舊裝置／舊網頁匯出 JSON 備份**，另存至私人位置（例如 iCloud Drive）。
2. 將同一個 GitHub Pages 網址更新成新版，並使用 Google 登入。
3. 進入「目標與備份」→「☁ Firebase 雲端同步」→ **「合併舊本機紀錄至雲端」**。
4. 如果雲端已經有同一天的紀錄，**保留雲端紀錄**；只新增雲端不存在的日期。新帳號第一次合併時，也會寫入舊版個人設定。
5. 如果你以前在 Safari、加入主畫面的 PWA、電腦瀏覽器各有不同的本機紀錄，請在**每一個原本存有資料的瀏覽器**登入並各自合併。因為它們的本機儲存可能不同。
6. 上傳後可在另一裝置用同 Google 帳號確認資料。**本機舊資料不會被刪除**。

## E. 日常使用與離線提醒

- 登入後，填數字或打勾，網頁先反映變更，再寫進 Firestore；同帳號不同裝置可收到即時更新。
- 網頁使用 Firestore 的持久離線快取。已登入且裝置支援時，離線編輯會先寫入瀏覽器，恢復網路後由 SDK 嘗試同步。**未收到伺服器確認前不等於資料已上雲**。
- 離線快取保存在瀏覽器，建議只在你自己的手機／電腦使用；**共用電腦請不要開啟私人紀錄**。
- 如果同一時間在兩台裝置編輯**同一天**，Firestore 可能採最後一次寫入為準，請避免同時編輯同一天。
- 登出後會顯示原本的本機模式資料；雲端資料仍在登入的 Google 帳號中。私人資料請務必定期匯出 JSON；不要放在公開 GitHub Repository。
- 行動版 iPhone Safari 建議從 Safari 正常網址開啟登入；若 Google 彈窗遭封鎖，請允許彈窗，避免從 IG／LINE 內嵌瀏覽器登入。
- 網頁依賴 Firebase 官方 CDN（目前版本固定 13.1.0），首次開啟需要網路。

## F. 常見問題

- **顯示「尚未設定 Firebase」**：檢查 `firebase-config.js` 的 `apiKey`、`authDomain`、`projectId`、`appId` 都已填入且已重新上傳 GitHub。
- **`auth/unauthorized-domain`**：Firebase Authentication → Settings → Authorized domains 加上 `你的帳號.github.io`。
- **`permission-denied`**：Firestore 規則未 Publish、路徑不對、登入錯帳號，或 Firestore 尚未建立。
- **Google 登入沒反應**：用 Safari／Chrome 開啟正式 HTTPS 網址、允許彈出視窗。GitHub Pages 搭配 redirect 登入在部分瀏覽器有跨網域儲存限制，因此此版使用 popup。
- **沒有看到舊紀錄**：舊資料在原本的瀏覽器。請在那台裝置登入並按「合併舊本機紀錄」；或先使用 JSON 備份／匯入功能（匯入會覆蓋目前檢視的紀錄，操作前先備份）。
- **同步狀態顯示已登入**：不代表最近一筆一定已由伺服器確認；離線與網路不穩定時需檢查另一台裝置是否也看得到，且保留 JSON 備份。

## 你的既有起始計畫

| 項目 | 騎車日 | 休息日 |
|---|---:|---:|
| 熱量 | 2,500 kcal | 1,950 kcal |
| 蛋白質 | 165 g | 165 g |
| 碳水 | 315 g | 180 g |
| 脂肪 | 65 g | 63 g |
| 肌酸 | 3–5 g | 3–5 g |

183 cm、81 kg、目標 75 kg、久坐辦公室、每週三次約 31 km／403 m 爬坡騎乘。這些是初始飲食目標，請依連續 2–3 週體重趨勢與騎車表現調整。

> 本版本已完成程式整合及本機功能測試；在你填入真實 Firebase config 並發布 Rules 前，尚不能替你驗證真實專案上的 Google 登入／Firestore 寫入。
