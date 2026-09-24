# index.html 詳解

這份文件是對 `index.html` 的逐段、逐行解說，目的是讓你知道首頁的 HTML 結構、SEO 設置、搜尋欄位、文章列表容器，以及前端腳本怎麼串接 Firebase 與 `blog.js`。

> 這份文件直接覆蓋範圍：`index.html`
>
> 補強重點：每一段程式碼都會標示「原始碼位置（行號）」與用途，方便你直接對照原始檔閱讀。

---

## 1. 檔案定位與用途

`index.html` 是部落格首頁，用來展示：

- 網站標題與 SEO metadata
- 導覽列與首頁品牌區
- 文章列表區塊
- 標籤篩選器
- 分頁容器
- 全域提示 Modal
- 載入 `blog.js` 與 Firebase 初始化

它本質上是前台文章列表入口頁。

---

## 2. HTML 基本結構

原始碼位置：`index.html: 1-4`

```html
<!DOCTYPE html>
<html lang="zh-Hant" class="dark">

<head>
```

### 逐行解釋

#### 第 1 行：HTML 宣告
```html
<!DOCTYPE html>
```

- 宣告這是一份 HTML5 文件。

#### 第 2 行：語系設定
```html
<html lang="zh-Hant" class="dark">
```

- `lang="zh-Hant"`：設為繁體中文語系。
- `class="dark"`：表示整體預設為深色主題。

#### 第 3-4 行：進入 head 區塊
```html
<head>
```

- 這裡放 metadata、CSS、外部資源與腳本。

---

## 3. 頁頭：SEO 與 meta 標籤

原始碼位置：`index.html: 5-31`

```html
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevLog | 現代化技術部落格</title>

    <!-- SEO Meta Tags -->
    <meta name="description" content="探索前端開發、雲端架構、Firebase 與現代化網頁技術的深度技術文章。">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" id="canonical-link" href="">
    <meta property="og:title" content="DevLog | 現代化技術部落格">
    <meta property="og:description" content="探索前端開發、雲端架構、Firebase 與現代化網頁技術的深度技術文章。">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="DevLog">
    <meta property="og:url" id="og-url" content="">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="DevLog | 現代化技術部落格">
    <meta name="twitter:description" content="探索前端開發、雲端架構、Firebase 與現代化網頁技術的深度技術文章。">
    <meta name="twitter:url" id="twitter-url" content="">
```

### 逐行解釋

#### 第 5 行：字元編碼
```html
    <meta charset="UTF-8">
```

- 指定文字編碼為 UTF-8。
- 這樣繁體中文、emoji 等字元都能正常顯示。

#### 第 6 行：RWD viewport
```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
```

- 讓行動裝置瀏覽時，畫面寬度等於裝置寬度。
- 這是前端響應式設計的基礎。

#### 第 7 行：瀏覽器標籤名稱
```html
    <title>DevLog | 現代化技術部落格</title>
```

- 網頁標題會顯示在瀏覽器分頁上。

#### 第 9-16 行：description / robots / canonical
```html
    <meta name="description" ...>
    <meta name="robots" ...>
    <link rel="canonical" id="canonical-link" href="">
```

- `description`：搜尋引擎與社群分享的摘要。
- `robots`：告訴搜尋引擎如何抓取。
- `canonical`：指定首選網址，避免重複內容問題。

#### 第 17-23 行：Open Graph / Twitter 卡片資訊
```html
    <meta property="og:title" ...>
    <meta property="og:description" ...>
    <meta property="og:type" ...>
    <meta property="og:site_name" ...>
    <meta property="og:url" id="og-url" content="">
    <meta name="twitter:card" ...>
    <meta name="twitter:title" ...>
    <meta name="twitter:description" ...>
    <meta name="twitter:url" id="twitter-url" content="">
```

- 這些是社群平台（Facebook、Twitter、LinkedIn）分享時顯示的資訊。
- 這與 `blog.js` 裡的 `setSeoMeta()` 互相配合。

---

## 4. JSON-LD 結構化資料

原始碼位置：`index.html: 24-31`

```html
    <!-- JSON-LD Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "DevLog",
      "description": "探索前端開發、雲端架構、Firebase 與現代化網頁技術的深度技術文章。"
    }
    </script>
```

### 功能

- 這是 schema.org 結構化資料。
- 告訴搜尋引擎：這是一個部落格網站。
- 有利於 SEO 提升與搜尋結果展示。

---

## 5. 動態修正 SEO URL

原始碼位置：`index.html: 32-47`

```html
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const homeUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
            const canonicalLink = document.getElementById('canonical-link');
            const ogUrl = document.getElementById('og-url');
            const twitterUrl = document.getElementById('twitter-url');

            if (canonicalLink) canonicalLink.setAttribute('href', homeUrl);
            if (ogUrl) ogUrl.setAttribute('content', homeUrl);
            if (twitterUrl) twitterUrl.setAttribute('content', homeUrl);
        });
    </script>
```

