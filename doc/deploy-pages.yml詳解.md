# deploy-pages.yml 詳解

這份文件是對 GitHub Actions workflow 檔案 `deploy-pages.yml` 的逐段、逐行解說，目的是讓你知道它如何把這個靜態部落格部署到 GitHub Pages，並且在每日固定時間重新生成 sitemap。

> 這份文件直接覆蓋範圍：`.github/workflows/deploy-pages.yml`
>
> 重點：這份檔案負責「自動化部署與重新整理 sitemap」，它是整個 GitHub Pages 發佈流程的核心。

---

## 1. 檔案定位與用途

`deploy-pages.yml` 是 GitHub Actions 的部署工作流，主要負責：

- 當程式碼推送到 `main` / `master` 時自動部署
- 允許手動觸發部署
- 每天定時重新生成 sitemap
- 將網站輸出打包到 `public` 資料夾
- 上傳到 GitHub Pages

這份檔案確保網站能自動部署，而且 sitemap 會保持最新。

---

## 2. workflow 名稱

原始碼位置：`.github/workflows/deploy-pages.yml: 1`

```yml
name: Deploy GitHub Pages
```

### 功能

- 這是 GitHub Actions 工作流的名稱。
- 在 GitHub 頁面上會顯示這個任務名稱。

例如你會在 GitHub Actions 執行紀錄看到：

- `Deploy GitHub Pages`

這讓你能快速識別部署任務。

---

## 3. 觸發條件：`on:`

原始碼位置：`.github/workflows/deploy-pages.yml: 3-10`

```yml
on:
  schedule:
    - cron: '0 0 * * *'
  push:
    branches:
      - main
      - master
  workflow_dispatch:
```

### 逐行解釋

#### 第 3 行：workflow 觸發設定開始
```yml
on:
```

- `on` 是 GitHub Actions 的事件觸發入口。
- 當這些條件成立時，workflow 會啟動。

#### 第 4-5 行：每日排程
```yml
  schedule:
    - cron: '0 0 * * *'
```

- 這是定時任務。
- `cron` 表示排程規則。
- `'0 0 * * *'` 表示每天 00:00 UTC 執行一次。

這代表：

- 每天自動重新執行一次部署流程
- 每次都會重新生成 sitemap

#### 第 6-9 行：push 觸發
```yml
  push:
    branches:
      - main
      - master
```

- 當你推送到 `main` 或 `master` 分支時觸發。
- 這是最常見的部署自動化方式。

#### 第 10 行：手動觸發
```yml
  workflow_dispatch:
```

- 允許你在 GitHub 網頁上手動點擊執行。
- 這對測試與手動部署很有用。

### 這份 workflow 的總結

它同時支援：

- 定時執行
- 程式碼 push 執行
- 手動觸發執行

這是非常完整的部署設定。

---

## 4. 權限設定：`permissions`

原始碼位置：`.github/workflows/deploy-pages.yml: 12-15`

```yml
permissions:
  contents: read
  pages: write
  id-token: write
```

### 逐行解釋

#### 第 13 行：讀取 repo 內容
```yml
  contents: read
```

- 讓 GitHub Action 可以讀取 repository 內容。
- 例如下載程式碼、讀取設定、讀取檔案。

#### 第 14 行：寫入 GitHub Pages
```yml
  pages: write
```

- 讓 workflow 能部屬到 GitHub Pages。

#### 第 15 行：OIDC 權限
```yml
  id-token: write
```

- 這是 GitHub Pages 需要的身份驗證授權。
- 讓 job 能安全地取得 deployment 權限。

### 這些權限的作用

它們確保 workflow 能：

- checkout repo
- 產生部署內容
- 上傳到 Pages
- 完成發佈

---

## 5. 併發控制：`concurrency`

原始碼位置：`.github/workflows/deploy-pages.yml: 17-19`

```yml
concurrency:
  group: pages
  cancel-in-progress: true
```

### 功能

- `group: pages`：所有 Pages 相關任務共用同一個群組名。
- `cancel-in-progress: true`：如果有新的部署啟動，舊的部署會被取消。

### 好處

- 避免重複部署造成衝突
- 避免多個 workflow 同時寫入 Pages
- 保持部署穩定

---

## 6. 工作任務：`jobs`

原始碼位置：`.github/workflows/deploy-pages.yml: 21-57`

```yml
jobs:
  build:
```

### 功能

- 這份 workflow 內建立了一個 `build` job。
- build job 做的事情是：準備網站內容並產生 sitemap。

---

## 7. build job 執行環境

原始碼位置：`.github/workflows/deploy-pages.yml: 22-27`

```yml
  build:
    runs-on: ubuntu-latest
    env:
      SITE_URL: ${{ vars.SITE_URL }}
      ARTICLE_URL_FORMAT: query
      SITEMAP_OUTPUT_DIR: public
```

