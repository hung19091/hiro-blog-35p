# admin.html 詳解

這份文件是對 `admin.html` 的逐段與結構式解說，目的是讓你知道後台管理頁如何組合成登入區、儀表板、文章列表、留言列表、Modal 編輯器等功能區塊。

> 這份文件直接覆蓋範圍：`admin.html`
>
> 補強重點：每一段 HTML 區塊都會標示「原始碼位置（行號）」與用途，讓你能直接對照原始檔閱讀。

---

## 1. 檔案定位與用途

`admin.html` 是部落格後台管理頁面，主要負責：

- 管理者登入畫面
- 管理者登出功能
- 後台儀表板
- 文章管理列表
- 留言管理列表
- 新增／編輯文章 Modal
- Markdown 編輯器 UI

它通常會搭配：

- `js/admin.js`：後台的主要邏輯
- `css/style.css`：通用樣式
- `firebase-config.js`：Firebase 核心設定

---

## 2. HTML 基本結構

原始碼位置：`admin.html: 1-5`

```html
<!DOCTYPE html>
<html lang="zh-Hant" class="dark">
```

### 這裡代表什麼

- `lang="zh-Hant"`：指定中文繁體語系
- `class="dark"`：啟用深色主題樣式

這種寫法和 Tailwind 的 `darkMode: 'class'` 配合，是前端常用做法。

---

## 3. 頁頭：頁面標題與外部資源載入

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>後台管理系統 | DevLog</title>
    <meta name="robots" content="noindex,nofollow">
```

### 功能

- 設定編碼為 UTF-8
- 設定 viewport（RWD）
- 顯示頁面標題
- `noindex,nofollow`：避免搜尋引擎索引後台頁面

這是後台頁面常見的保護寫法。

---

## 4. 引入 Tailwind、Font Awesome、Marked

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
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

### 功能說明

#### Tailwind CSS

- 提供快速的 UI 設計能力
- 這個專案大量使用 utility classes

#### `tailwind.config`

- 設定深色模式
- 擴充自定義顏色

#### Font Awesome

- 提供圖示，例如登出、文章、留言、編輯

#### Marked

- 用來將 Markdown 轉為 HTML
- 這跟 `admin.js` 裡的 Markdown preview 一致

---

## 5. 自訂 CSS：Markdown 編輯器樣式

```html
    <style>
        .editor-shell {
            border: 1px solid rgba(48, 54, 61, 1);
            border-radius: 0.875rem;
            background: rgba(13, 17, 23, 0.9);
            overflow: hidden;
        }
```

### 這段是做什麼

這裡是後台文章編輯器的 UI 樣式定義，包含：

- 編輯區外框
- 工具列背景
- 預覽區樣式
- Markdown 標題、引用、列表、程式碼區塊樣式

例如：

```css
.editor-preview h1,
.editor-preview h2,
.editor-preview h3,
.editor-preview h4 {
    color: white;
    font-weight: 700;
    margin-top: 1.25rem;
    margin-bottom: 0.75rem;
}
```

這讓 Markdown 預覽不會像原始文字那樣難看，而是有文章排版效果。

---

## 6. Body 主要結構

```html
<body
    class="bg-darkBg text-gray-100 min-h-screen flex flex-col justify-between selection:bg-accent selection:text-white">
```

### 功能

- 設定整體深色主題
- 設定最小高度
- 設定選取文字顏色

這讓整個後台頁面有一致的視覺設計。

---

## 7. 頁頭導航：Header

```html
    <header class="border-b border-darkBorder bg-darkCard/80 backdrop-blur sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="index.html" class="flex items-center space-x-2 text-xl font-bold tracking-tight text-white group">
                <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
                    <i class="fa-solid fa-shield-halved text-sm"></i>
                </div>
                <span>DevLog <span class="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-700/50">Admin</span></span>
            </a>
            <div id="user-nav-area" class="hidden items-center space-x-4">
                <span id="user-email" class="text-xs text-gray-400 font-mono"></span>
                <button id="logout-btn" ...>登出系統</button>
            </div>
        </div>
    </header>
