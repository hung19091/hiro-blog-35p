# admin.js 詳解

這份文件是對 `admin.js` 的逐段、逐行解說，目的是讓你知道每一段程式碼在做什麼，以及它如何配合 Firebase、Firestore 與後台頁面共同運作。

> 這份文件直接覆蓋範圍：`js/admin.js`
>
> 補強重點：每一段程式碼都會標示「原始碼位置（行號）」與用途，讓你能直接對照原始檔閱讀。

---

## 1. 檔案定位與整體用途

`admin.js` 是後台管理頁的核心邏輯檔案，主要負責：

- Firebase Authentication 登入／登出
- 監聽登入狀態
- 文章新增、編輯、刪除、刪除、發佈與下架
- 留言審核與刪除
- Markdown 編輯器與即時預覽
- 後台畫面切換與 Modal 控制

它通常會搭配：

- `admin.html`：後台 UI
- `firebase-config.js`：Firebase 初始設定，提供 `auth` 和 `db`
- Firestore 集合：`articles`、`comments`

---

## 2. 檔案最上方：匯入 Firebase 相關模組

原始碼位置：`js/admin.js: 1-3`

```js
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

### 逐行解釋

#### 第 1 行
```js
import { auth, db } from './firebase-config.js';
```

- 從 `firebase-config.js` 匯入 Firebase 的 `auth` 物件與 `db` 物件。
- `auth`：負責登入、登出、驗證使用者
- `db`：Firestore 資料庫實例，負責讀寫文章與留言

#### 第 2 行
```js
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
```

- 匯入 Firebase Auth 的功能：
  - `signInWithEmailAndPassword`：使用 email + password 登入
  - `signOut`：登出
  - `onAuthStateChanged`：監聽登入狀態變化

#### 第 3 行
```js
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
```

- 匯入 Firestore 的 CRUD 相關函式：
  - `collection`：取得特定集合
  - `getDocs`：查詢集合內全部文件
  - `getDoc`：查詢單一文件
  - `addDoc`：新增文件
  - `updateDoc`：更新文件
  - `deleteDoc`：刪除文件
  - `doc`：建立文件參照
  - `serverTimestamp`：產生後端伺服器時間

這些函式是整個後台操作的核心。

---

## 3. 全域變數：保存當前使用者與資料快取

```js
let currentUser = null;
let articlesCache = [];
let commentsCache = [];
```

### 逐行解釋

#### `currentUser`
```js
let currentUser = null;
```

- 這個變數用來保存目前已登入的使用者。
- 當 `onAuthStateChanged` 觸發時，會把目前使用者塞進這個變數。

#### `articlesCache`
```js
let articlesCache = [];
```

- 用來快取文章列表資料。
- 這樣後台在操作文章時，不必每次重新讀取整份文章資料。

#### `commentsCache`
```js
let commentsCache = [];
```

- 用來快取留言列表。
- 例如核准留言、取消核准、刪除留言後，可以更新快取再重繪畫面。

---

## 4. Markdown 編輯器工具列：定義按鈕功能

```js
const editorActions = {
    h1() { return applyEditorFormat('heading', '# ', '標題'); },
    h2() { return applyEditorFormat('heading', '## ', '副標題'); },
    bold() { return applyEditorFormat('wrapper', '**', '粗體文字'); },
    italic() { return applyEditorFormat('wrapper', '*', '斜體文字'); },
    quote() { return applyEditorFormat('block', '> ', '引用內容'); },
    code() { return applyEditorFormat('block', '```\n', '\n```'); },
    'unordered-list'() { return applyEditorFormat('list', '- ', '列表項目'); },
    'ordered-list'() { return applyEditorFormat('list', '1. ', '列表項目'); },
    link() { return applyEditorFormat('wrapper', '[', '](https://example.com)'); },
    image() { return applyEditorFormat('wrapper', '![', '](https://example.com/image.jpg)'); }
};
```

### 這段的意義

這裡定義了一組「編輯器工具按鈕行為」。

例如：

- `h1()`：插入 `# ` 標題語法
- `bold()`：包住選取內容，變成 `**粗體**`
- `link()`：包成 `[文字](https://example.com)`
- `image()`：包成 `![圖片](https://example.com/image.jpg)`

### 為什麼這樣寫？