### 逐行解釋

#### 第 22 行：job 名稱
```yml
  build:
```

- 這個 job 的名稱為 `build`。

#### 第 23 行：使用 Ubuntu runner
```yml
    runs-on: ubuntu-latest
```

- 在 GitHub 提供的 Linux VM 上執行。
- 這是預設且適合 Node.js + 靜態網站的環境。

#### 第 24-27 行：環境變數
```yml
    env:
      SITE_URL: ${{ vars.SITE_URL }}
      ARTICLE_URL_FORMAT: query
      SITEMAP_OUTPUT_DIR: public
```

- `SITE_URL`：部署站點的 URL
- `ARTICLE_URL_FORMAT: query`：文章頁使用 query string 模式，例如：
  - `article.html?slug=xxx`
- `SITEMAP_OUTPUT_DIR: public`：sitemap 輸出到 `public` 資料夾

這些環境變數都會傳給後面的 Node 腳本與 shell 命令。

---

## 8. 檢出程式碼

原始碼位置：`.github/workflows/deploy-pages.yml: 29-30`

```yml
      - name: Checkout repository
        uses: actions/checkout@v4
```

### 功能

- 把 GitHub repo 的原始碼下載到 runner。
- 接著後續步驟可以讀取：
  - `index.html`
  - `article.html`
  - `admin.html`
  - `scripts/generate-sitemap.mjs`
  - `package.json`

這一步是所有 GitHub Actions 流程的前置動作。

---

## 9. 安裝 Node.js

原始碼位置：`.github/workflows/deploy-pages.yml: 32-35`

```yml
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
```

### 功能

- 在 runner 上安裝 Node.js。
- 版本設為 `24`。

這樣才能執行：

```bash
npm install
node scripts/generate-sitemap.mjs
```

---

## 10. 解析站點 URL

原始碼位置：`.github/workflows/deploy-pages.yml: 37-54`

```yml
      - name: Resolve site URL
        run: |
          if [ -n "$SITE_URL" ]; then
            echo "Resolved SITE_URL from repository variable: $SITE_URL"
          else
            REPO_OWNER="${GITHUB_REPOSITORY%%/*}"
            REPO_NAME="${GITHUB_REPOSITORY##*/}"

            if [ "$REPO_NAME" = "$REPO_OWNER.github.io" ]; then
              SITE_URL="https://$REPO_OWNER.github.io"
            else
              SITE_URL="https://$REPO_OWNER.github.io/$REPO_NAME"
            fi

            echo "Resolved SITE_URL from repository name: $SITE_URL"
          fi

          echo "SITE_URL=$SITE_URL" >> "$GITHUB_ENV"
```

### 逐行解釋

#### 第 38 行：開始 shell 腳本
```yml
        run: |
```

- 這表示後面會執行一段 bash 腳本。

#### 第 39-40 行：檢查是否已有設定
```bash
          if [ -n "$SITE_URL" ]; then
            echo "Resolved SITE_URL from repository variable: $SITE_URL"
```

- 如果專案有設定 `SITE_URL` 這個 repo variable，就直接使用它。
- 這通常是最穩定的方式。

#### 第 41-49 行：自動推斷 URL
```bash
          else
            REPO_OWNER="${GITHUB_REPOSITORY%%/*}"
            REPO_NAME="${GITHUB_REPOSITORY##*/}"

            if [ "$REPO_NAME" = "$REPO_OWNER.github.io" ]; then
              SITE_URL="https://$REPO_OWNER.github.io"
            else
              SITE_URL="https://$REPO_OWNER.github.io/$REPO_NAME"
            fi
```

- 如果沒有自訂 `SITE_URL`，就透過 GitHub repository 自動推斷。

例如：

- repo: `hung19091/hiro-blog-35p`
- 會推斷站點：
  `https://hung19091.github.io/hiro-blog-35p`

#### 第 51-52 行：寫回環境變數
```bash
          echo "Resolved SITE_URL from repository name: $SITE_URL"
          fi

          echo "SITE_URL=$SITE_URL" >> "$GITHUB_ENV"
```

- 把最終的 `SITE_URL` 寫入 GitHub Actions 環境變數。
- 之後其他步驟都能讀到。

### 這一步的目的

它確保 sitemap 生成時知道網站的真實域名。

例如：

```xml
<loc>https://hung19091.github.io/hiro-blog-35p/</loc>
```

這個值就來自這段邏輯。

---

## 11. 安裝專案依賴

原始碼位置：`.github/workflows/deploy-pages.yml: 56-57`

```yml
      - name: Install dependencies
        run: npm install
```

### 功能

- 安裝 `package.json` 中定義的依賴。
- 雖然這個專案不一定有很多 npm 套件，但這是標準流程。

