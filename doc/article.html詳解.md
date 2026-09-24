# article.html 詳解

這份文件是對 `article.html` 的逐段、逐行解說，目的是讓你知道文章詳細頁是如何組成、如何接收 URL 參數、如何顯示文章內容與留言區，以及如何與 `article.js` 的資料渲染邏輯配合。

> 這份文件直接覆蓋範圍：`article.html`
>
> 補強重點：每一段 HTML 區塊都會標示「原始碼位置（行號）」與用途，方便你直接對照原始檔閱讀。

---

## 1. 檔案定位與用途

`article.html` 是文章詳細頁，負責：

- 顯示文章標題與建立時間
- 顯示文章內容（Markdown 轉 HTML）
- 顯示文章標籤
- 顯示讀者留言區
- 提交留言表單
- 載入 `article.js` 以讀取文章與留言

它通常與以下檔案搭配：

- `js/article.js`：文章內容與留言讀取邏輯
- `js/firebase-config.js`：Firebase 初始化
- `index.html`：文章列表入口

---

## 2. HTML 基本結構

原始碼位置：`article.html: 1-5`

```html
<!DOCTYPE html>
<html lang="zh-Hant" class="dark">

<head>
    <meta charset="UTF-8">
```

### 逐行解釋

#### 第 1 行：HTML5 宣告
```html
<!DOCTYPE html>
```

- 代表這是一份 HTML5 文件。

#### 第 2 行：網站語系與深色模式
```html
<html lang="zh-Hant" class="dark">
```

- `zh-Hant`：繁體中文語系。
- `dark`：預設為深色模式。

#### 第 3-5 行：head 開始
```html
<head>
    <meta charset="UTF-8">
```

- 這裡放置 metadata、樣式與腳本。

---

## 3. SEO meta 與文章相關標籤

原始碼位置：`article.html: 6-28`

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">載入中... | DevLog</title>

    <meta name="description" id="meta-description" content="閱讀 DevLog 的深度技術文章。">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" id="canonical-link" href="">
    <meta id="og-title" property="og:title" content="DevLog 科技部落格">
    <meta id="og-description" property="og:description" content="閱讀深度技術文章">
    <meta property="og:type" content="article">
    <meta id="og-url" property="og:url" content="">
    <meta property="og:site_name" content="DevLog">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="DevLog 科技部落格">
    <meta name="twitter:description" content="閱讀深度技術文章">
    <meta name="twitter:url" id="twitter-url" content="">
    <meta name="keywords" id="meta-keywords" content="">
    <meta property="article:author" content="DevLog">
    <meta property="article:section" content="技術文章">
    <meta property="article:published_time" id="article-published-time" content="">
    <meta property="article:modified_time" id="article-modified-time" content="">
```

### 逐行解釋

#### 第 6 行：viewport
```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
```

- 讓手機裝置能正確縮放畫面。

#### 第 7 行：瀏覽器標題
```html
    <title id="page-title">載入中... | DevLog</title>
```

- 文章頁的頁籤會先顯示載入中。
- `article.js` 會再更新成真正文章標題。

#### 第 9-10 行：description、robots
```html
    <meta name="description" id="meta-description" content="閱讀 DevLog 的深度技術文章。">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
```

- 描述頁面內容，方便 SEO 與分享。
- `robots` 告訴搜尋引擎這頁可被索引。

#### 第 11-27 行：Open Graph / Twitter / article metadata
```html
    <link rel="canonical" id="canonical-link" href="">
    <meta id="og-title" property="og:title" content="DevLog 科技部落格">
    <meta id="og-description" property="og:description" content="閱讀深度技術文章">
    <meta property="og:type" content="article">
    <meta id="og-url" property="og:url" content="">
    <meta property="og:site_name" content="DevLog">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="DevLog 科技部落格">
    <meta name="twitter:description" content="閱讀深度技術文章">
    <meta name="twitter:url" id="twitter-url" content="">
    <meta name="keywords" id="meta-keywords" content="">
    <meta property="article:author" content="DevLog">
    <meta property="article:section" content="技術文章">
    <meta property="article:published_time" id="article-published-time" content="">
    <meta property="article:modified_time" id="article-modified-time" content="">
