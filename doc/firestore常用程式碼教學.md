# Firestore 常用程式碼教學

這份文件整理常見的 Firestore JavaScript 使用方式，適合這個專案的 `articles`、`comments`、`admins` 等集合。內容包含：

- 初始化 Firestore
- 讀取一筆資料 / 多筆資料
- 新增資料
- 更新資料
- 刪除資料
- 條件查詢
- 排序
- 監聽即時更新
- 權限與安全設計
- 專案實際範例

---

## 1. Firestore 初始化

在這個專案中，初始化通常寫在 `js/firebase-config.js`，並匯出 `db` 物件：

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

在其他檔案中直接匯入：

```js
import { db } from './firebase-config.js';
```

---

## 2. 讀取一筆資料：`getDoc()`

如果你知道文件 ID，可以直接抓單一文件。

```js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const articleRef = doc(db, 'articles', 'abc123');
const docSnap = await getDoc(articleRef);

if (docSnap.exists()) {
  console.log('文章資料：', docSnap.data());
} else {
  console.log('查無資料');
}
```

### 這段的意義

- `doc(db, 'articles', 'abc123')`：指定 `articles` 集合中 ID 為 `abc123` 的文件
- `getDoc()`：取得該文件內容
- `docSnap.exists()`：確認這筆資料是否真的存在

### 這個專案的實際用途

例如：

```js
const adminDoc = await getDoc(doc(db, 'admins', user.uid));
const isAdminUser = adminDoc.exists();
```

這就是判斷某個使用者是否在管理者白名單中。

---

## 3. 讀取多筆資料：`getDocs()`

如果想拿到某個集合全部文件，使用 `getDocs()`。

```js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const querySnapshot = await getDocs(collection(db, 'articles'));

querySnapshot.forEach((docSnap) => {
  console.log(docSnap.id, docSnap.data());
});
```

### 結果格式

`querySnapshot` 會是一個陣列型資料結構，你可以用 `forEach` 逐筆處理：

```js
const articles = [];
querySnapshot.forEach((docSnap) => {
  articles.push({ id: docSnap.id, ...docSnap.data() });
});
```

這是專案中最常見的寫法，例如 `fetchAdminArticles()` 會這樣做。

---

## 4. 新增資料：`addDoc()`

新增文件到集合裡，Firestore 會自動產生一個 document ID。

```js
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const articleData = {
  title: 'Firebase 教學',
  slug: 'firebase-tutorial',
  summary: '這是一篇 Firebase 基礎教學',
  tags: ['Firebase', 'JavaScript'],
  content: '# Firebase 教學\n\n歡迎閱讀',
  published: false,
  authorUid: 'USER_UID',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

const result = await addDoc(collection(db, 'articles'), articleData);
console.log('新增成功，ID:', result.id);
```

### 這個專案中的實際對應

你現在的程式在新增文章時是：

```js
articleData.createdAt = serverTimestamp();
await addDoc(collection(db, 'articles'), articleData);
```

也就是：

- `articles` 集合儲存文章
- 文章資料中包含 `title`、`slug`、`summary`、`tags`、`content`
- `authorUid` 紀錄作者
- `createdAt` 與 `updatedAt` 用伺服器時間，避免前端時間被偽造

---

## 5. 更新資料：`updateDoc()`

如果已知文件 ID，可以更新某些欄位。

```js
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

await updateDoc(doc(db, 'articles', 'abc123'), {
  title: '更新後標題',
  updatedAt: serverTimestamp()
});
```

### 只更新某個欄位

```js
await updateDoc(doc(db, 'articles', 'abc123'), {
  published: true,
  updatedAt: serverTimestamp()
});
```

### 這個專案中很常見的寫法

例如：

```js
await updateDoc(doc(db, 'articles', id), {
  published: publishedState,
  updatedAt: serverTimestamp()
});
```

這就是「發佈／下架」的核心實作。

---

## 6. 刪除資料：`deleteDoc()`

刪除一筆文件：

```js
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

await deleteDoc(doc(db, 'articles', 'abc123'));
```

### 常用場景

- 刪除文章
- 刪除留言
- 清除草稿或錯誤資料

這個專案中，文章與留言刪除都是用：

```js
await deleteDoc(doc(db, 'articles', id));
await deleteDoc(doc(db, 'comments', id));
```

---

## 7. 條件查詢：`where()`

一般查詢可以依條件篩選資料。

```js
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const q = query(
  collection(db, 'articles'),
  where('published', '==', true)
);

const snapshot = await getDocs(q);

snapshot.forEach((docSnap) => {
  console.log(docSnap.data());
});
```

### 這個專案的應用

#### 1. 只查公開文章

```js
const q = query(collection(db, 'articles'), where('published', '==', true));
```

#### 2. 查某使用者自己的文章

```js
const q = query(
  collection(db, 'articles'),
  where('authorUid', '==', user.uid)
);
```

這也是目前專案中最重要的條件查詢之一，因為它能讓非 admin 使用者看到自己的文章，而不是所有文章。

---

## 8. 排序：`orderBy()`

如果你想按照時間排序：

```js
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const q = query(
  collection(db, 'articles'),
  orderBy('createdAt', 'desc')
);

const snapshot = await getDocs(q);
```

### 這個專案的用途

文章列表通常要顯示最新文章優先：

```js
articlesCache.sort((a, b) => {
  const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
  const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
  return timeB - timeA;
});
```

