# article.js 詳解

這份文件是對 `article.js` 的逐段、逐行解說，目的是幫你理解這份前台文章頁面是如何從 Firestore 讀取文章、渲染頁面、顯示留言，以及如何提交留言的。

> 這份文件直接覆蓋範圍：`js/article.js`
>
> 補強重點：每一段程式碼都會標示「原始碼位置（行號）」與用途，讓你能直接對照原始檔閱讀。

---

## 1. 檔案定位與整體用途

`article.js` 是前台文章詳細頁的核心檔案，負責：

- 根據 URL 讀取文章 slug
- 查詢 Firestore 中對應的已發佈文章
- 用 Markdown 渲染文章內容
- 更新 SEO meta 標籤
- 讀取已核准留言
- 顯示留言列表
- 讓訪客提交留言

這份檔案通常會搭配：

- `article.html`：文章頁面原始模板
- `blog.js`：文章列表頁
- `firebase-config.js`：Firebase 設定
- Firestore 集合：`articles`、`comments`

---

## 2. 最上方：匯入 Firestore 相關函式

原始碼位置：`js/article.js: 1-2`

```js
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

### 逐行解釋

#### 第 1 行
```js
import { db } from './firebase-config.js';
```

- 從 `firebase-config.js` 匯入 Firestore 實例 `db`
- 這個變數會用來讀取文章與留言

#### 第 2 行
```js
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

這裡匯入的功能有：

- `collection`：取得某個集合
- `getDocs`：查詢集合資料
- `query`：建立查詢條件
- `where`：篩選條件
- `addDoc`：新增文件
- `serverTimestamp`：生成後端伺服器時間

這些是文章頁面最重要的資料讀寫 API。

---

## 3. 全域變數：保存目前文章 ID

```js
let currentArticleId = null;
```

### 功能

- 在文章頁面載入時，會將當前文章的 Firestore 文件 ID 存進這個變數
- 之後留言提交時，會使用它來知道目前留言屬於哪一篇文章

---

## 4. DOMContentLoaded：頁面初始化

```js
window.addEventListener('DOMContentLoaded', async () => {
    const slug = getArticleSlug();

    if (!slug) {
        showModal("錯誤", "找不到指定的文章參數。");
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    await fetchArticleBySlug(slug);
});
```

### 流程說明

#### `window.addEventListener('DOMContentLoaded', ...)`

- 當頁面 DOM 完整載入後觸發
- 這表示 HTML 元素已經存在，可以安全查詢與渲染

#### `const slug = getArticleSlug();`

- 抓出文章 slug
- 這個 slug 會用來從 Firestore 找到對應文章

#### 如果找不到 slug
```js
if (!slug) {
    showModal("錯誤", "找不到指定的文章參數。");
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
}
```

- 若網址沒有 `slug` 參數，代表文章路徑錯誤
- 顯示錯誤 Modal
- 2 秒後跳回首頁

#### `await fetchArticleBySlug(slug);`

- 真正的文章讀取邏輯從這裡開始

---

## 5. 讀取文章：`fetchArticleBySlug()`

```js
async function fetchArticleBySlug(slug) {
    try {
        const q = query(collection(db, 'articles'), where('slug', '==', slug), where('published', '==', true));
        const querySnapshot = await getDocs(q);
```

### 這段是文章頁最核心的讀取邏輯

#### `collection(db, 'articles')`

- 代表 Firestore 的 `articles` 集合

#### `where('slug', '==', slug)`

- 篩選條件：文章 slug 必須等於目前網址的 slug

#### `where('published', '==', true)`

- 再篩選：文章必須為已發布狀態

#### `query(...)`

- 把條件組合成 Firestore 查詢物件

#### `await getDocs(q)`

- 執行查詢

這代表前台文章頁只會讀取已發佈文章，而不會讀取草稿。

---

## 6. 找不到文章時的處理

```js
        if (querySnapshot.empty) {
            document.getElementById('article-loading').innerHTML = `<p class="text-center text-red-400 py-10">找不到該文章或文章尚未發佈。</p>`;
            return;
        }
```

### 功能

- 如果查詢結果是空的，表示：
  - slug 不存在
  - 或文章尚未發佈

會直接在頁面上顯示錯誤訊息，避免白畫面。

---

## 7. 取得文章資料並寫入頁面

```js
        const docSnap = querySnapshot.docs[0];
        const art = docSnap.data();
        currentArticleId = docSnap.id;
        updateSeoMeta(art, slug);

        document.getElementById('page-title').innerText = `${art.title} | DevLog`;
        document.getElementById('og-title').setAttribute('content', art.title);
        document.getElementById('og-description').setAttribute('content', art.summary);

        document.getElementById('art-title').innerText = art.title;
        document.getElementById('art-created').innerText = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
```