```

- 這些都是文章專用 SEO 標籤。
- `article.js` 會動態更新內容，讓每篇文章都有自己的分享資訊。

---

## 4. 引入 Tailwind 與 Markdown render 套件

原始碼位置：`article.html: 29-48`

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
    <!-- Custom CSS & Markdown Parser -->
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

### 功能

- Tailwind：設計和排版。
- CSS：自訂樣式。
- Font Awesome：圖示。
- Marked：Markdown 轉 HTML。

這讓文章內容可以用 Markdown 書寫，同時在頁面中漂亮顯示出來。

---

## 5. JSON-LD 結構化文章資料

原始碼位置：`article.html: 49-64`

```html
    <script type="application/ld+json" id="article-jsonld">
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "載入中",
            "description": "閱讀 DevLog 的深度技術文章。",
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
                "@id": ""
            }
        }
        </script>
```

### 功能

- 讓搜尋引擎知道這裡是一篇文章。
- 有利於搜尋結果展示與內容理解。

`article.js` 會在渲染前把這個 JSON-LD 的內容更新成文章標題與連結。

---

## 6. Body 區塊與頁頭導覽

原始碼位置：`article.html: 66-81`

```html
<body
    class="bg-darkBg text-gray-100 min-h-screen flex flex-col justify-between selection:bg-accent selection:text-white">

    <header class="border-b border-darkBorder bg-darkCard/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="index.html" class="flex items-center space-x-2 text-xl font-bold tracking-tight text-white group">
                <div
                    class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
                    <i class="fa-solid fa-code text-sm"></i>
                </div>
                <span>Dev<span class="text-emerald-400">Log</span></span>
            </a>
            <a href="index.html"
                class="text-sm font-medium text-gray-400 hover:text-emerald-400 transition flex items-center space-x-1">
                <i class="fa-solid fa-arrow-left text-xs"></i>
                <span>返回列表</span>
            </a>
        </div>
    </header>
```

### 功能

- 建立固定頂部導航列。
- 左側是網站 Logo。
- 右側有返回列表連結。

這讓文章頁與首頁的導覽體驗保持一致。

---

## 7. 文章主內容區塊

原始碼位置：`article.html: 83-114`

```html
    <main class="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <article id="article-container"
            class="bg-darkCard border border-darkBorder rounded-2xl p-6 sm:p-10 shadow-xl mb-12">
            <div id="article-loading" class="animate-pulse space-y-6">
                <div class="h-8 bg-darkBorder rounded w-3/4"></div>
                <div class="flex space-x-4">
                    <div class="h-4 bg-darkBorder rounded w-32"></div>
                    <div class="h-4 bg-darkBorder rounded w-32"></div>
                </div>
                <div class="space-y-3 pt-6 border-t border-darkBorder">
                    <div class="h-4 bg-darkBorder rounded w-full"></div>
                    <div class="h-4 bg-darkBorder rounded w-full"></div>
                    <div class="h-4 bg-darkBorder rounded w-5/6"></div>
                </div>
            </div>

            <div id="article-content-wrapper" class="hidden">
                <h1 id="art-title" class="text-3xl sm:text-4xl font-extrabold text-white mb-4"></h1>

                <div
                    class="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-6 pb-6 border-b border-darkBorder">
                    <div class="flex items-center space-x-1">
                        <i class="fa-regular fa-calendar-plus"></i>
                        <span>建立於：<span id="art-created"></span></span>
                    </div>
                    <div class="flex items-center space-x-1" id="updated-wrapper">
                        <i class="fa-regular fa-pen-to-square"></i>
                        <span>更新於：<span id="art-updated"></span></span>
                    </div>
                    <div id="art-tags" class="flex flex-wrap gap-1.5 ml-auto"></div>
                </div>

                <div id="art-body" class="prose max-w-none text-gray-300"></div>
            </div>
        </article>
