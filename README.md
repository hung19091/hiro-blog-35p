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
2. 啟用 **Firestore Database**（建議選擇就近地區如 `asia-east1`），並建立初始空白資料庫。
3. 啟用 **Authentication**，選擇 **Email/Password** 提供者，並手動建立一組管理者帳號（例如 `admin@example.com` 與密碼）。
4. 在專案設定中複製您的 **Firebase SDK 配置物件 (firebaseConfig)**。

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

### 步驟三：安裝 Firebase CLI 並部署
於終端機安裝 Firebase Tools：
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy
```
部署完成後，即可透過 Firebase 提供的 Hosting 網址造訪前台部落格與後台 (`/admin.html`)！