因為每個按鈕都共用同一個格式插入函式：
```js
applyEditorFormat()
```

這讓程式碼架構更簡潔，新增工具時只要加一個新的 key 即可。

---

## 5. 初始化 Markdown 編輯器

```js
function initialiseArticleEditor() {
    const textarea = document.getElementById('form-content');
    const preview = document.getElementById('editor-preview');
    const toggleBtn = document.getElementById('editor-preview-toggle');

    if (!textarea || !preview || !toggleBtn) return;
```

### 目的

- 找到文章編輯區 textarea
- 找到預覽區 DOM
- 找到切換編輯／預覽的按鈕

如果頁面裡沒有這些元素，就直接跳出，不會出錯。

---

## 6. 預覽功能：即時渲染 Markdown

```js
    const renderPreview = () => {
        if (typeof marked !== 'undefined') {
            preview.innerHTML = marked.parse(textarea.value || '');
        } else {
            preview.innerHTML = '<p class="text-sm text-amber-300">Markdown preview unavailable.</p>';
        }
    };
```

### 功能說明

- `textarea.value` 是使用者寫的 Markdown
- `marked.parse()` 會把 Markdown 轉成 HTML
- 最後設定到預覽區 `preview.innerHTML`

### 這段很重要

它讓使用者在編輯文章時可以直接看到最終效果，像 GitHub 上的 Markdown 展示。

---

## 7. 切換「編輯」與「預覽」模式

```js
    const togglePreview = (showPreview) => {
        const editorBody = document.getElementById('editor-body');
        const isPreview = !!showPreview;

        if (!editorBody) return;
        preview.classList.toggle('active', isPreview);
        textarea.style.display = isPreview ? 'none' : 'block';
        toggleBtn.textContent = isPreview ? '編輯' : '預覽';
        toggleBtn.dataset.editorMode = isPreview ? 'preview' : 'write';
        editorBody.classList.toggle('preview-mode', isPreview);

        if (isPreview) {
            renderPreview();
        }
    };
```

### 這裡做了什麼

- 判斷現在要顯示「預覽」還是「編輯」
- `textarea` 會隱藏或顯示
- `preview` 會切換 active 狀態
- 按鈕文字會變成「編輯」或「預覽」
- 這些設定會改變 CSS 顯示效果

### 效果

使用者可以在同一個元件中切換：

- 寫 Markdown
- 看即時預覽

---

## 8. 綁定事件：讓套用功能真正生效

```js
    toggleBtn.addEventListener('click', () => {
        const nextMode = toggleBtn.dataset.editorMode === 'preview' ? 'write' : 'preview';
        togglePreview(nextMode === 'preview');
    });

    textarea.addEventListener('input', renderPreview);
    textarea.addEventListener('keyup', renderPreview);

    document.querySelectorAll('[data-editor-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.editorAction;
            if (editorActions[action]) {
                editorActions[action]();
            }
        });
    });
```

### 逐段分析

#### `toggleBtn.addEventListener('click', ...)`

- 當使用者點擊切換按鈕時
- 判斷目前 mode 是 `preview` 還是 `write`
- 然後切換成相反模式

#### `textarea.addEventListener('input', renderPreview)`

- 當使用者輸入文字時
- 立即重新渲染預覽區

#### `document.querySelectorAll('[data-editor-action]')`

- 找到所有工具列按鈕
- 例如 h1、bold、link
- 點擊時呼叫相對應的 `editorActions[action]`

這樣做讓工具列可擴充，而且很乾淨。

---

## 9. `applyEditorFormat()`：插入 Markdown 格式

```js
function applyEditorFormat(type, prefix, suffix) {
    const textarea = document.getElementById('form-content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || '文字';
    let insertText = '';
```

### 這段主要做什麼

- 取得目前textarea
- 取得使用者選中的字串
- 根據不同格式類型，拼接不同 Markdown 語法

### 其中幾個關鍵變數

- `start`：滑鼠選取起點
- `end`：滑鼠選取終點
- `selected`：當前選取內容

如果沒有選取內容，就用預設字串 `'文字'`。

---

## 10. 不同格式處理邏輯