```

### 功能

- `article-loading`：文章未載入前顯示骨架動畫。
- `article-content-wrapper`：文章真正內容顯示區域。
- `art-title`：文章標題。
- `art-created`：發佈日期。
- `art-updated`：更新日期。
- `art-tags`：文章標籤。
- `art-body`：文章正文，最終會塞入 HTML。

這些元素全都會被 `article.js` 寫入內容。

---

## 8. 留言區塊

原始碼位置：`article.html: 116-149`

```html
        <!-- Comments Section -->
        <section class="bg-darkCard border border-darkBorder rounded-2xl p-6 sm:p-8 shadow-xl">
            <h3 class="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <i class="fa-regular fa-comments text-emerald-400"></i>
                <span>讀者留言 (<span id="comment-count">0</span>)</span>
            </h3>

            <form id="comment-form" class="mb-10 space-y-4 bg-darkBg/60 p-5 rounded-xl border border-darkBorder">
                <h4 class="text-sm font-semibold text-gray-300">留下您的見解 (留言需經管理員審核後顯示)</h4>
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1">您的暱稱</label>
                    <input type="text" id="comment-author" required placeholder="例如：Alex Chen"
                        class="w-full bg-darkCard border border-darkBorder rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-500 transition">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1">留言內容</label>
                    <textarea id="comment-message" rows="3" required placeholder="寫下您的想法..."
                        class="w-full bg-darkCard border border-darkBorder rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-emerald-500 transition"></textarea>
                </div>

                <button type="submit" id="submit-comment-btn"
                    class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-md">送出留言</button>
            </form>

            <div id="comments-list" class="space-y-4">
                <p class="text-sm text-gray-500 italic">尚無留言，趕快搶頭香吧！</p>
            </div>
        </section>
```

### 功能

- `comment-form`：訪客留言表單。
- `comment-author`：留言者暱稱。
- `comment-message`：留言內容。
- `comments-list`：留言區渲染容器。
- `comment-count`：留言數量。

這些元素會由 `article.js` 讀取並渲染留言。

---

## 9. Footer

原始碼位置：`article.html: 151-155`

```html
    <footer class="border-t border-darkBorder bg-darkCard/50 mt-20 py-8 text-center text-sm text-gray-500">
        <div class="max-w-4xl mx-auto px-4">
            <p>&copy; 2026 DevLog. All rights reserved.</p>
        </div>
    </footer>
```

### 功能

- 顯示頁尾資訊。
- 讓文章頁與首頁保持一致的底部視覺設計。

---

## 10. 全域提示 Modal

原始碼位置：`article.html: 157-169`

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

- 全域錯誤提示與成功提示容器。
- 例如文章不存在、留言送出成功、文章讀取失敗時會顯示。

---

## 11. Modal JavaScript

原始碼位置：`article.html: 171-178`

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

### 功能

- `showModal()`：顯示訊息。
- `closeModal()`：關閉訊息。

這與首頁的 Modal 行為相同，幫助整個網站統一使用同一種通知方式。

---

## 12. 載入 Firebase 與文章邏輯腳本

原始碼位置：`article.html: 179-180`

```html
    <script type="module" src="js/firebase-config.js"></script>
    <script type="module" src="js/article.js"></script>
```

### 功能

- `firebase-config.js`：建立 `db` 與 `auth` 物件。
- `article.js`：依照 URL `slug` 讀取文章內容與留言。

這是文章頁最關鍵的 script 載入位置。

---

## 13. 整體流程總結

`article.html` 的完整流程大致如下：

1. 網頁載入文章頁 HTML。
2. 置入 SEO meta 與 Open Graph 資訊。
3. `firebase-config.js` 初始化 Firebase。
4. `article.js` 解析 URL 中的 `slug`。
5. 讀取指定文章資料。
6. 把文章標題、日期、標籤、正文插入對應節點。
7. 讀取並渲染留言。
8. 留言表單可提交，送出後更新留言列表。

---

## 14. 一句話概括

`article.html` 是文章詳細頁的骨架：

- 提供文章內容區塊
- 提供留言區塊
- 提供 SEO/meta 區塊
- 讓 `article.js` 把資料填進各個節點

也就是說，它是文章內容渲染的容器頁。