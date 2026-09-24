# style.css 詳解

這份文件是對 `css/style.css` 的逐段、逐行解說，目的是讓你知道這份自訂樣式檔案如何定義全站的深色主題、程式碼樣式、文章排版與互動效果。

> 這份文件直接覆蓋範圍：`css/style.css`
>
> 補強重點：每一段 CSS 都會標示「原始碼位置（行號）」與用途，方便你直接對照原始檔閱讀。

---

## 1. 檔案定位與用途

`style.css` 是專案的自訂樣式入口，主要用來：

- 設定全站字型與背景色
- 定義深色主題色彩
- 設定滾動條樣式
- 設定文章內文的 `prose` 排版
- 設定程式碼區塊、引用、列表的顯示樣式
- 設定 `tag-btn.active` 的高亮狀態

這份樣式檔會配合 Tailwind 的 utility classes 一起使用。

---

## 2. 字型引入與全域設定

原始碼位置：`css/style.css: 1-16`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');

:root {
  color-scheme: dark;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: #0d1117;
  color: #c9d1d9;
}

code, pre {
  font-family: 'Fira Code', monospace;
}
```

### 逐行解釋

#### 第 1 行：引入 Google Fonts
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
```

- 引入 `Inter` 字型，用來做常規介面文字。
- 引入 `Fira Code` 字型，用來顯示程式碼。

#### 第 3-5 行：設定全域色彩模式
```css
:root {
  color-scheme: dark;
}
```

- 為整個網站設定深色模式。
- 這會讓表單、 scrollbar 等原生 UI 跟著深色主題走。

#### 第 7-10 行：body 基本樣式
```css
body {
  font-family: 'Inter', sans-serif;
  background-color: #0d1117;
  color: #c9d1d9;
}
```

- 設定網站背景為深色。
- 設定字體為 `Inter`。
- 設定全站字體顏色為淡灰色。

#### 第 12-14 行：程式碼字體
```css
code, pre {
  font-family: 'Fira Code', monospace;
}
```

- 設定程式碼區塊要使用等寬字型，方便閱讀程式碼。

---

## 3. 滾動條樣式

原始碼位置：`css/style.css: 18-27`

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #0d1117;
}
::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #484f58;
}
```

### 功能

- 定義 WebKit 瀏覽器的自訂滾動條。
- 讓整個網站看起來更符合深色設計風格。

### 這些樣式的意義

- `track`：滾動條軌道背景
- `thumb`：實際可拖曳滑塊
- `hover`：當滑鼠停在上面時變更色澤

---

## 4. 標籤按鈕 active 狀態

原始碼位置：`css/style.css: 29-33`

```css
.tag-btn.active {
  background-color: #238636 !important;
  color: #ffffff !important;
}
```

### 功能

- 這是標籤按鈕被選中後的高亮條件。
- `!important` 強制覆蓋 Tailwind 產生的預設樣式。

例如：

- 未選中：深色背景
- 選中：綠色背景，白字文字

這讓使用者一眼看出目前篩選的是哪個標籤。

---

## 5. 程式碼區塊樣式：`pre` 與 `code`

原始碼位置：`css/style.css: 35-50`

```css
.prose pre {
  background-color: #0d1117;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #30363d;
  overflow-x: auto;
}
.prose code {
  color: #57ab5a;
  background-color: rgba(110, 118, 129, 0.4);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
.prose pre code {
  background-color: transparent;
  padding: 0;
  color: #e6edf3;
}
```

### 逐行解釋

#### `.prose pre`
```css
.prose pre {
  background-color: #0d1117;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #30363d;
  overflow-x: auto;
}
```

- 設定文章內程式碼區塊背景為黑色深色。
- 讓程式碼容易閱讀。
- `overflow-x: auto` 讓超長程式碼可橫向捲動。

#### `.prose code`
```css
.prose code {
  color: #57ab5a;
  background-color: rgba(110, 118, 129, 0.4);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
```

- 設定單行程式碼的顏色與背景。
- 讓內嵌程式碼不至於看起來太突兀。

#### `.prose pre code`
```css
.prose pre code {
  background-color: transparent;
  padding: 0;
  color: #e6edf3;
}
```

- 讓整個程式碼區塊內的 `code` 不會重複套用顏色背景。
- 這能維持程式碼區塊的整體風格一致。

---

## 6. 引用區塊樣式

原始碼位置：`css/style.css: 52-57`

```css
.prose blockquote {
  border-left: 4px solid #30363d;
  padding-left: 1rem;
  color: #8b949e;
  font-style: italic;
}
```

### 功能

- 定義引用文字的樣式。
- 左邊加上深色邊框。
- 讓文章中的引用提醒更明顯。

---

## 7. 標題與文章段落樣式

原始碼位置：`css/style.css: 59-74`

```css
.prose h1, .prose h2, .prose h3 {
  color: #e6edf3;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
.prose p {
  margin-bottom: 1em;
  line-height: 1.7;
  color: #c9d1d9;
}
```

### 逐行解釋

#### 標題樣式
```css
.prose h1, .prose h2, .prose h3 {
  color: #e6edf3;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
```

- 讓 Markdown 中的標題顏色為白色，強調閱讀層次。
- 設定字重與上下距離，提升排版效果。

#### 段落樣式
```css
.prose p {
  margin-bottom: 1em;
  line-height: 1.7;
  color: #c9d1d9;
}
```

- 設定段落行高，提升易讀性。
- 使用淡白色字，與深色背景互相搭配。

---

## 8. 列表樣式

原始碼位置：`css/style.css: 75-83`

```css
.prose ul, .prose ol {
  margin-left: 1.5em;
  margin-bottom: 1em;
}
.prose li {
  margin-bottom: 0.5em;
}
```

### 功能

- 讓 Markdown 清單在文章中保持良好排版。
- `margin-left` 讓列表縮排自然。
- `margin-bottom` 增加每一項之間距離。

---

## 9. 整體設計目的

這份 CSS 的核心設計方向是：

- 深色主題部落格風格
- 程式碼閱讀友善
- 文章內容可讀性高
- 與 Tailwind utility classes 協作

換句話說，它不是單純追求「好看」，而是讓文章內容的技術閱讀體驗更好。

---

## 10. 一句話概括

`style.css` 是整個站點的視覺底盤：

- 定義全站字型與顏色
- 定義文章內容排版
- 定義程式碼區塊 style
- 定義標籤高亮與整體滾動條

它讓整個部落格既有科技感，又保有良好的閱讀體驗。