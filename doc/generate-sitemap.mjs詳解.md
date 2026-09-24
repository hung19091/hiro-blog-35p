# generate-sitemap.mjs 詳解

這份文件是對 `scripts/generate-sitemap.mjs` 的逐段、逐行解說，目的是讓你知道這個 Node.js 腳本如何從 Firestore 提取已發佈文章，並產生 `sitemap.xml`，方便搜尋引擎抓取網站內容。

> 這份文件直接覆蓋範圍：`scripts/generate-sitemap.mjs`
>
> 補強重點：每一段程式碼都會標示「原始碼位置（行號）」與用途，讓你能直接對照原始檔閱讀。

---

## 1. 檔案定位與用途

`generate-sitemap.mjs` 是 SEO 自動化腳本，主要負責：

- 讀取 Firebase 專案設定
- 查詢 Firestore 中已發佈文章
- 計算文章 URL
- 產生 `sitemap.xml`
- 將 sitemap 輸出到指定目錄

這個腳本通常會在 CI/CD 或 GitHub Actions 中自動執行。

---

## 2. 引入 Node.js 模組

原始碼位置：`scripts/generate-sitemap.mjs: 1-2`

```js
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
```

### 逐行解釋

#### 第 1 行：檔案系統模組
```js
import { mkdir, writeFile } from 'node:fs/promises';
```

- `mkdir`：建立資料夾。
- `writeFile`：寫入檔案。

#### 第 2 行：process 模組
```js
import process from 'node:process';
```

- 讓腳本能讀取環境變數、設定退出碼等。

#### 第 3 行：readFile 模組
```js
import { readFile } from 'node:fs/promises';
```

- 用來讀取 `js/firebase-config.js` 中的 Firebase 設定。

---

## 3. 檢查必需環境變數

原始碼位置：`scripts/generate-sitemap.mjs: 4-11`

```js
function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}
```

### 功能

- 檢查環境變數是否存在。
- 如果缺少，就直接拋錯，避免後續產生錯誤 sitemap。

這段很適合用在 GitHub Actions 或部署環境中。

---

## 4. 正規化 base URL

原始碼位置：`scripts/generate-sitemap.mjs: 13-15`

```js
function normalizeBaseUrl(url) {
    return url.trim().replace(/\/+$/, '');
}
```

### 功能

- 清理 URL 尾端的 `/`。
- 例如：
  - `https://example.com/` -> `https://example.com`

這可以避免 sitemap 中出現重複斜線。

---

## 5. 從 firebase-config.js 讀取 Firebase 專案資訊

原始碼位置：`scripts/generate-sitemap.mjs: 17-31`

```js
async function readFirebaseWebConfig() {
    const configSource = await readFile(new URL('../js/firebase-config.js', import.meta.url), 'utf8');
    const projectIdMatch = configSource.match(/projectId:\s*"([^"]+)"/);
    const apiKeyMatch = configSource.match(/apiKey:\s*"([^"]+)"/);

    if (!projectIdMatch || !apiKeyMatch) {
        throw new Error('Unable to read projectId or apiKey from js/firebase-config.js');
    }

    return {
        projectId: projectIdMatch[1],
        apiKey: apiKeyMatch[1]
    };
}
```

### 逐行解釋

#### 第 17 行：函式開始
```js
async function readFirebaseWebConfig() {
```

- 這個函式會讀取 Firebase 的 `projectId` 與 `apiKey`。

#### 第 18 行：讀取設定檔內容
```js
    const configSource = await readFile(new URL('../js/firebase-config.js', import.meta.url), 'utf8');
```

- 用 `readFile` 讀取前端 Firebase 設定檔。
- 這是 sitemap 自動生成時的關鍵資料來源。

#### 第 19-20 行：正則抓取值
```js
    const projectIdMatch = configSource.match(/projectId:\s*"([^"]+)"/);
    const apiKeyMatch = configSource.match(/apiKey:\s*"([^"]+)"/);
```

- 這裡使用正則表達式擷取：
  - `projectId`
  - `apiKey`

#### 第 22-29 行：檢查與回傳
```js
    if (!projectIdMatch || !apiKeyMatch) {
        throw new Error('Unable to read projectId or apiKey from js/firebase-config.js');
    }

    return {
        projectId: projectIdMatch[1],
        apiKey: apiKeyMatch[1]
    };
```

- 若讀不到，直接拋錯，避免產生不正確的 sitemap。

---

## 6. 從 GitHub Repository 推斷網站網址

原始碼位置：`scripts/generate-sitemap.mjs: 33-46`

```js
function inferSiteUrlFromGithubRepository() {
    const repository = process.env.GITHUB_REPOSITORY?.trim();
    if (!repository || !repository.includes('/')) {
        return null;
    }

    const [owner, repoName] = repository.split('/');
    if (!owner || !repoName) {
        return null;
    }

    if (repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
        return `https://${owner}.github.io`;
    }

    return `https://${owner}.github.io/${repoName}`;
}
```

### 功能

- 如果沒有手動設定 `SITE_URL`，就由 GitHub Repository 推斷網站 URL。
- 例如：
  - `owner/project` -> `https://owner.github.io/project`