### 逐段說明

#### `const docSnap = querySnapshot.docs[0];`

- 只取第一筆符合條件的文章

#### `const art = docSnap.data();`

- 取出文章內容物件

#### `currentArticleId = docSnap.id;`

- 記錄文章的 Firestore Document ID
- 後面留言提交要用到這個 ID

#### `updateSeoMeta(art, slug);`

- 更新頁面 SEO 相關資訊

#### 設定標題與 meta

- `page-title`：瀏覽器頁籤標題
- `og-title`：社群分享標題
- `og-description`：社群分享描述
- `art-title`：文章主標題
- `art-created`：建立日期

---

## 8. 更新時間顯示

```js
        if (art.updatedAt) {
            document.getElementById('art-updated').innerText = art.updatedAt.toDate().toLocaleDateString();
        } else {
            document.getElementById('updated-wrapper').classList.add('hidden');
        }
```

### 功能

- 如果文章有 `updatedAt`，就顯示更新日期
- 若沒有，則隱藏更新時間區塊

這樣 UI 不會顯示空白更新資訊。

---

## 9. 文章標籤渲染

```js
        const tagsEl = document.getElementById('art-tags');
        if (art.tags && Array.isArray(art.tags)) {
            tagsEl.innerHTML = art.tags.map(t => `<span class="text-xs px-2 py-0.5 rounded-md bg-darkBg border border-darkBorder text-emerald-400">#${t.trim()}</span>`).join('');
        }
```

### 功能

- 如果文章有 tags 陣列
- 就把每一個 tag 轉成標籤小塊
- 例如：`#JavaScript`、`#Firebase`

### 這裡是直接寫入 innerHTML

- 這是很常見的方式
- 但要注意如果 tag 內容可能有特殊字元，最好做轉義

---

## 10. 渲染文章內容：Markdown 轉 HTML

```js
        const bodyEl = document.getElementById('art-body');
        bodyEl.innerHTML = marked.parse(art.content || '');
```

### 功能

- `art.content` 是文章 Markdown 內容
- `marked.parse()` 會把 Markdown 轉成 HTML
- 然後寫進 `art-body` 區塊

這就是文章頁最核心的內容展示部分。

---

## 11. 顯示文章區塊，隱藏 loading 狀態

```js
        document.getElementById('article-loading').classList.add('hidden');
        document.getElementById('article-content-wrapper').classList.remove('hidden');

        await fetchApprovedComments(currentArticleId);
```

### 功能

- 隱藏載入中畫面
- 顯示文章內容區塊
- 接著載入已核准留言

這讓文章頁面呈現順暢。

---

## 12. 錯誤處理

```js
    } catch (error) {
        console.error("Error fetching article:", error);
        document.getElementById('article-loading').innerHTML = `<p class="text-center text-red-400 py-10">載入文章發生錯誤：${escapeHtml(error.message)}</p>`;
    }
}
```

### 功能

- 如果查詢失敗，例如 Firestore 無法讀取
- 就顯示錯誤訊息給使用者

---

## 13. 抓取文章 slug：`getArticleSlug()`

```js
function getArticleSlug() {
    const urlParams = new URLSearchParams(window.location.search);
    const querySlug = urlParams.get('slug');
    if (querySlug) return querySlug;

    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const articleIndex = pathSegments.indexOf('article');
    if (articleIndex >= 0 && pathSegments[articleIndex + 1]) {
        return decodeURIComponent(pathSegments[articleIndex + 1]);
    }

    return null;
}
```

### 這段是做什麼的

它負責從網址中解析文章 slug。常見兩種方式：

#### 方式 1：查詢參數
```js
article.html?slug=hello-world
```

#### 方式 2：路徑參數
```js
/article/hello-world
```

### 這裡的處理邏輯

- 先看 URL query string 裡是否有 `slug`
- 如果沒有，再分析路徑中的 `article` 後一段
- 最後回傳 slug

這讓文章頁面兼容不同網址結構。

---

## 14. 生成文章 URL：`getArticleUrl()`

```js
function getArticleUrl(slug) {
    const encodedSlug = encodeURIComponent(slug);
    return new URL(`article.html?slug=${encodedSlug}`, window.location.origin + window.location.pathname.replace(/[^/]*$/, '')).toString();
}
```

### 功能

- 依照 slug 產生文章的 canonical URL
- 會進行 URL encode，避免特殊字元問題
- 例如空白、中文、特殊符號

這在 SEO meta 很重要，因為搜尋引擎和社群連結都需要正確的 canonical URL。

---

## 15. SEO meta 更新：`updateSeoMeta()`