```js
    if (type === 'heading') {
        insertText = `${prefix}${selected}`;
    } else if (type === 'wrapper') {
        insertText = `${prefix}${selected}${suffix}`;
    } else if (type === 'block') {
        insertText = `${prefix}${selected}${suffix || ''}`;
    } else if (type === 'list') {
        const lines = selected ? selected.split('\n').map(line => line.trim() || '項目') : ['項目'];
        insertText = lines.map((line) => `${prefix}${line}`).join('\n');
    }
```

### 判斷分支說明

#### heading
```js
if (type === 'heading') {
    insertText = `${prefix}${selected}`;
}
```

- 適合寫標題
- 例如：`# text`、`## text`

#### wrapper
```js
else if (type === 'wrapper') {
    insertText = `${prefix}${selected}${suffix}`;
}
```

- 將選取文字包起來
- 例如粗體：`**文字**`
- 例如連結：`[文字](https://example.com)`

#### block
```js
else if (type === 'block') {
    insertText = `${prefix}${selected}${suffix || ''}`;
}
```

- 適合引用、程式碼區塊等
- 例如引用：`> 內容`
- 例如程式碼：```` ``` 
內容
``` ````

#### list
```js
else if (type === 'list') {
    const lines = selected ? selected.split('\n').map(line => line.trim() || '項目') : ['項目'];
    insertText = lines.map((line) => `${prefix}${line}`).join('\n');
}
```

- 判斷所選內容是否多行
- 每一行都前面加上 `- ` 或 `1. `

---

## 11. 寫回 textarea，並更新游標位置

```js
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = `${before}${insertText}${after}`;
    const cursorStart = start + insertText.length;
    textarea.focus();
    textarea.setSelectionRange(start, cursorStart);
```

### 這段做了什麼

- `before`：原先游標前的內容
- `after`：原先游標後的內容
- 最後把插入的 Markdown 文字放進去
- 游標位置會移到插入內容的後面

這樣操作使用者感覺很自然，不會被打亂編輯流。

---

## 12. 預覽同步更新

```js
    const preview = document.getElementById('editor-preview');
    if (preview && preview.classList.contains('active')) {
        preview.innerHTML = marked.parse(textarea.value || '');
    }
}
```

### 這段意義

- 如果目前正在預覽模式
- 就立即重新渲染 Markdown 結果

這讓使用者在「預覽模式」時，會看到最新內容。

---

## 13. Firebase Auth 登入狀態監聽

```js
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const userNavArea = document.getElementById('user-nav-area');
    const userEmailSpan = document.getElementById('user-email');

    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        userNavArea.classList.remove('hidden');
        userNavArea.classList.add('flex');
        userEmailSpan.innerText = user.email;

        loadAdminData();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        userNavArea.classList.add('hidden');
        userNavArea.classList.remove('flex');
    }
});
```

### 核心邏輯

#### `onAuthStateChanged(auth, callback)`

- 這是 Firebase 的常用 API
- 會在登入／登出狀態改變時自動觸發

#### 如果使用者已登入
```js
if (user) {
```

- 隱藏登入區塊
- 顯示管理後台區塊
- 顯示使用者 email
- 呼叫 `loadAdminData()` 載入文章與留言

#### 如果使用者未登入
```js
else {
```

- 顯示登入頁面
- 隱藏管理後台

這讓前端根據登入狀態切換頁面。

---

## 14. 登入表單事件：登入後台

```js
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerText = "登入中...";

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        showModal("登入失敗", "帳號或密碼錯誤，請重新確認（" + error.message + "）。");
    } finally {
        btn.disabled = false;
        btn.innerText = "登入後台";
    }
});
```

### 流程說明

1. 阻止表單預設提交
2. 讀取 email 與 password
3. 按鈕設為 disabled，避免重複點擊
4. 呼叫 `signInWithEmailAndPassword(auth, email, password)`
5. 成功登入後由 `onAuthStateChanged` 處理畫面切換
6. 若失敗，顯示錯誤 Modal

### 這是後台登入的進入點

從這裡開始，整個管理後台系統才真正啟動。

---

## 15. 登出功能

```js
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
});
```

### 功能

- 使用者點擊登出按鈕
- 呼叫 `signOut(auth)`
- Firebase 會清除當前登入 session
- 然後由 `onAuthStateChanged` 自動切回登入畫面

---

## 16. 載入後台資料：`loadAdminData()`