```

### 這段代表什麼

- 打造後台頁的頭部
- 左邊顯示品牌 Logo
- 右邊顯示使用者 email 與登出按鈕

#### 特別重要的點
```html
<div id="user-nav-area" class="hidden ...">
```

- 一開始是隱藏的
- 只有登入成功後，`admin.js` 才會移除 `hidden`

這是典型的登入狀態 UI 控制。

---

## 8. 登入區塊：`login-section`

```html
        <div id="login-section"
            class="max-w-md mx-auto mt-16 bg-darkCard border border-darkBorder rounded-2xl p-8 shadow-2xl">
            <div class="text-center mb-8">
                <div class="w-12 h-12 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-emerald-400 text-lg">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <h1 class="text-2xl font-bold text-white">管理者登入</h1>
                <p class="text-gray-400 text-xs mt-1">請輸入 Firebase Authentication 帳號密碼</p>
            </div>

            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-xs font-medium text-gray-300 mb-1">管理者 Email</label>
                    <input type="email" id="login-email" required placeholder="admin@example.com" ...>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-300 mb-1">密碼</label>
                    <input type="password" id="login-password" required placeholder="••••••••" ...>
                </div>
                <button type="submit" id="login-btn" ...>登入後台</button>
            </form>
        </div>
```

### 功能

- 這是後台的登入入口
- 使用者輸入 email 與 password
- 點擊提交後由 `admin.js` 的 `login-form` 事件處理

### 重要屬性

```html
id="login-form"
id="login-email"
id="login-password"
id="login-btn"
```

這些都會被 `admin.js` 直接取用。

---

## 9. 儀表板區塊：`dashboard-section`

```html
        <div id="dashboard-section" class="hidden space-y-10">
```

### 功能

- 這是登入後才會顯示的後台內容區塊
- 一開始設為 `hidden`
- `admin.js` 會在登入成功後移除 `hidden`

這是典型的權限後端 UI 控制方式。

---

## 10. 後台分頁切換：文章管理與留言審核

```html
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-darkBorder">
                <div class="flex space-x-2">
                    <button onclick="switchTab('articles')" id="tab-articles-btn" ...>文章管理</button>
                    <button onclick="switchTab('comments')" id="tab-comments-btn" ...>留言審核</button>
                </div>
                <button onclick="openArticleModal()" id="new-article-btn" ...>新增文章</button>
            </div>
```

### 功能

- 這裡是後台的標籤切換區
- 文章管理與留言審核可以切換
- 右側有「新增文章」按鈕

這代表後台是多分頁式 UI，但實際上是同一頁內切換不同 panel。

---

## 11. 文章管理面板

```html
            <div id="panel-articles" class="space-y-4">
                <div class="bg-darkCard border border-darkBorder rounded-2xl overflow-hidden shadow-xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-darkBorder bg-darkBg/50 text-xs text-gray-400 uppercase tracking-wider">
                                    <th class="p-4">標題 / 摘要</th>
                                    <th class="p-4">標籤</th>
                                    <th class="p-4">狀態</th>
                                    <th class="p-4">建立日期</th>
                                    <th class="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody id="admin-articles-list" class="divide-y divide-darkBorder text-sm"></tbody>
                        </table>
                    </div>
                </div>
            </div>
```

### 功能

- 建立文章列表表格
- 這個 `tbody` 內容會由 `admin.js` 動態插入
- 例如：文章標題、標籤、發佈狀態、時間、操作按鈕

#### 重要 ID

```html
id="admin-articles-list"
```

這個 ID 會在 `fetchAdminArticles()` 裡被讀取並填入資料。

---

## 12. 留言審核面板

```html
            <div id="panel-comments" class="hidden space-y-4">
                <div class="bg-darkCard border border-darkBorder rounded-2xl overflow-hidden shadow-xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-darkBorder bg-darkBg/50 text-xs text-gray-400 uppercase tracking-wider">
                                    <th class="p-4">作者</th>
                                    <th class="p-4">留言內容</th>
                                    <th class="p-4">狀態</th>
                                    <th class="p-4">時間</th>
                                    <th class="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody id="admin-comments-list" class="divide-y divide-darkBorder text-sm"></tbody>
                        </table>
                    </div>
                </div>
            </div>
```

### 功能

- 顯示所有留言
- 可核准、取消核准、刪除留言

#### 重要 ID

```html
id="admin-comments-list"
```

這個 ID 會在 `fetchAdminComments()` 裡被填入資料。

---

## 13. 新增／編輯文章 Modal

這個區塊是文章新增與編輯的核心表單：

```html
        <div id="article-modal" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-darkCard border border-darkBorder rounded-2xl shadow-2xl w-full max-w-4xl">
                <div class="flex items-center justify-between px-6 py-4 border-b border-darkBorder">
                    <h2 id="article-modal-title" class="text-lg font-bold text-white">新增文章</h2>
                    <button onclick="closeArticleModal()" class="text-gray-400 hover:text-white transition">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
```

### 功能

- 這是一個浮層視窗
- 管理者可以在這裡新增文章或編輯文章
- 內容採用 Markdown 編輯器

---

## 14. 文章 Modal 表單欄位

```html
                <form id="article-form" class="p-6 space-y-5">
                    <input type="hidden" id="art-edit-id">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-medium text-gray-300 mb-1">文章標題</label>
                            <input type="text" id="form-title" required ...>
                        </div>
                        <div>
                            <label ...>文章 Slug</label>
                            <input type="text" id="form-slug" required ...>
                        </div>
                    </div>