```js
function updateSeoMeta(article, slug) {
    const canonicalUrl = getArticleUrl(slug);
    const publishedAt = article.createdAt?.toDate ? article.createdAt.toDate().toISOString() : '';
    const updatedAt = article.updatedAt?.toDate ? article.updatedAt.toDate().toISOString() : publishedAt;
    const keywords = Array.isArray(article.tags) ? article.tags.map(tag => tag.trim()).filter(Boolean).join(', ') : '';
```

### 這段是什麼

這個函式會幫文章頁面寫入：

- canonical link
- Open Graph URL
- Twitter URL
- Keywords
- datePublished
- dateModified
- structured data JSON-LD

這使得文章頁面對 SEO 比較友善。

---

## 16. 前端 meta 標籤更新

```js
    const metaDescription = document.getElementById('meta-description');
    const canonicalLink = document.getElementById('canonical-link');
    const ogUrl = document.getElementById('og-url');
    const twitterUrl = document.getElementById('twitter-url');
    const publishedMeta = document.getElementById('article-published-time');
    const modifiedMeta = document.getElementById('article-modified-time');
    const keywordsMeta = document.getElementById('meta-keywords');
    const jsonLd = document.getElementById('article-jsonld');

    if (metaDescription) metaDescription.setAttribute('content', article.summary || '閱讀 DevLog 的深度技術文章。');
    if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
    if (twitterUrl) twitterUrl.setAttribute('content', canonicalUrl);
    if (publishedMeta && publishedAt) publishedMeta.setAttribute('content', publishedAt);
    if (modifiedMeta && updatedAt) modifiedMeta.setAttribute('content', updatedAt);
    if (keywordsMeta) keywordsMeta.setAttribute('content', keywords);
```

### 功能

- 更新頁面描述與 keywords
- 設定文章 canonical URL
- 設定 OG / Twitter 分享資訊
- 設定文章發佈與更新時間

這對社群分享、搜尋引擎優化非常重要。

---

## 17. JSON-LD 結構化資料

```js
    if (jsonLd) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title || 'DevLog 文章',
            "description": article.summary || '閱讀 DevLog 的深度技術文章。',
            "author": {
                "@type": "Organization",
                "name": "DevLog"
            },
            "publisher": {
                "@type": "Organization",
                "name": "DevLog"
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": canonicalUrl
            }
        };
```

### 功能

- 生成 Google 搜尋引擎可讀的 structured data
- 這影響文章在搜尋結果裡的展示形式

#### 兩個關鍵屬性

```js
if (publishedAt) schema.datePublished = publishedAt;
if (updatedAt) schema.dateModified = updatedAt;
```

- 記錄文章發佈與更新時間

```js
if (Array.isArray(article.tags) && article.tags.length > 0) {
    schema.keywords = article.tags.map(tag => tag.trim()).filter(Boolean);
}
```

- 把 tags 也寫進 schema

最後：

```js
        jsonLd.textContent = JSON.stringify(schema, null, 2);
    }
}
```

- 把 JSON-LD 寫入 HTML

---

## 18. 讀取已核准留言：`fetchApprovedComments()`

```js
async function fetchApprovedComments(articleId) {
    const listEl = document.getElementById('comments-list');
    const countEl = document.getElementById('comment-count');
    try {
        const q = query(collection(db, 'comments'), where('articleId', '==', articleId), where('approved', '==', true));
        const querySnapshot = await getDocs(q);
```

### 這段主要功能

- 指定查詢這篇文章下所有已核准留言
- `articleId` 會對應 `currentArticleId`
- `approved == true` 表示留言已審核通過

這代表文章頁面不會直接顯示待審核留言。

---

## 19. 將留言整理成陣列並排序

```js
        let comments = [];
        querySnapshot.forEach(docSnap => {
            comments.push({ id: docSnap.id, ...docSnap.data() });
        });

        comments.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeA - timeB;
        });
```

### 功能

- 把留言資料放進陣列
- 按照時間排序
- 最早留言排前面

這樣留言列表會按時間順序顯示。

---

## 20. 計數與空白狀態

```js
        countEl.innerText = comments.length;

        if (comments.length === 0) {
            listEl.innerHTML = `<p class="text-sm text-gray-500 italic">尚無留言，趕快搶頭香吧！</p>`;
            return;
        }
```

### 功能

- 顯示留言總數
- 若沒有留言，就顯示空狀態訊息

---

## 21. 渲染留言列表