```js
async function loadAdminData() {
    await fetchAdminArticles();
    await fetchAdminComments();
}
```

### 功能

- 一進入後台，就同步載入文章與留言
- 兩個整合成一個流程

這裡是後台資料初始化入口。

---

## 17. 文章列表讀取：`fetchAdminArticles()`

```js
async function fetchAdminArticles() {
    const tbody = document.getElementById('admin-articles-list');
    try {
        const querySnapshot = await getDocs(collection(db, 'articles'));
        articlesCache = [];
        querySnapshot.forEach(docSnap => {
            articlesCache.push({ id: docSnap.id, ...docSnap.data() });
        });
```

### 逐行解釋

#### `const tbody = document.getElementById('admin-articles-list');`

- 找到文章列表的 table body

#### `getDocs(collection(db, 'articles'))`

- 從 Firestore 取得 `articles` 集合中的所有文件
- 這會拿到所有文章資料

#### `querySnapshot.forEach(...)`

- 將每一篇資料整理成：
```js
{ id: docSnap.id, ...docSnap.data() }
```
- `id` 是文件 ID
- `...docSnap.data()` 是文件內容

#### `articlesCache = []`

- 清空快取，再重建

這樣可以保證資料是最新的。

---

## 18. 文章排序

```js
        articlesCache.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });
```

### 功能

- 依照 `createdAt` 由新到舊排序
- 也就是最新文章放在最前面

### 特別注意

這裡使用了可選鏈：
```js
a.createdAt?.toMillis
```

這表示如果 `createdAt` 不存在，就不會報錯。

---

## 19. 若文章列表是空的，顯示提示

```js
        if (articlesCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">尚無任何文章。</td></tr>`;
            return;
        }
