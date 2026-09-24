# blog.js 詳解

這份文件是對 `js/blog.js` 的逐段與逐行解說，目的是讓你理解這份前台首頁如何從 Firestore 讀取文章、做分頁、做標籤篩選，以及如何將文章列表渲染到頁面上。

> 這份文件直接覆蓋範圍：`js/blog.js`
>
> 這次補強重點：每一段程式碼都會標示「原始碼位置（行號）」與「具體用途」，方便你直接對照原始檔。

---

## 1. 檔案定位與用途

`blog.js` 是前台首頁的核心腳本，主要負責：

- 從 Firestore 讀取已發佈文章
- 依照建立時間排序
- 產生文章標籤篩選器
- 根據標籤過濾文章
- 做分頁渲染
- 將文章卡片輸出到首頁

這份檔案通常會搭配：

- `index.html`：首頁模板
- `article.html`：文章詳細頁
- `firebase-config.js`：Firebase 初始化設定
- Firestore 中的 `articles` 集合

---

## 2. 最上方：匯入 Firestore 相關函式

原始碼位置：`js/blog.js: 1-2`

```js
import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

### 逐行解釋

#### 第 1 行：匯入資料庫實例
```js
import { db } from './firebase-config.js';
```

- 從 `firebase-config.js` 匯入 Firestore 實例 `db`
- 這個 `db` 是整份前台的資料庫入口
- 之後所有文章查詢都會使用這個 `db`

#### 第 2 行：匯入 Firestore 查詢函式
```js
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

這裡使用到：

- `collection`：取得 Firestore 集合參照
- `getDocs`：讀取查詢結果
- `query`：建立 Firestore 查詢物件
- `where`：加入條件，例如 `published == true`

這代表首頁文章列表不是直接讀整個資料庫，而是透過條件搜尋來拿出已發布文章。

---

## 3. 全域狀態：保存文章快取與篩選狀態

原始碼位置：`js/blog.js: 4-8`

```js
let allArticles = [];
let filteredArticles = [];
let currentTag = '';
let currentPage = 1;
const pageSize = 5;
```

### 逐行解釋

#### 第 4 行：`allArticles`
```js
let allArticles = [];
```

- 儲存全部已發佈文章
- 這是原始資料來源
- 後續所有篩選與分頁都建立在它之上

#### 第 5 行：`filteredArticles`
```js
let filteredArticles = [];
```

- 儲存篩選後的文章
- 例如點選某個標籤後，會把符合條件的文章放進這裡
- 它通常是 `allArticles` 的子集

#### 第 6 行：`currentTag`
```js
let currentTag = '';
```

- 記錄現在所選的標籤
- `''` 表示「全部文章」
- 若有指定標籤，例如 `JavaScript`，就只顯示這個標籤文章

#### 第 7 行：`currentPage`
```js
let currentPage = 1;
```

- 記錄目前頁碼
- 初始為第 1 頁
- 使用者換頁時會改動它

#### 第 8 行：`pageSize`
```js
const pageSize = 5;
```

- 每頁顯示 5 篇文章
- 這是分頁功能的核心參數

這個設計讓首頁文章列表既能篩選，又能分頁。 

---

## 4. 初始化頁面：DOMContentLoaded

原始碼位置：`js/blog.js: 10-13`

```js
window.addEventListener('DOMContentLoaded', async () => {
    setSeoMeta();
    await fetchArticles();
});
```

### 逐行解釋

#### 第 10 行：頁面載入完成後啟動
```js
window.addEventListener('DOMContentLoaded', async () => {
```

- 當 HTML 全部載入完成後觸發
- 這表示 DOM 元素已經就緒，可以安全讀取 `article-list` 等節點

#### 第 11 行：SEO 設定
```js
    setSeoMeta();
```

- 呼叫 `setSeoMeta()`
- 設定首頁 canonical、og、twitter 等網址資訊

#### 第 12 行：抓取文章資料
```js
    await fetchArticles();
```

- 呼叫 `fetchArticles()`
- 這是首頁資料載入的真正核心流程

#### 第 13 行：事件結束
```js
});
```