這很適合 GitHub Pages 部署。

---

## 7. 決定最終 site URL

原始碼位置：`scripts/generate-sitemap.mjs: 48-62`

```js
function resolveSiteUrl() {
    const explicitSiteUrl = process.env.SITE_URL?.trim();
    if (explicitSiteUrl) {
        return normalizeBaseUrl(explicitSiteUrl);
    }

    const inferredSiteUrl = inferSiteUrlFromGithubRepository();
    if (inferredSiteUrl) {
        return normalizeBaseUrl(inferredSiteUrl);
    }

    throw new Error('Missing SITE_URL and unable to infer it from GITHUB_REPOSITORY');
}
```

### 逐行解釋

#### 第 48 行：抓取環境變數
```js
    const explicitSiteUrl = process.env.SITE_URL?.trim();
```

- 先看是否手動設定 `SITE_URL`。

#### 第 49-51 行：使用 explicit URL
```js
    if (explicitSiteUrl) {
        return normalizeBaseUrl(explicitSiteUrl);
    }
```

- 若存在，就直接使用。

#### 第 53-58 行：嘗試自動推斷
```js
    const inferredSiteUrl = inferSiteUrlFromGithubRepository();
    if (inferredSiteUrl) {
        return normalizeBaseUrl(inferredSiteUrl);
    }
```

- 若未設定，則從 GitHub Repository 推斷。

#### 第 60 行：拋錯
```js
    throw new Error('Missing SITE_URL and unable to infer it from GITHUB_REPOSITORY');
```

- 若兩者都沒有，就直接報錯。

---

## 8. 文章 URL 生成邏輯

原始碼位置：`scripts/generate-sitemap.mjs: 64-73`

```js
function getArticleUrl(siteUrl, slug) {
    const encodedSlug = encodeURIComponent(slug);
    const format = (process.env.ARTICLE_URL_FORMAT || 'query').trim().toLowerCase();

    if (format === 'path') {
        return `${siteUrl}/article/${encodedSlug}`;
    }

    return `${siteUrl}/article.html?slug=${encodedSlug}`;
}
```

### 功能

- 依照 `ARTICLE_URL_FORMAT` 決定文章網址格式。
- 預設是 query 參數模式：
  - `article.html?slug=xxx`
- 若設定為 `path`，則使用：
  - `/article/xxx`

這讓文章頁 URL 可以有兩種模式可切換。

---

## 9. XML escape

原始碼位置：`scripts/generate-sitemap.mjs: 75-82`

```js
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
```

### 功能

- 對 XML 字元做轉義，避免 `&`、`<`、`>` 破壞 sitemap 格式。
- 例如：
  - `Tom & Jerry` -> `Tom &amp; Jerry`

這是 XML 格式文件必需的安全處理。

---

## 10. 建立一個 sitemap URL entry

原始碼位置：`scripts/generate-sitemap.mjs: 84-97`

```js
function buildUrlEntry(loc, lastmod, changefreq, priority) {
    const tags = [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`
    ];

    if (lastmod) tags.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    if (changefreq) tags.push(`    <changefreq>${changefreq}</changefreq>`);
    if (priority) tags.push(`    <priority>${priority}</priority>`);

    tags.push('  </url>');
    return tags.join('\n');
}
```

### 功能

- 把單一網址格式化成 XML 的 `<url>` 區塊。
- 會依據是否有 `lastmod`、`changefreq`、`priority` 加入不同標籤。

這是 sitemap XML 的核心組裝邏輯。

---

## 11. 讀取已發佈文章

原始碼位置：`scripts/generate-sitemap.mjs: 99-137`

```js
async function loadPublishedArticles() {
    const { projectId, apiKey } = await readFirebaseWebConfig();
    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
    const requestBody = {
        structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'published' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                }
            }
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Firestore REST query failed: ${response.status} ${response.statusText} - ${bodyText}`);
    }

    const rows = await response.json();

    return rows.map((row) => {
        const fields = row.document?.fields || {};
        const slug = fields.slug?.stringValue?.trim() || '';
        const updatedAt = fields.updatedAt?.timestampValue || null;
        const createdAt = fields.createdAt?.timestampValue || null;

        return {
            slug,
            lastmod: updatedAt || createdAt || new Date().toISOString()
        };
    }).filter((article) => article.slug);
}
```

### 逐行解釋

#### 第 99 行：開始讀取文章
```js
async function loadPublishedArticles() {
```

- 這個函式會呼叫 Firestore REST API，把已發佈文章抓出來。

#### 第 100 行：取得 Firebase 設定
```js
    const { projectId, apiKey } = await readFirebaseWebConfig();
```

- 依賴 `js/firebase-config.js` 中的項目資訊。