```

### 功能

- 如果沒有文章，就顯示空狀態
- 例如「尚無任何文章」

---

## 20. 動態渲染文章表格

```js
        let html = '';
        articlesCache.forEach(art => {
            const dateStr = art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : '剛剛';
            const statusBadge = art.published
                ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">已發佈</span>`
                : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50">草稿</span>`;

            const tagsStr = art.tags ? art.tags.join(', ') : '';

            html += `
                <tr class="hover:bg-darkBg/40 transition">
                    <td class="p-4 max-w-xs">
                        <div class="font-bold text-white truncate">${escapeHtml(art.title)}</div>
                        <div class="text-xs text-gray-400 truncate">${escapeHtml(art.summary)}</div>
                    </td>
                    <td class="p-4 text-xs text-gray-300">${escapeHtml(tagsStr)}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-xs text-gray-400">${dateStr}</td>
                    <td class="p-4 text-right space-x-2">
                        <button onclick="editArticle('${art.id}')" ...>...</button>
                        <button onclick="togglePublish('${art.id}', ${!art.published})" ...>...</button>
                        <button onclick="deleteArticle('${art.id}')" ...>...</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
```

### 功能

- 每篇文章會轉成一列 table row
- 顯示標題、摘要、標籤、狀態、時間
- 右側有三個按鈕：
  - 編輯
  - 發佈／下架
  - 刪除

### `escapeHtml()`

這個函數會把字串轉義，避免 XSS 攻擊。

例如：
- `<script>` 轉成 `&lt;script&gt;`

這是安全重要部分。

---

## 21. 錯誤處理：讀取文章失敗

```js
    } catch (error) {
        console.error("Error loading articles:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-400">載入文章失敗：${escapeHtml(error.message)}</td></tr>`;
    }
}
```

### 功能

- 如果讀取 Firestore 失敗，就顯示錯誤訊息在表格中
- 做好使用者體驗

---

## 22. 留言列表讀取：`fetchAdminComments()`

```js
async function fetchAdminComments() {
    const tbody = document.getElementById('admin-comments-list');
    try {
        const querySnapshot = await getDocs(collection(db, 'comments'));
        commentsCache = [];
        querySnapshot.forEach(docSnap => {
            commentsCache.push({ id: docSnap.id, ...docSnap.data() });
        });
```

### 行為與文章列表完全相似

- 讀取 `comments` 集合
- 組成 `commentsCache`
- 依時間排序
- 顯示留言表格

---

## 23. 留言狀態顯示

```js
            const statusBadge = c.approved
                ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">已核准</span>`
                : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/50">待審核</span>`;
```

### 功能

- 若 `approved === true`，顯示已核准
- 若為 false，顯示待審核

---

## 24. 留言操作按鈕：核准與刪除

```js
                        ${!c.approved ? `<button onclick="approveComment('${c.id}', true)" ...>核准</button>` : `<button onclick="approveComment('${c.id}', false)" ...>取消核准</button>`}
                        <button onclick="deleteComment('${c.id}')" ...>刪除</button>
```

### 功能

- 若留言未核准：顯示「核准」按鈕
- 若已核准：顯示「取消核准」按鈕
- 右邊還有刪除

這讓管理者可以直接在後台處理留言審核。

---

## 25. 新增／編輯文章 Modal：`openArticleModal()`

```js
window.openArticleModal = function (artId = null) {
    const toggleBtn = document.getElementById('editor-preview-toggle');
    const textarea = document.getElementById('form-content');
    const preview = document.getElementById('editor-preview');

    document.getElementById('art-edit-id').value = '';
    document.getElementById('form-title').value = '';
    document.getElementById('form-slug').value = '';
    document.getElementById('form-summary').value = '';
    document.getElementById('form-tags').value = '';
    textarea.value = '';
    document.getElementById('form-published').checked = false;
    document.getElementById('article-modal-title').innerText = '新增文章';
```

### 功能

- 打開新增文章 Modal
- 清空所有欄位
- 設定標題為「新增文章」

若是編輯文章：

```js
    if (artId) {
        const art = articlesCache.find(a => a.id === artId);
        if (art) {
            document.getElementById('art-edit-id').value = art.id;
            document.getElementById('form-title').value = art.title || '';
            document.getElementById('form-slug').value = art.slug || '';
            document.getElementById('form-summary').value = art.summary || '';
            document.getElementById('form-tags').value = art.tags ? art.tags.join(', ') : '';
            textarea.value = art.content || '';
            document.getElementById('form-published').checked = !!art.published;
            document.getElementById('article-modal-title').innerText = '編輯文章';
        }
    }
```

### 這段之後的重點

- 將原本文章資料填回表單
- 讓管理者直接編輯

---

## 26. 關閉 Modal

```js
window.closeArticleModal = function () {
    document.getElementById('article-modal').classList.add('hidden');
}
```

### 功能

- 點擊取消時關閉 Modal

---

## 27. 提交文章表單：新增或更新文章

```js
document.getElementById('article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('art-edit-id').value;
    const title = document.getElementById('form-title').value.trim();
    const slug = document.getElementById('form-slug').value.trim();
    const summary = document.getElementById('form-summary').value.trim();
    const tagsRaw = document.getElementById('form-tags').value;
    const content = document.getElementById('form-content').value;
    const published = document.getElementById('form-published').checked;

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

    const articleData = {
        title,
        slug,
        summary,
        tags,
        content,
        published,
        updatedAt: serverTimestamp()
    };
```

### 這段是文章儲存的核心

- 先取得欄位資訊
- 把標籤字串切成陣列
- 組裝成 articleData
- `serverTimestamp()` 表示使用後端時間

---

## 28. 新增或更新資料庫文件

```js
    try {
        if (editId) {
            await updateDoc(doc(db, 'articles', editId), articleData);
            showModal("成功", "文章更新成功！");
        } else {
            articleData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'articles'), articleData);
            showModal("成功", "文章新增成功！");
        }

        closeArticleModal();
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error saving article:", error);
        showModal("錯誤", "儲存文章失敗：" + error.message);
    }
});
```

### 分析

#### 如果 `editId` 存在
```js
await updateDoc(doc(db, 'articles', editId), articleData);
```

- 表示這是編輯文章
- 直接更新指定文件

#### 如果沒有 `editId`
```js
articleData.createdAt = serverTimestamp();
await addDoc(collection(db, 'articles'), articleData);
```

- 表示這是新文章
- 建立新的 document
- 設定建立時間

#### 最後
```js
closeArticleModal();
await fetchAdminArticles();
```

- 關閉 Modal
- 重新讀取文章列表

---

## 29. 發布／下架文章：`togglePublish()`

```js
window.togglePublish = async function (id, publishedState) {
    try {
        await updateDoc(doc(db, 'articles', id), {
            published: publishedState,
            updatedAt: serverTimestamp()
        });
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error toggling publish state:", error);
        showModal("錯誤", "更新發佈狀態失敗：" + error.message);
    }
}
```

### 功能

- 這是文章發佈／下架切換的核心
- 直接更新 `published` 欄位
- `publishedState` 可能是 `true` 或 `false`

例如：

- 由 true 變 false：下架
- 由 false 變 true：發佈

---

## 30. 刪除文章：`deleteArticle()`

```js
window.deleteArticle = async function (id) {
    if (!confirm("確定要刪除這篇文章嗎？此動作無法復原。")) return;
    try {
        await deleteDoc(doc(db, 'articles', id));
        await fetchAdminArticles();
    } catch (error) {
        console.error("Error deleting article:", error);
        showModal("錯誤", "刪除文章失敗：" + error.message);
    }
}
```

### 功能

- 用 `confirm()` 做確認
- 如果使用者點擊取消，就直接 return
- 如果確認，就刪除文章

這樣能避免誤刪。

---

## 31. 核准／取消核准留言：`approveComment()`

```js
window.approveComment = async function (id, status) {
    try {
        await updateDoc(doc(db, 'comments', id), { approved: status });
        await fetchAdminComments();
    } catch (error) {
        console.error("Error updating comment status:", error);
        showModal("錯誤", "更新留言狀態失敗：" + error.message);
    }
}
```

### 功能

- 更新 `comments/{id}` 的 `approved` 欄位
- `status` 可能是 true 或 false

這讓留言審核流程非常簡單。

---

## 32. 刪除留言：`deleteComment()`

```js
window.deleteComment = async function (id) {
    if (!confirm("確定要刪除這則留言嗎？")) return;
    try {
        await deleteDoc(doc(db, 'comments', id));
        await fetchAdminComments();
    } catch (error) {
        console.error("Error deleting comment:", error);
        showModal("錯誤", "刪除留言失敗：" + error.message);
    }
}
```

### 功能

- 提供留言刪除功能
- 使用 confirm 讓使用者二次確認
- 刪除後重新整理留言列表

---

## 33. XSS 防護：`escapeHtml()`

```js
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
```

### 在這個檔案中的重要性

文章標題、摘要、留言內容都會被直接插入 HTML。若不轉義，就可能造成：

- HTML 注入
- JavaScript 注入
- XSS 攻擊

這個函數會將：

- `&` 轉成 `&amp;`
- `<` 轉成 `&lt;`
- `>` 轉成 `&gt;`
- `"` 轉成 `&quot;`
- `'` 轉成 `&#039;`