- 關閉事件監聽函式

這是首頁初始化的入口。 

---

## 5. 設定 SEO Meta：`setSeoMeta()`

原始碼位置：`js/blog.js: 15-24`

```js
function setSeoMeta() {
    const homeUrl = new URL('/', window.location.origin).toString();
    const canonicalLink = document.getElementById('canonical-link');
    const ogUrl = document.getElementById('og-url');
    const twitterUrl = document.getElementById('twitter-url');

    if (canonicalLink) canonicalLink.setAttribute('href', homeUrl);
    if (ogUrl) ogUrl.setAttribute('content', homeUrl);
    if (twitterUrl) twitterUrl.setAttribute('content', homeUrl);
}
```

### 逐行解釋

#### 第 15 行：函式開始
```js
function setSeoMeta() {
```

- 定義首頁 SEO 設定函數
- 這是前台頁面可以呼叫的公共方法

#### 第 16 行：建構首頁 URL
```js
    const homeUrl = new URL('/', window.location.origin).toString();
```

- 使用 `new URL('/', window.location.origin)` 建立首頁絕對 URL
- 例如：`https://example.com/`
- 最後轉成字串

#### 第 17-19 行：拿到 SEO 相關元素
```js
    const canonicalLink = document.getElementById('canonical-link');
    const ogUrl = document.getElementById('og-url');
    const twitterUrl = document.getElementById('twitter-url');
```

- `canonical-link`：搜尋引擎 canonical URL
- `og-url`：Facebook / Open Graph 網址
- `twitter-url`：Twitter 卡片網址

#### 第 21-23 行：寫入 URL
```js
    if (canonicalLink) canonicalLink.setAttribute('href', homeUrl);
    if (ogUrl) ogUrl.setAttribute('content', homeUrl);
    if (twitterUrl) twitterUrl.setAttribute('content', homeUrl);
```

- 只有在元素存在時才設定值
- 這避免 `null` 錯誤

### 這部分很重要的原因

它可以讓首頁在搜尋引擎與社群分享時，有正確的網址資訊，提升 SEO 與社群展示效果。

---

## 6. 生成文章連結：`buildArticleUrl()`

原始碼位置：`js/blog.js: 26-29`

```js
function buildArticleUrl(slug) {
    const encodedSlug = encodeURIComponent(slug);
    return `article.html?slug=${encodedSlug}`;
}
```

### 逐行解釋

#### 第 26 行：函式定義
```js
function buildArticleUrl(slug) {
```

- 接收文章 `slug`
- 這是文章詳細頁的識別碼

#### 第 27 行：URL 編碼
```js
    const encodedSlug = encodeURIComponent(slug);
```

- 把 slug 做 URL 編碼
- 例如原本是 `我的文章`，轉成可安全出現在網址中的字串

#### 第 28 行：組出文章連結
```js
    return `article.html?slug=${encodedSlug}`;
```

- 回傳格式：`article.html?slug=xxx`
- 這是文章列表卡片點擊後跳轉到文章頁的核心邏輯

### 為什麼要 `encodeURIComponent`

因為 slug 裡可能有中文、空白或特殊字元，這樣處理可以避免 URL 錯誤與亂碼問題。

---

## 7. 讀取文章：`fetchArticles()`

原始碼位置：`js/blog.js: 31-54`

```js
async function fetchArticles() {
    const listEl = document.getElementById('article-list');
    try {
        const q = query(collection(db, 'articles'), where('published', '==', true));
        const querySnapshot = await getDocs(q);
```

### 這段是首頁讀取資料的核心

#### 第 31 行：函式開始
```js
async function fetchArticles() {
```

- 這是一個非同步函式
- 因為 `getDocs()` 是異步 API

#### 第 32 行：取得文章列表容器
```js
    const listEl = document.getElementById('article-list');
```

- 取出首頁的文章列表容器
- 這是資料成功載入後要放進去的 DOM 節點

#### 第 33 行：開始 try/catch
```js
    try {
```

- 這代表資料讀取可能失敗
- 若失敗就進入錯誤處理區