### 逐行解釋

#### 第 32 行：註冊 DOMContentLoaded
```html
    <script>
        document.addEventListener('DOMContentLoaded', () => {
```

- 等到 DOM 載入完成後才執行。

#### 第 33 行：計算首頁 URL
```js
            const homeUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
```

- 依照目前的站點路徑組出根目錄 URL。
- 這讓網站可正常處理在子路徑環境下的 canonical 設定。

#### 第 34-36 行：抓取 SEO 元素
```js
            const canonicalLink = document.getElementById('canonical-link');
            const ogUrl = document.getElementById('og-url');
            const twitterUrl = document.getElementById('twitter-url');
```

- 這三個元素先前已經設定在 head 中。

#### 第 38-40 行：寫入真實 URL
```js
            if (canonicalLink) canonicalLink.setAttribute('href', homeUrl);
            if (ogUrl) ogUrl.setAttribute('content', homeUrl);
            if (twitterUrl) twitterUrl.setAttribute('content', homeUrl);
```

- 把首頁 URL 動態寫回 meta 標籤。

這段邏輯與 `blog.js` 的 `setSeoMeta()` 很接近，都是為 SEO 做準備。

---

## 6. 引入 Tailwind CSS

原始碼位置：`index.html: 48-61`

```html
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        darkBg: '#0d1117',
                        darkCard: '#161b22',
                        darkBorder: '#30363d',
                        accent: '#238636',
                        accentHover: '#2ea043'
                    }
                }
            }
        }
    </script>
```

### 逐行解釋

#### 第 48 行：引入 Tailwind CDN
```html
    <script src="https://cdn.tailwindcss.com"></script>
```

- 使用 Tailwind CDN 直接引入 utility classes。

#### 第 49-60 行：自訂主題色
```js
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        darkBg: '#0d1117',
                        darkCard: '#161b22',
                        darkBorder: '#30363d',
                        accent: '#238636',
                        accentHover: '#2ea043'
                    }
                }
            }
        }
```

- 設定深色模式為 class-based。
- 定義專案使用的深色調色板。

這幫助整個首頁和後台保持一致的視覺風格。

---

## 7. 引入自訂 CSS 與圖示函式庫

原始碼位置：`index.html: 62-65`

```html
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### 功能

- `css/style.css`：專案自訂樣式。
- Font Awesome：提供圖示，如 code、lock、calendar 等。

這讓整個前台頁面有更豐富的視覺表現。

---

## 8. Header 導覽列

原始碼位置：`index.html: 71-88`

```html
    <header class="border-b border-darkBorder bg-darkCard/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <a href="index.html"
                    class="flex items-center space-x-2 text-xl font-bold tracking-tight text-white group">
                    <div
                        class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
                        <i class="fa-solid fa-code text-sm"></i>
                    </div>
                    <span>Dev<span class="text-emerald-400">Log</span></span>
                </a>
            </div>
            <nav class="flex items-center space-x-4">
                <a href="index.html"
                    class="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">文章列表</a>
                <a href="admin.html"
                    class="text-sm font-medium text-gray-400 transition hover:text-gray-200 flex items-center space-x-1">
                    <i class="fa-solid fa-lock text-xs"></i>
                    <span>後台管理</span>
                </a>
            </nav>
        </div>
    </header>
```

### 功能

- 建立固定置頂的網站標頭。
- 左邊是品牌 Logo。
- 右邊有「文章列表」與「後台管理」連結。
- `backdrop-blur` 與 `sticky top-0` 讓導覽列具有現代風格。

---

## 9. 首頁 Hero 區塊

原始碼位置：`index.html: 90-100`

```html
    <main class="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <!-- Hero Banner -->
        <div
            class="mb-12 p-8 rounded-2xl bg-gradient-to-r from-darkCard to-[#1f2937] border border-darkBorder shadow-xl relative overflow-hidden">
            <div
                class="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none">
            </div>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-3">探索程式碼與雲端架構的無限可能</h1>
            <p class="text-gray-400 text-base sm:text-lg max-w-2xl">分享現代化網頁開發、Serverless 架構、Firebase 實戰經驗與工程最佳實踐。</p>
        </div>
```

### 功能

- Hero 區塊會放置網站主標題與簡單描述。
- 用深色漸層與模糊圓形裝飾，打造高級部落格風格。

---

## 10. 標籤篩選區

原始碼位置：`index.html: 102-106`

```html
        <!-- Tag Filter Section -->
        <div id="tag-filters" class="flex flex-wrap gap-2 mb-8 pb-4 border-b border-darkBorder">
            <button onclick="filterByTag('')"
                class="tag-btn active px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-600 text-white transition">全部文章</button>
        </div>