#### 第 101-115 行：組出 Firestore API endpoint
```js
    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`;
    const requestBody = {
        structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'published' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                }
            }
        }
    };
```

- `runQuery` 是 Firestore REST API 的查詢入口。
- 這裡設定條件：只抓 `published == true` 的文章。

#### 第 117-128 行：發送 fetch 請求
```js
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
```

- 使用 `fetch` 呼叫 Firestore API。
- `POST` 傳送 structured query。

#### 第 130-137 行：資料整理
```js
    return rows.map((row) => {
        const fields = row.document?.fields || {};
        const slug = fields.slug?.stringValue?.trim() || '';
        const updatedAt = fields.updatedAt?.timestampValue || null;
        const createdAt = fields.createdAt?.timestampValue || null;

        return {
            slug,
            lastmod: updatedAt || createdAt || new Date().toISOString()
        };
    }).filter((article) => article.slug);
```

- 每一筆文章會整理成：
  - `slug`
  - `lastmod`
- 只保留有 `slug` 的資料。

這就是 sitemap 可以知道每篇文章 URL 的來源。

---

## 12. 產生 sitemap 主程式

原始碼位置：`scripts/generate-sitemap.mjs: 139-167`

```js
async function main() {
    const siteUrl = resolveSiteUrl();
    const outputDir = process.env.SITEMAP_OUTPUT_DIR?.trim() || '.';
    const articles = await loadPublishedArticles();

    const urls = [
        buildUrlEntry(`${siteUrl}/`, new Date().toISOString(), 'daily', '1.0'),
        ...articles.map((article) => buildUrlEntry(getArticleUrl(siteUrl, article.slug), article.lastmod, 'weekly', '0.8'))
    ];

    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        ''
    ].join('\n');

    await mkdir(outputDir, { recursive: true });
    await writeFile(`${outputDir}/sitemap.xml`, sitemap, 'utf8');

    console.log(`Generated sitemap with ${articles.length + 1} URLs at ${outputDir}/sitemap.xml`);
}
```

### 逐行解釋

#### 第 139 行：主函式開始
```js
async function main() {
```

- 整個 sitemap 生成流程都在這裡。

#### 第 140 行：解析網站 URL
```js
    const siteUrl = resolveSiteUrl();
```

- 決定最終站點域名。

#### 第 141 行：決定輸出目錄
```js
    const outputDir = process.env.SITEMAP_OUTPUT_DIR?.trim() || '.';
```

- 預設輸出到目前資料夾。
- 若在 CI 環境中設定其他目錄，也可自動使用。

#### 第 142 行：載入文章列表
```js
    const articles = await loadPublishedArticles();
```

- 按條件讀出所有已發布文章。

#### 第 144-147 行：建立 URL 列表
```js
    const urls = [
        buildUrlEntry(`${siteUrl}/`, new Date().toISOString(), 'daily', '1.0'),
        ...articles.map((article) => buildUrlEntry(getArticleUrl(siteUrl, article.slug), article.lastmod, 'weekly', '0.8'))
    ];
```

- 共包含兩類 URL：
  - 首頁 `/`
  - 每篇文章頁
- 首頁 update 頻率設為 `daily`，priority 為 `1.0`。
- 文章頁則是 `weekly` 與 `0.8`。

#### 第 149-156 行：組出 XML 字串
```js
    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        ''
    ].join('\n');
```

- 這裡組出合法的 `sitemap.xml` 格式。

#### 第 158-160 行：寫入檔案
```js
    await mkdir(outputDir, { recursive: true });
    await writeFile(`${outputDir}/sitemap.xml`, sitemap, 'utf8');
```

- 若資料夾不存在，就先建立。
- 然後將 sitemap 寫入檔案。

#### 第 162 行：輸出成功訊息
```js
    console.log(`Generated sitemap with ${articles.length + 1} URLs at ${outputDir}/sitemap.xml`);
```

- 在終端機顯示產出結果，方便除錯與部署確認。

---

## 13. 錯誤處理與執行入口

原始碼位置：`scripts/generate-sitemap.mjs: 169-172`

```js
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

### 功能

- 程式啟動執行 `main()`。
- 若發生例外，就印出錯誤並設定 `exitCode = 1`。

這是 Node.js 腳本常見的錯誤處理方式。

---

## 14. 整體流程總結

`generate-sitemap.mjs` 的完整流程如下：

1. 讀取 Firebase 設定
2. 從 Firestore 抓出所有已發佈文章
3. 將文章轉為 URL
4. 組成 sitemap XML
5. 輸出到 `sitemap.xml`
6. 可用於 GitHub Pages / Firebase Hosting 等部署工具

---

## 15. 一句話概括

`generate-sitemap.mjs` 是網站的 SEO 自動化腳本：

- 取出所有已發表文章
- 產生 sitemap XML
- 幫助搜尋引擎抓取網站內容

它是前端專案與 SEO 优化之間的重要橋接腳本。