#### 第 34 行：建立 Firestore 查詢
```js
        const q = query(collection(db, 'articles'), where('published', '==', true));
```

- `collection(db, 'articles')`：取得 `articles` 集合
- `where('published', '==', true)`：只抓已發佈文章
- 也就是前台首頁只展示 `published === true` 的文章

#### 第 35 行：執行查詢
```js
        const querySnapshot = await getDocs(q);
```

- `getDocs(q)` 會從 Firebase 讀取資料
- 回傳 `querySnapshot` 物件
- 可用來遍歷文章文件

---

## 8. 將查詢結果整理成文章陣列

原始碼位置：`js/blog.js: 37-46`

```js
        allArticles = [];
        querySnapshot.forEach((docSnap) => {
            allArticles.push({ id: docSnap.id, ...docSnap.data() });
        });

        allArticles.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
```

### 逐行解釋

#### 第 37 行：清空資料
```js
        allArticles = [];
```

- 每次從 Firebase 重新讀取資料時，先清空舊陣列
- 避免資料重複堆積

#### 第 38-40 行：將每篇文章加入陣列
```js
        querySnapshot.forEach((docSnap) => {
            allArticles.push({ id: docSnap.id, ...docSnap.data() });
        });
```

- `docSnap` 是每一篇文章文件
- `docSnap.id` 是文件 ID
- `...docSnap.data()` 是文章內容
- 最終每筆資料長這樣：

```js
{ id: docSnap.id, ...docSnap.data() }
```

這讓後面渲染時可以直接用 `art.title`、`art.summary` 等屬性。

#### 第 42-46 行：依時間排序
```js
        allArticles.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
```

- 依照 `createdAt` 由新到舊排序
- 最新文章先顯示
- `toMillis()` 是 Firestore Timestamp 的標準方法

這一步很重要，因為首頁通常希望最新文章在最前面。

---

## 9. 執行標籤與初始過濾

原始碼位置：`js/blog.js: 48-49`

```js
        renderTags();
        filterByTag('');
```

### 逐行解釋

#### 第 48 行：製作標籤按鈕
```js
        renderTags();
```

- 經過文章資料整理後，生成標籤列表
- 例如 `JavaScript`、`Firebase`、`前端`

#### 第 49 行：預設顯示全部文章
```js
        filterByTag('');
```

- 傳入空字串 `''`
- 表示預設進入首頁時顯示全部文章

這表示首頁啟動後，默認就是完整文章列表。

---

## 10. 錯誤處理

原始碼位置：`js/blog.js: 50-53`

```js
    } catch (error) {
        console.error("Error fetching articles:", error);
        listEl.innerHTML = `<div class="p-6 rounded-xl bg-darkCard border border-darkBorder text-center text-red-400">無法載入文章，請確認您的網路連線與 Firebase 設定是否正確（` + error.message + `）。</div>`;
    }
}
```

### 逐行解釋

#### 第 50 行：錯誤捕捉開始
```js
    } catch (error) {
```

- 如果 Firestore 查詢失敗，會進到這裡
- 例如網路錯誤、專案設定錯誤、權限不足等

#### 第 51 行：輸出錯誤訊息
```js
        console.error("Error fetching articles:", error);
```

- 在開發者工具 console 顯示錯誤資訊
- 方便除錯

#### 第 52 行：顯示錯誤訊息到畫面
```js
        listEl.innerHTML = `<div ...>無法載入文章...</div>`;
```

- 直接把列表區域替換成錯誤提示
- 讓使用者知道文章載入失敗，而不是看到空白頁

#### 第 53-54 行：結束 try/catch
```js
    }
}
```

- 關閉錯誤處理
- 函式結束

---

## 11. 產生標籤篩選器：`renderTags()`

原始碼位置：`js/blog.js: 56-73`