在這裡特別重要的原因是：

- `generate-sitemap.mjs` 是 Node 執行檔
- 之後需要 `node` 來執行它

---

## 12. 準備 GitHub Pages 輸出資料夾

原始碼位置：`.github/workflows/deploy-pages.yml: 59-68`

```yml
      - name: Prepare Pages output
        run: |
          mkdir -p public
          cp index.html public/
          cp article.html public/
          cp admin.html public/
          cp robots.txt public/
          cp -r css public/css
          cp -r js public/js
          if [ -d doc ]; then cp -r doc public/doc; fi
          printf '\nSitemap: %s/sitemap.xml\n' "$SITE_URL" >> public/robots.txt
```

### 逐行解釋

#### 第 60 行：建立 output folder
```bash
          mkdir -p public
```

- 建立 `public` 目錄。
- 這是 GitHub Pages 的最終輸出資料夾。

#### 第 61-66 行：複製靜態檔案
```bash
          cp index.html public/
          cp article.html public/
          cp admin.html public/
          cp robots.txt public/
          cp -r css public/css
          cp -r js public/js
```

- 將網站首頁、文章頁、後台頁、robots.txt 和靜態資源複製到 `public`。

#### 第 67 行：複製文件資料夾
```bash
          if [ -d doc ]; then cp -r doc public/doc; fi
```

- 如果存在 `doc` 資料夾，就一起複製進去。

#### 第 68 行：加入 Sitemap 訊息到 robots.txt
```bash
          printf '\nSitemap: %s/sitemap.xml\n' "$SITE_URL" >> public/robots.txt
```

- 在 `robots.txt` 最後加上一行：

```txt
Sitemap: https://hung19091.github.io/hiro-blog-35p/sitemap.xml
```

這讓搜尋引擎知道 sitemap 位置。

---

## 13. 產生 sitemap.xml

原始碼位置：`.github/workflows/deploy-pages.yml: 70-71`

```yml
      - name: Generate sitemap.xml from Firestore
        run: npm run generate:sitemap
```

### 功能

- 執行 `npm run generate:sitemap`
- 這會調用：[scripts/generate-sitemap.mjs](scripts/generate-sitemap.mjs)

### 這一步的作用

- 讀取 Firestore 的 `articles` 集合
- 篩選 `published == true`
- 依照 slug 產生文章 URL
- 寫出 `public/sitemap.xml`

這也是讓 sitemap 維持最新資料的核心步驟。

---

## 14. 上傳 Pages artifact

原始碼位置：`.github/workflows/deploy-pages.yml: 73-76`

```yml
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public
```

### 功能

- 把 `public` 目錄整個打包成 Pages artifact。
- 供後續 `deploy` job 使用。

### 簡單說

這一步就是：「把網站準備好的最終版本交給 GitHub Pages 部屬系統」。

---

## 15. deploy job：實際部署到 GitHub Pages

原始碼位置：`.github/workflows/deploy-pages.yml: 78-88`

```yml
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 逐行解釋

#### 第 79 行：定義 deploy job
```yml
  deploy:
```

- 這個 job 會在 `build` 成功後執行。

#### 第 80-82 行：環境設定
```yml
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
```

- 設置 GitHub Pages 的 deployment environment。
- 會填入 Pages 發佈後的 URL。

#### 第 83 行：執行環境
```yml
    runs-on: ubuntu-latest
```

- 使用 Linux runner 執行部署。

#### 第 84 行：依賴 build
```yml
    needs: build
```

- 前一個 `build` job 必須成功，才會執行這個 job。

#### 第 86-88 行：真正部署
```yml
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- 使用官方動作 `actions/deploy-pages@v4`。
- 將剛剛整理好的網站發布到 GitHub Pages。

---

## 16. 總流程圖解

整個 workflow 的執行順序大致是：

1. 觸發事件：push / schedule / workflow_dispatch
2. `build` job 啟動
3. 下載 repo
4. 設定 Node.js
5. 判斷網站 URL
6. 安裝依賴
7. 複製靜態頁面到 `public`
8. 執行 sitemap 生成
9. 上傳 artifact
10. `deploy` job 接手
11. 部署到 GitHub Pages

---

## 17. 這份 workflow 的關鍵價值

這份 workflow 的意義很明確：

- 讓網站自動發佈
- 讓 sitemap 自動更新
- 讓內容更新後能被搜尋引擎抓到
- 不需要手動上傳靜態檔案

---

## 18. 一句話概括

`.github/workflows/deploy-pages.yml` 是整個站點的自動化發佈管線：

- 它會在 push、手動觸發、或每日排程時執行
- 先準備 `public` 輸出資料夾
- 再生成 sitemap
- 最後部署到 GitHub Pages

也就是說，它是「部落格發佈 + SEO 更新」的自動化中心。