或者使用 Firestore 查詢：

```js
const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
```

---

## 9. 監聽即時更新：`onSnapshot()`

如果想讓資料在變動時即時更新畫面，可以使用 `onSnapshot()`。

```js
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const unsubscribe = onSnapshot(collection(db, 'articles'), (snapshot) => {
  snapshot.forEach((docSnap) => {
    console.log(docSnap.id, docSnap.data());
  });
});
```

### 適合場景

- 即時留言列表
- 即時文章列表
- dashboard 顯示正在更新的資料

### 注意

`onSnapshot()` 會一直監聽，若不需要時要取消：

```js
unsubscribe();
```

---

## 10. 伺服器時間：`serverTimestamp()`

這是 Firestore 最常用的時間欄位技巧。

```js
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

await updateDoc(doc(db, 'articles', 'abc123'), {
  updatedAt: serverTimestamp()
});
```

### 優點

- 不依賴使用者電腦時間
- 不容易被偽造
- 常用在文章創建、留言時間、更新時間

這個專案中幾乎所有時間欄位都使用 `serverTimestamp()`。

---

## 11. 查詢目前登入者的文章

這是你現在最關鍵的使用場景：

```js
const q = query(
  collection(db, 'articles'),
  where('authorUid', '==', auth.currentUser.uid)
);

const snapshot = await getDocs(q);
```

### 這種寫法的好處

- 每個使用者看到的是自己文章
- 不需要讀取整個 `articles` 集合
- 更符合 Firestore 安全規則設計

這和你的 `fetchAdminArticles(true)` 很接近：

```js
if (forceUserScope) {
  articleQuery = query(articleQuery, where('authorUid', '==', auth.currentUser?.uid ?? ''));
}
```

---

## 12. 檢查是否為管理者：`getDoc()` + `admins/{uid}`

安全邏輯常見做法：

```js
const adminDoc = await getDoc(doc(db, 'admins', user.uid));
const isAdmin = adminDoc.exists();
```

### 為什麼這樣做

因為前端不能當作安全邊界，真正的權限判斷仍然要在 Firestore rules 裡做：

```firestore
function isAdmin() {
  return isSignedIn() &&
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

前端只是判斷「目前這個人是不是 admin」，並決定要不要顯示後台內容。

---

## 13. Firestore 常見錯誤與注意事項

### 1. 讀取前沒有登入

某些資料需要 `request.auth != null` 才可讀寫，否則會被規則擋下。

### 2. 沒有 `authorUid`

如果文章沒有 `authorUid`，你就不能用：

```js
where('authorUid', '==', user.uid)
```

去篩選自己的文章。

### 3. 讀取整個集合過多

不要一開始就：

```js
getDocs(collection(db, 'articles'))
```

當資料量大時，這會比較慢且不精準。通常應該加條件：

```js
where('published', '==', true)
```

### 4. Firestore 規則不等於前端條件

前端判斷只能影響 UI，不代表真的有權限。真正規則仍然在 `firestore.rules`。

---

## 14. 這個專案中的常用 Firestore 範例總結

### 文章列表讀取：

```js
async function fetchAdminArticles(forceUserScope = false) {
  const tbody = document.getElementById('admin-articles-list');

  try {
    let articleQuery = collection(db, 'articles');

    if (forceUserScope) {
      articleQuery = query(articleQuery, where('authorUid', '==', auth.currentUser?.uid ?? ''));
    }

    const querySnapshot = await getDocs(articleQuery);
    const articles = [];

    querySnapshot.forEach((docSnap) => {
      articles.push({ id: docSnap.id, ...docSnap.data() });
    });

    console.log(articles);
  } catch (error) {
    console.error(error);
  }
}
```

### 新增文章：

```js
const articleData = {
  title: '新文章',
  slug: 'new-article',
  summary: '摘要',
  tags: ['Firebase'],
  content: '文章內容',
  published: false,
  authorUid: auth.currentUser?.uid ?? null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};

await addDoc(collection(db, 'articles'), articleData);
```

### 更新文章發佈狀態：

```js
await updateDoc(doc(db, 'articles', id), {
  published: true,
  updatedAt: serverTimestamp()
});
```

### 讀取管理者白名單：

```js
const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
if (adminDoc.exists()) {
  console.log('是管理者');
}
```

---

## 15. 一句話總結

Firestore 的核心就是：

- `collection()`：選擇集合
- `doc()`：選擇某一筆文件
- `getDoc()`：讀取單筆資料
- `getDocs()`：讀取多筆資料
- `addDoc()`：新增資料
- `updateDoc()`：更新資料
- `deleteDoc()`：刪除資料
- `where()`：條件查詢
- `orderBy()`：排序
- `serverTimestamp()`：伺服器時間
- `onSnapshot()`：即時監聽

這些 API 是幾乎所有 Firebase 前端專案的基礎，這個部落格專案也正是靠這些方法完成文章、留言與權限管理。

---

## 16. 建議你接著怎麼學

如果你要更熟悉 Firestore，建議依序練習：

1. 先會 `addDoc` / `getDocs`
2. 再會 `where` / `orderBy`
3. 再會 `updateDoc` / `deleteDoc`
4. 最後看 `firestore.rules`，理解真正的權限邊界

這會讓你很快理解為什麼前端很多功能看起來能做，但最終仍然必須由規則保護。