```

### 功能

- `id="tag-filters"` 是 `blog.js` 的放置點。
- `blog.js` 會在這裡動態插入各種 tag 按鈕。
- 這是首頁文章分類功能的 UI 容器。

---

## 11. 文章列表容器

原始碼位置：`index.html: 108-118`

```html
        <!-- Article List Container -->
        <div id="article-list" class="space-y-6">
            <div class="animate-pulse p-6 rounded-xl bg-darkCard border border-darkBorder">
                <div class="h-6 bg-darkBorder rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-darkBorder rounded w-1/4 mb-4"></div>
                <div class="h-4 bg-darkBorder rounded w-full mb-2"></div>
                <div class="h-4 bg-darkBorder rounded w-5/6"></div>
            </div>
        </div>
```

### 功能

- 這是文章列表的容器。
- 初始時先顯示骨架畫面（loading placeholder）。
- 當 `blog.js` 讀取 Firestore 資料後，會把實際文章插入這裡。

這是一個典型的前端載入過渡效果。

---

## 12. 分頁容器

原始碼位置：`index.html: 120-121`

```html
        <!-- Pagination Controls -->
        <div id="pagination-container" class="flex justify-center items-center space-x-4 mt-10"></div>
```

### 功能

- 這裡是分頁按鈕容器。
- `blog.js` 會在這裡生成上一頁／下一頁按鈕。
- 這是文章列表分頁的 UI 基礎。

---

## 13. Footer

原始碼位置：`index.html: 123-127`

```html
    <footer class="border-t border-darkBorder bg-darkCard/50 mt-20 py-8 text-center text-sm text-gray-500">
        <div class="max-w-5xl mx-auto px-4">
            <p>&copy; 2026 DevLog. Powered by Firebase Hosting & Firestore.</p>
        </div>
    </footer>
```

### 功能

- 設定頁腳資訊。
- 讓整個網站底部風格一致。

---

## 14. 全域提示 Modal

原始碼位置：`index.html: 129-141`

```html
    <div id="app-modal"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-darkCard border border-darkBorder rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 id="modal-title" class="text-lg font-bold text-white mb-2">提示訊息</h3>
            <p id="modal-message" class="text-gray-300 text-sm mb-6"></p>
            <div class="flex justify-end">
                <button onclick="closeModal()"
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">確定</button>
            </div>
        </div>
    </div>
```

### 功能

- 這是一個全域訊息彈窗。
- 可用來顯示成功、錯誤、提醒等訊息。
- 例如文章讀取失敗、留言送出成功、瀏覽器錯誤提示。

---

## 15. Modal 的 JavaScript

原始碼位置：`index.html: 143-150`

```html
    <script>
        function showModal(title, message) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = message;
            document.getElementById('app-modal').classList.remove('hidden');
        }
        function closeModal() {
            document.getElementById('app-modal').classList.add('hidden');
        }
    </script>
```

### 逐行解釋

#### 第 143 行：開啟腳本區塊
```html
    <script>
```

#### 第 144-147 行：`showModal()`
```js
        function showModal(title, message) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = message;
            document.getElementById('app-modal').classList.remove('hidden');
        }
```

- 設定彈窗標題與內容。
- 移除 `hidden` 類別，讓 Modal 顯示出來。

#### 第 148-150 行：`closeModal()`
```js
        function closeModal() {
            document.getElementById('app-modal').classList.add('hidden');
        }
```

- 用來關閉彈窗。

---

## 16. 載入 Firebase 與前台文章腳本

原始碼位置：`index.html: 151-152`

```html
    <script type="module" src="js/firebase-config.js"></script>
    <script type="module" src="js/blog.js"></script>
```

### 功能

- `firebase-config.js`：初始化 Firebase 與 Firestore。
- `blog.js`：首頁文章列表邏輯。

這兩個腳本的執行順序很重要：

1. 先初始化 Firebase
2. 再載入文章列表功能

否則 `blog.js` 可能無法取得 `db`。

---

## 17. 整體流程總結

`index.html` 的主要執行流程如下：

1. 網頁載入首頁 HTML
2. 加載 Tailwind、CSS、圖示與 SEO meta
3. DOM 完成後執行設定
4. `firebase-config.js` 初始化 Firebase
5. `blog.js` 從 Firestore 抓取已發表文章
6. 將文章渲染到 `#article-list`
7. 標籤篩選與分頁邏輯自動生效

---

## 18. 一句話概括

`index.html` 是整個前台部落格的入口頁面：

- 提供首頁結構
- 設定 SEO meta
- 放置文章列表與標籤容器
- 載入 Firebase 與 `blog.js`
- 最終呈現文章列表與分頁功能

---

如果你要，我下一步可以直接補：

- `generate-sitemap.mjs` 詳解
- `style.css` 詳解
- `article.html` 詳解

讓整個專案文件補齊到完整狀態。