```

### 這裡的幾個重要欄位

- `art-edit-id`：如果是編輯模式，會存文章 ID
- `form-title`：文章標題
- `form-slug`：網址 slug
- `form-summary`：文章摘要
- `form-tags`：標籤（逗號分隔）
- `form-published`：發布狀態勾選框
- `form-content`：Markdown 內容

這允許管理者在一個 Modal 內直接完成文章編輯。

---

## 15. Markdown 編輯器 UI

```html
                    <div class="editor-shell">
                        <div class="editor-toolbar">
                            <button type="button" data-editor-action="h1" class="editor-tool">H1</button>
                            <button type="button" data-editor-action="h2" class="editor-tool">H2</button>
                            <button type="button" data-editor-action="bold" class="editor-tool">Bold</button>
                            <button type="button" data-editor-action="italic" class="editor-tool">Italic</button>
                            <button type="button" data-editor-action="quote" class="editor-tool">Quote</button>
                            <button type="button" data-editor-action="code" class="editor-tool">Code</button>
                            <button type="button" data-editor-action="unordered-list" class="editor-tool">List</button>
                            <button type="button" data-editor-action="ordered-list" class="editor-tool">Number</button>
                            <button type="button" data-editor-action="link" class="editor-tool">Link</button>
                            <button type="button" data-editor-action="image" class="editor-tool">Image</button>
                            <button type="button" id="editor-preview-toggle" class="editor-tool editor-tool--ghost">預覽</button>
                        </div>
                        <div id="editor-body" class="editor-body">
                            <textarea id="form-content" ...></textarea>
                            <div id="editor-preview" class="editor-preview"></div>
                        </div>
                    </div>
```

### 功能

- 自動產生 Markdown 工具列
- 提供常用格式工具：
  - H1 / H2
  - 粗體、斜體
  - 引用、程式碼
  - 清單
  - Link、Image
- `editor-preview-toggle` 可切換編輯與預覽模式

這是文章撰寫體驗的重要 UI。

---

## 16. 儲存與關閉按鈕

```html
                    <div class="flex justify-end space-x-3 pt-2">
                        <button type="button" onclick="closeArticleModal()" ...>取消</button>
                        <button type="submit" ...>儲存文章</button>
                    </div>
                </form>
            </div>
        </div>
```

### 功能

- 取消：關閉 Modal
- 儲存：提交 `article-form` 表單

這和 `admin.js` 的 `article-form` `submit` 事件配合，完成新增／更新邏輯。

---

## 17. 這份 HTML 與 JS 的關聯

`admin.html` 的大量元素都是靠 `admin.js` 來操作，例如：

- `login-form`：登入
- `login-email`：登入 email
- `login-password`：登入 password
- `user-email`：顯示使用者 email
- `admin-articles-list`：文章列表容器
- `admin-comments-list`：留言列表容器
- `article-form`：文章新增／編輯表單
- `form-content`：Markdown 編輯 textarea
- `editor-preview-toggle`：預覽切換

也就是說：

- HTML 提供 UI 節點
- JS 負責綁定事件與資料載入

這是典型的前端分工方式。

---

## 18. 這份頁面的優點

- 直觀的後台介面
- 一頁式的文章/留言管理
- 內嵌 Markdown 編輯器
- 員工操作流程單一化
- 與 Firebase auth / firestore 無縫整合

---

## 19. 這份頁面的設計概念

這份頁面重點不是單純 HTML，而是把管理任務集中在一個後台頁面內：

- 登入
- 管理文章
- 管理留言
- 編輯文章

這種設計讓管理者的工作流很短，適合部落格型專案。

---

## 20. 這份頁面的風險點

雖然 UI 很完整，但安全性還是要依賴：

- Firebase Authentication
- Firestore Security Rules
- 前端權限判斷

原因是 HTML 本身不具備權限保護能力；真正的安全邊界仍然在後端規則與 Firebase 的驗證機制。

---

## 21. 一句話概括

`admin.html` 就是後台管理頁面的骨架：

- 登入卡片
- 文章列表
- 留言審核
- 新增／編輯文章 Modal
- Markdown 編輯器

它是後台功能的 UI 容器，而資料邏輯則交給 `admin.js` 處理。

---

如果你要，我下一步可以再幫你整理：

- `admin.html` 與 `admin.js` 的整體流程圖
- `admin.js` + `admin.html` 綜合解說
- `index.html` 與文章頁面的整體互動架構

這樣整個專案的閱讀脈絡會更清楚。