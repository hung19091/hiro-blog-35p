# DevLog - 現代化無伺服器技術部落格 (Firebase Hosting & Firestore)

這是一套完整、無需 Node.js 後端伺服器、純前端（HTML + Tailwind CSS + JavaScript）搭配 Firebase Hosting、Firestore 與 Authentication 的高質感技術部落格網站。

## 🚀 專案檔案清單與擺放結構

請在電腦建立專案根資料夾（例如 `my-tech-blog`），並將所有檔案依照以下結構擺放：

```text
my-tech-blog/
├── firebase.json
├── firestore.rules
├── index.html
├── article.html
├── admin.html
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js
    ├── blog.js
    ├── article.js
    └── admin.js
```

## 🛠️ 部署步驟 (Deployment Guide)

### 步驟一：準備 Firebase 專案
1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立一個新專案。
2. 啟用 **Authentication**，選擇 **Email/Password** 登入方式，並建立至少一個測試帳號。
3. 啟用 **Firestore Database**，建議選擇 `asia-east1` 或鄰近區域，並建立空白資料庫。
4. 啟用 **Storage**，因為文章編輯器會直接上傳圖片到 `articles/` 路徑。
5. 在 Firebase Console 中，找到你要當管理者的使用者 UID，並在 Firestore 建立 `admins/{uid}` 文件；這是目前專案採用的白名單機制。
6. 在專案設定中複製您的 **Firebase SDK 配置物件 (firebaseConfig)**。

> 目前已不建議用「前端依賴 email 判斷 admin」的方式，這會造成安全風險。正確方式是：以登入使用者的 UID 為白名單依據，並在 `admins/{uid}` 中確認是否存在。

### 步驟二：填入設定檔
打開 `js/firebase-config.js`，將您的 Firebase 專案設定填入：
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 步驟三：設定 Firestore 與 Storage 規則
這個專案的安全規則分成兩種：

- `firestore.rules`：保護 Firestore 資料
- Firebase Console → Storage → Rules：保護圖片上傳

常見錯誤是把 Storage 規則放錯地方；實際上 Storage 需另設定，不能寫在 `firestore.rules` 中。

一個可用的 Storage 範例：
```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /articles/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 步驟四：安裝 Firebase CLI 並部署
於終端機安裝 Firebase Tools：
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```
部署完成後，即可透過 Firebase 提供的 Hosting 網址造訪前台部落格與後台 (`/admin.html`)。