```js
        let html = '';
        comments.forEach(c => {
            const dateStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '剛剛';
            html += `
                <div class="p-4 rounded-xl bg-darkBg border border-darkBorder space-y-2">
                    <div class="flex items-center justify-between text-xs text-gray-400">
                        <span class="font-semibold text-gray-200 flex items-center space-x-1.5">
                            <i class="fa-regular fa-user text-emerald-400"></i>
                            <span>${escapeHtml(c.author)}</span>
                        </span>
                        <span>${dateStr}</span>
                    </div>
                    <p class="text-sm text-gray-300 whitespace-pre-line">${escapeHtml(c.message)}</p>
                </div>
            `;
        });

        listEl.innerHTML = html;
```

### 功能

- 產生留言卡片 HTML
- 每則留言顯示：
  - 作者
  - 留言時間
  - 留言內容

### `escapeHtml()`

- 防止留言中含有 HTML 或特殊字元被直接渲染
- 避免 XSS 問題

---

## 22. 留言新增表單：提交新留言

```js
const commentForm = document.getElementById('comment-form');
commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentArticleId) return;

    const author = document.getElementById('comment-author').value.trim();
    const message = document.getElementById('comment-message').value.trim();
    const submitBtn = document.getElementById('submit-comment-btn');
```

### 這段是訪客留言的入口

- 阻止表單預設提交行為
- 確認目前有文章 ID
- 取得作者名稱與留言內容
- 取得送出按鈕

---

## 23. 提交留言前的按鈕狀態處理

```js
    submitBtn.disabled = true;
    submitBtn.innerText = "提交中...";
```

### 功能

- 避免使用者重複提交
- 讓使用者知道目前正在送出中

---

## 24. 新增留言到 Firestore

```js
    try {
        await addDoc(collection(db, 'comments'), {
            articleId: currentArticleId,
            author: author,
            message: message,
            approved: false,
            spam: false,
            createdAt: serverTimestamp()
        });
```

### 核心欄位說明

- `articleId`：哪一篇文章的留言
- `author`：留言作者
- `message`：留言內容
- `approved`：是否已核准，預設 false
- `spam`：是否判定為垃圾留言，預設 false
- `createdAt`：建立時間

### 這表示留言並不是直接上線

這裡的留言會先被設為 `approved: false`，表示它需要後台管理員審核後才會顯示。

---

## 25. 提交成功後的回饋

```js
        showModal("留言成功", "您的留言已送出！將在管理員審核通過後顯示於網頁上。");
        commentForm.reset();
    } catch (error) {
        console.error("Error submitting comment:", error);
        showModal("錯誤", "送出留言失敗：" + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "送出留言";
    }
});
```

### 功能

- 成功時顯示成功 Modal
- 清空表單
- 失敗時顯示錯誤訊息
- 最後無論成功或失敗都重置按鈕狀態

---

## 26. 安全轉義函式：`escapeHtml()`

```js
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
```

### 功能

- 防止文章內容、留言內容或標題中的 HTML 被意外當成有效標籤執行
- 防止 XSS 攻擊

這個函式在文章頁面與後台管理頁面都很常見。

---

## 27. 整體流程總結

這份 `article.js` 的整體資料流可以概括如下：

1. 讀取網址中的 `slug`
2. 查詢 Firestore 中 `articles` 集合中對應的已發佈文章
3. 產生文章標題、日期、內容、標籤
4. 用 `marked.parse()` 將 Markdown 轉為 HTML
5. 更新 SEO meta 標籤
6. 查詢 `comments` 集合中該文章的已核准留言
7. 依時間排序後顯示在頁面上
8. 讓使用者提交新留言，預設為待審核狀態

---

## 28. 優點整理

- 文章頁面可直接根據 slug 查找資料
- 支援 Markdown 直接渲染
- 留言審核流程完整
- SEO meta 設定更完整
- 使用 `escapeHtml()` 保護前端顯示

---

## 29. 風險點

雖然這份檔案功能完整，但仍有幾個值得注意的風險：

1. 如果 Firestore rule 設定不正確，前台可讀取到不該讀的資料
2. 若留言內容未做嚴格驗證，可能會產生 XSS
3. 若文章不是 `published: true`，仍可能被查到（要靠規則鎖住）
4. 若前端沒有限制，任意使用者都可能送出留言

因此，這份檔案的安全性依然要與 Firestore Rules 一起看。

---

## 30. 結論

`article.js` 的核心價值在於：

- 它把文章內容從 Firestore 讀出來
- 把 Markdown 轉成 HTML
- 把 SEO meta 產生出來
- 把留言列表顯示出來
- 讓訪客可以提交留言

它幾乎是前台文章頁面最核心的資料渲染與互動層。

如果你要，我下一步可以再幫你補一份：

- `blog.js` 詳解
- `firebase-config.js` 詳解
- `admin.html` / `article.html` 結構解說

讓你整個專案的閱讀脈絡更完整。