```js
function renderTags() {
    const tagSet = new Set();
    allArticles.forEach(art => {
        if (art.tags && Array.isArray(art.tags)) {
            art.tags.forEach(t => tagSet.add(t.trim()));
        }
    });

    const filtersEl = document.getElementById('tag-filters');
    let html = `<button onclick="filterByTag('')" class="tag-btn ${currentTag === '' ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition">全部文章</button>`;

    tagSet.forEach(tag => {
        const isActive = currentTag === tag;
        html += `<button onclick="filterByTag('${tag}')" class="tag-btn ${isActive ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition"># ${tag}</button>`;
    });

    filtersEl.innerHTML = html;
}
```

### 逐行解釋

#### 第 56 行：函式開始
```js
function renderTags() {
```

- 這個函式用來產生文章標籤按鈕
- 它會把文章裡的所有 tag 整理出來

#### 第 57 行：建立 `Set`
```js
    const tagSet = new Set();
```

- `Set` 會自動去除重複值
- 例如有 3 篇文章都帶有 `Firebase`，只會留下 1 個 `Firebase`

#### 第 58-62 行：掃描所有文章
```js
    allArticles.forEach(art => {
        if (art.tags && Array.isArray(art.tags)) {
            art.tags.forEach(t => tagSet.add(t.trim()));
        }
    });
```

- 遍歷每篇文章
- 若文章有 `tags` 陣列，就把每個 tag 取出
- `t.trim()` 清除前後空白，避免 `JavaScript` 和 ` JavaScript ` 被視為不同標籤

#### 第 64 行：找到標籤容器
```js
    const filtersEl = document.getElementById('tag-filters');
```

- 找到首頁上顯示標籤的容器元素

#### 第 65 行：先插入「全部文章」按鈕
```js
    let html = `<button ...>全部文章</button>`;
```

- 這是第一個按鈕
- 點擊後會顯示所有文章

#### 第 67-70 行：生成各個 tag 按鈕
```js
    tagSet.forEach(tag => {
        const isActive = currentTag === tag;
        html += `<button ...># ${tag}</button>`;
    });
```

- 每個 tag 都會生成一個按鈕
- 若目前選中這個 tag，按鈕就會呈現 active 狀態

#### 第 72 行：寫回 HTML
```js
    filtersEl.innerHTML = html;
```

- 將組好的標籤 HTML 注入到頁面中

---

## 12. 點擊標籤後的過濾邏輯：`filterByTag()`

原始碼位置：`js/blog.js: 75-87`

```js
window.filterByTag = function (tag) {
    currentTag = tag;
    currentPage = 1;

    if (tag === '') {
        filteredArticles = [...allArticles];
    } else {
        filteredArticles = allArticles.filter(art => art.tags && art.tags.map(t => t.trim()).includes(tag));
    }

    renderTags();
    renderPage();
}
```

### 逐行解釋

#### 第 75 行：掛載全域函式
```js
window.filterByTag = function (tag) {
```

- 將 `filterByTag` 綁定到 `window`
- 這樣 HTML 裡的 `onclick="filterByTag('JavaScript')"` 可以直接呼叫

#### 第 76 行：記錄目前關注標籤
```js
    currentTag = tag;
```

- 讓目前所點選的標籤被記住
- 之後 renderTags 可以顯示 active 樣式

#### 第 77 行：回到第一頁
```js
    currentPage = 1;
```

- 因為切換標籤通常要從第一頁開始看

#### 第 79-83 行：篩選文章
```js
    if (tag === '') {
        filteredArticles = [...allArticles];
    } else {
        filteredArticles = allArticles.filter(art => art.tags && art.tags.map(t => t.trim()).includes(tag));
    }
```

- 若選擇全部文章：直接複製全部資料
- 若選擇某個 tag：過濾出含該 tag 的文章

#### 第 85-86 行：重新渲染
```js
    renderTags();
    renderPage();
```

- 重新畫出標籤按鈕
- 重新產生當前頁文章列表

---

## 13. 渲染當前頁面：`renderPage()`

原始碼位置：`js/blog.js: 89-145`

```js
function renderPage() {
    const listEl = document.getElementById('article-list');
    const paginationEl = document.getElementById('pagination-container');

    if (filteredArticles.length === 0) {
        listEl.innerHTML = `<div class="p-8 rounded-xl bg-darkCard border border-darkBorder text-center text-gray-400">目前沒有找到相關文章。</div>`;
        paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filteredArticles.slice(start, end);
```

### 逐行解釋

#### 第 89 行：函式開始
```js
function renderPage() {
```

- 負責將文章列表渲染到頁面上
- 這是首頁文章展示的核心函式

#### 第 90-91 行：取得頁面容器
```js
    const listEl = document.getElementById('article-list');
    const paginationEl = document.getElementById('pagination-container');
```

- `article-list`：文章列表容器
- `pagination-container`：分頁按鈕容器

#### 第 93-97 行：空資料處理
```js
    if (filteredArticles.length === 0) {
        listEl.innerHTML = `<div ...>目前沒有找到相關文章。</div>`;
        paginationEl.innerHTML = '';
        return;
    }
```

- 若沒有符合條件文章，就顯示空狀態
- `return` 避免後續分頁邏輯繼續執行

#### 第 99-104 行：計算分頁資訊
```js
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filteredArticles.slice(start, end);
```

- `totalPages`：總頁數
- `start` / `end`：這一頁要切出的資料範圍
- `slice(start, end)`：取出目前頁應顯示的文章

這段是整個分頁邏輯的核心。

---

## 14. 生成文章卡片 HTML

原始碼位置：`js/blog.js: 106-132`

```js
    let html = '';
    pageItems.forEach(art => {
        const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
        const tagsHtml = art.tags ? art.tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-md bg-darkBg border border-darkBorder text-emerald-400">#${t.trim()}</span>`).join('') : '';

        html += `
            <article class="p-6 rounded-2xl bg-darkCard border border-darkBorder hover:border-emerald-500/50 transition group shadow-lg">
                <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span class="flex items-center space-x-1">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${dateStr}</span>
                    </span>
                    <div class="flex flex-wrap gap-1">${tagsHtml}</div>
                </div>
                <h2 class="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition">
                    <a href="${buildArticleUrl(art.slug)}">${escapeHtml(art.title)}</a>
                </h2>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(art.summary)}</p>
                <a href="${buildArticleUrl(art.slug)}" class="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
                    <span>閱讀全文</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
            </article>
        `;
    });

    listEl.innerHTML = html;
```

### 逐行解釋

#### 第 106 行：準備字串容器
```js
    let html = '';
```

- 先建立空字串，準備累積卡片 HTML

#### 第 107 行：開始遍歷目前頁的文章
```js
    pageItems.forEach(art => {
```

- 每篇文章都會生成一張卡片

#### 第 108 行：日期格式化
```js
        const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
```

- 若文章有 `createdAt` Timestamp，轉成可讀日期
- 若沒有，就顯示 `剛剛`

#### 第 109 行：生成 tag 標籤 HTML
```js
        const tagsHtml = art.tags ? art.tags.map(t => `<span ...>#${t.trim()}</span>`).join('') : '';
```

- 把每個 tag 都轉成小標籤樣式
- 例如 `#Firebase`、`#JavaScript`

#### 第 111-129 行：組出文章卡片
```js
        html += `
            <article ...>
                ...
            </article>
        `;
```

- 每篇文章都會生成一個 article 區塊
- 標題使用 `escapeHtml(art.title)` 防止 XSS
- 摘要也做轉義
- 點擊連結會去到 `article.html?slug=...`

#### 第 132 行：寫回頁面
```js
    listEl.innerHTML = html;
```

- 把組好的卡片整批插入文章列表容器

---

## 15. 分頁器判斷與渲染

原始碼位置：`js/blog.js: 134-145`

```js
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let pagHtml = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">上一頁</button>
        <span class="text-sm text-gray-400">第 ${currentPage} / ${totalPages} 頁</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">下一頁</button>
    `;
    paginationEl.innerHTML = pagHtml;
}
```

### 逐行解釋

#### 第 134-137 行：文章不足一頁
```js
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
```

- 若總頁數只有 1 頁，就不需要分頁按鈕
- 直接清空分頁器

#### 第 139-144 行：生成分頁按鈕
```js
    let pagHtml = `
        <button ...>上一頁</button>
        <span ...>第 ${currentPage} / ${totalPages} 頁</span>
        <button ...>下一頁</button>
    `;
    paginationEl.innerHTML = pagHtml;
```

- 這段會組出上一頁／下一頁按鈕
- 將現在頁碼與總頁數顯示出來
- 若在第一頁或最後一頁，會把對應按鈕禁用

---

## 16. 換頁：`changePage()`

原始碼位置：`js/blog.js: 147-153`

```js
window.changePage = function (page) {
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

### 逐行解釋

#### 第 147 行：掛載全域換頁函式
```js
window.changePage = function (page) {
```

- 把換頁功能掛到 `window`
- 讓 HTML 的 `onclick="changePage(2)"` 能直接執行

#### 第 148 行：重新計算總頁數
```js
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
```

- 依照目前篩選後的文章數，重新計算總頁數

#### 第 149 行：防止非法頁碼
```js
    if (page < 1 || page > totalPages) return;
```

- 若頁碼小於 1 或大於最大頁數，就直接忽略

#### 第 150 行：更新目前頁碼
```js
    currentPage = page;
```

- 設定新的頁碼

#### 第 151-152 行：重新渲染與回頂端
```js
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
```

- 重新繪製這一頁內容
- 頁面切換後自動捲到最頂部

---

## 17. HTML 轉義：`escapeHtml()`

原始碼位置：`js/blog.js: 155-157`

```js
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
```

### 逐行解釋

#### 第 155 行：函式定義
```js
function escapeHtml(str) {
```

- 接收一段字串
- 主要用來處理文章標題與摘要

#### 第 156 行：空值保護
```js
    if (!str) return '';
```

- 如果內容為空，就直接回傳空字串

#### 第 157 行： HTML 字元轉義
```js
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
```

- 把特殊字元轉成安全 HTML 的表示形式
- 例如：
  - `&` -> `&amp;`
  - `<` -> `&lt;`
  - `>` -> `&gt;`
  - `"` -> `&quot;`
  - `'` -> `&#039;`

這能降低 XSS 攻擊風險。

---

## 18. 整體流程總結

`blog.js` 的完整流程大致如下：

1. 頁面載入完成後執行 `DOMContentLoaded`
2. `fetchArticles()` 從 Firestore 讀取 `published == true` 的文章
3. `allArticles` 儲存全部文章，並按照 `createdAt` 由新到舊排序
4. `renderTags()` 產生標籤按鈕
5. `filterByTag('')` 預設顯示全部文章
6. `renderPage()` 依照頁碼與 tag 過濾，顯示當前頁文章
7. `changePage()` 處理上一頁／下一頁切換
8. 點擊卡片後，依照 `slug` 跳轉到文章詳細頁

---

## 19. 優點整理

- 清楚的首頁文章列表架構
- 支援標籤篩選與分頁
- 讀取條件只抓已發佈文章
- 配合 `article.html` 完成文章內容導航
- `escapeHtml()` 提供基本安全防護

---

## 20. 風險點

這份檔案本身的主要風險不是功能問題，而是：

1. 如果 Firestore rules 沒有限制讀取權限，可能會暴露未發布文章
2. 若文章資料內容中包含惡意 HTML，未經處理可能造成 XSS
3. 如果 tag 設計太自由，可能會造成噪音標籤

因此，前端渲染要搭配 Firestore Security Rules 一起設計。

---

## 21. 一句話概括

`blog.js` 是前台首頁的文章列表控制器：

- 它從 Firestore 拿資料
- 依標籤和分頁整理文章
- 把文章卡片輸出到首頁
- 讓使用者點選後進入詳細文章頁

它本質上是整個部落格前台最重要的「入口腳本」。

---

如果你要，我也可以下一步把這份格式同步套用到：

- [doc/admin.js詳解.md](doc/admin.js詳解.md)
- [doc/article.js詳解.md](doc/article.js詳解.md)
- [doc/admin.html詳解.md](doc/admin.html詳解.md)

讓所有詳細文件都維持同一種「原始碼行號 + 逐段解釋」的風格。

## 10. 取出所有標籤並渲染篩選器

```js
        renderTags();
        filterByTag('');
```

### 功能

- 先產生標籤按鈕
- 然後預設顯示「全部文章」

這表示首頁啟動後，默認就是完整文章列表。

---

## 11. 錯誤處理

```js
    } catch (error) {
        console.error("Error fetching articles:", error);
        listEl.innerHTML = `<div class="p-6 rounded-xl bg-darkCard border border-darkBorder text-center text-red-400">無法載入文章，請確認您的網路連線與 Firebase 設定是否正確（` + error.message + `）。</div>`;
    }
}
```

### 功能

- 如果 Firestore 讀取失敗
- 就在文章列表區域顯示錯誤訊息

這是用戶體驗的重要部分。

---

## 12. 產生標籤篩選器：`renderTags()`

```js
function renderTags() {
    const tagSet = new Set();
    allArticles.forEach(art => {
        if (art.tags && Array.isArray(art.tags)) {
            art.tags.forEach(t => tagSet.add(t.trim()));
        }
    });
```

### 這段是在做什麼

- 先掃描所有文章
- 把每篇文章的 tags 取出來
- 放進 `Set`，避免重複

`Set` 的用處是：

- 自動去除重複標籤
- 之後可以直接用來生成按鈕

---

## 13. 生成全部標籤按鈕 HTML

```js
    const filtersEl = document.getElementById('tag-filters');
    let html = `<button onclick="filterByTag('')" class="tag-btn ${currentTag === '' ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition">全部文章</button>`;

    tagSet.forEach(tag => {
        const isActive = currentTag === tag;
        html += `<button onclick="filterByTag('${tag}')" class="tag-btn ${isActive ? 'active bg-emerald-600 text-white' : 'bg-darkCard text-gray-300 border border-darkBorder hover:border-gray-500'} px-3 py-1.5 rounded-full text-xs font-medium transition"># ${tag}</button>`;
    });

    filtersEl.innerHTML = html;
}
```

### 功能

- 產生「全部文章」按鈕
- 再產生各個 tag 的按鈕
- 如果某個 tag 是目前選中的，就給它 `active` 顏色

這讓首頁可以做分類瀏覽。

---

## 14. 點擊標籤後的過濾邏輯：`filterByTag()`

```js
window.filterByTag = function (tag) {
    currentTag = tag;
    currentPage = 1;

    if (tag === '') {
        filteredArticles = [...allArticles];
    } else {
        filteredArticles = allArticles.filter(art => art.tags && art.tags.map(t => t.trim()).includes(tag));
    }

    renderTags();
    renderPage();
}
```

### 功能

- 設定目前選中的 tag
- 回到第一頁
- 若 tag 是空字串，就顯示全部文章
- 若 tag 非空，就過濾 `allArticles` 中含有該 tag 的文章

### 這裡使用的關鍵邏輯

```js
art.tags.map(t => t.trim()).includes(tag)
```

- 把每篇文章的 tags 轉成乾淨字串
- 判斷是否包含這個 tag

---

## 15. 渲染當前頁面：`renderPage()`

```js
function renderPage() {
    const listEl = document.getElementById('article-list');
    const paginationEl = document.getElementById('pagination-container');

    if (filteredArticles.length === 0) {
        listEl.innerHTML = `<div class="p-8 rounded-xl bg-darkCard border border-darkBorder text-center text-gray-400">目前沒有找到相關文章。</div>`;
        paginationEl.innerHTML = '';
        return;
    }
```

### 功能

- 準備要顯示文章列表
- 如果過濾後沒有文章，就顯示空狀態

---

## 16. 計算總頁數與目前頁面資料

```js
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filteredArticles.slice(start, end);
```

### 這段是分頁的核心

- `totalPages`：總共有幾頁
- `start` / `end`：這頁要切出的範圍
- `slice(start, end)`：取出這一頁的文章

例如：

- 每頁 5 篇
- 第 2 頁：從第 6 篇開始取 5 篇

---

## 17. 生成文章卡片 HTML

```js
    let html = '';
    pageItems.forEach(art => {
        const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
        const tagsHtml = art.tags ? art.tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-md bg-darkBg border border-darkBorder text-emerald-400">#${t.trim()}</span>`).join('') : '';

        html += `
            <article class="p-6 rounded-2xl bg-darkCard border border-darkBorder hover:border-emerald-500/50 transition group shadow-lg">
                <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span class="flex items-center space-x-1">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${dateStr}</span>
                    </span>
                    <div class="flex flex-wrap gap-1">${tagsHtml}</div>
                </div>
                <h2 class="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition">
                    <a href="${buildArticleUrl(art.slug)}">${escapeHtml(art.title)}</a>
                </h2>
                <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(art.summary)}</p>
                <a href="${buildArticleUrl(art.slug)}" class="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">
                    <span>閱讀全文</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
            </article>
        `;
    });

    listEl.innerHTML = html;
```

### 功能

- 為每篇文章生成一張卡片
- 顯示標題、摘要、日期、標籤
- 點擊標題或「閱讀全文」可進入文章頁

### 重點

```js
buildArticleUrl(art.slug)
```

- 會生成文章詳細頁連結
- 點進去後文章頁用 `slug` 查詢資料

---

## 18. 若只有一頁則不顯示分頁器

```js
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
```

### 功能

- 如果文章總數不足一頁，就不需要分頁按鈕

這樣首頁會更簡潔。

---

## 19. 產生分頁按鈕

```js
    let pagHtml = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">上一頁</button>
        <span class="text-sm text-gray-400">第 ${currentPage} / ${totalPages} 頁</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : ''} class="px-4 py-2 rounded-lg bg-darkCard border border-darkBorder text-sm font-medium hover:bg-darkBorder transition">下一頁</button>
    `;
    paginationEl.innerHTML = pagHtml;
}
```

### 功能

- 產生上一頁／下一頁按鈕
- 依照當前頁籤狀態禁用某些按鈕
- 顯示目前是第幾頁

---

## 20. 換頁：`changePage()`

```js
window.changePage = function (page) {
    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

### 功能

- 讓使用者切換頁面
- 確保頁碼合法
- 換頁後自動滑到最上方

這是典型的首頁列表導覽邏輯。

---

## 21. HTML 轉義：`escapeHtml()`

```js
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
```

### 功能

- 防止文章標題、摘要等內容被直接當作 HTML 執行
- 對 XSS 攻擊有防禦作用

這是前端安全中很常見的防護方式。

---

## 22. 整體流程總結

`blog.js` 的完整流程大致如下：

1. 頁面載入完成後執行
2. 讀取 Firestore 中所有 `published == true` 的文章
3. 按時間排序
4. 產生標籤篩選器
5. 過濾文章
6. 分頁渲染
7. 生成文章卡片
8. 點擊文章後跳轉到文章詳細頁

---

## 23. 優點整理

- 清楚的首頁文章列表架構
- 支援標籤篩選與分頁
- 讀取條件只抓已發佈文章
- 配合 `article.html` 完成文章內容導航
- `escapeHtml()` 提供基本安全防護

---

## 24. 風險點

這份檔案本身的主要風險不是功能問題，而是：

1. 如果 Firestore rules 沒有限制讀取權限，可能會暴露未發布文章
2. 若文章資料內容中包含惡意 HTML，未經處理可能造成 XSS
3. 如果 tag 設計太自由，可能會造成噪音標籤

因此，前端渲染要搭配 Firestore Security Rules 一起設計。

---

## 25. 一句話概括

`blog.js` 是前台首頁的文章列表控制器：

- 它從 Firestore 拿資料
- 依標籤和分頁整理文章
- 把文章卡片輸出到首頁
- 讓使用者點選後進入詳細文章頁

它本質上是整個部落格前台最重要的「入口腳本」。

---

如果你要，我下一步可以繼續補：

- `firebase-config.js` 詳解
- `admin.html` 詳解
- `admin.js` 系列延伸總結

讓你的文件整體閱讀脈絡更完整。