這是一個很重要的安全措施。

---

## 34. 總結：整份程式的主流程

整個 `admin.js` 的執行順序大概是：

1. 匯入 Firebase Auth + Firestore
2. 註冊登入狀態監聽
3. 使用者登入後，顯示後台
4. 載入文章與留言列表
5. 管理者可新增、編輯、發佈、刪除文章
6. 管理者可審核、刪除留言
7. 所有 UI 操作都對應到 Firestore CRUD

---

## 35. 這份程式的優點

- 架構清楚：前後端分離合理
- 功能集中：文章與留言管理邏輯聚合
- 使用 Firebase 內建 API，開發效率高
- 支援 Markdown 編輯器
- 有基本安全處理（escapeHtml）

---

## 36. 這份程式的風險點

雖然這份程式已經有基本功能，但仍然有幾個值得重視的地方：

1. 權限控制依賴前端與規則設定
2. 若 Firestore rules 沒設定好，任何登入帳號都有可能寫入
3. Markdown 預覽如果沒做 HTML sanitization，可能有 XSS 風險
4. 無法保證所有使用者都只有一個 admin 身分

因此，這份後台的安全性最終須依靠 Firestore Security Rules。

---

## 37. 一句話概括

`admin.js` 是你這個博客後台的控制中心：

- 它負責登入、登出
- 讀取文章與留言
- 做 CRUD
- 管理 Markdown
- 讓後台功能真正運作

而最終它真正的安全邊界，仍然要由 Firebase 的 Auth + Firestore Rules 共同保護。

---

如果你要，我下一步可以直接再幫你補一份「更偏教學式」版本，或者整理成「有目錄、每段程式碼配圖式」的 Markdown 文件，讓你讀起來更順。