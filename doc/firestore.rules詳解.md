# firestore.rules 詳解

這份文件是對 `firestore.rules` 的逐段、逐行解說，目的是讓你知道這份 Firebase 安全規則是如何保護文章、留言與後台權限的。

> 這份文件直接覆蓋範圍：`firestore.rules`
>
> 重點：這份檔案才是真正的安全邊界，前端 JavaScript 只是 UX，不能當作安全保護。

---

## 1. 檔案定位與用途

`firestore.rules` 是 Firebase Firestore 的安全規則檔案，主要負責：

- 限制誰能讀取文章
- 限制誰能新增/修改/刪除文章
- 限制誰能讀取留言
- 限制誰能新增留言
- 限制誰能審核或刪除留言
- 限制後台管理權限，只有 admin 才能進行管理操作

這份檔案是整個專案最重要的安全防線。

---

## 2. 檔案最上方：版本設定

原始碼位置：`firestore.rules: 1`

```firestore
rules_version = '2';
```

### 逐行解釋

這一行定義 Firestore 規則版本為 `2`。

- Firebase 官方現在通常使用 `rules_version = '2';`
- 這代表後續規則可以使用較新的語法，例如：
  - `is string`
  - `size()`
  - `exists()`
  - `request.resource.data`

### 為什麼要寫這行

因為新版規則語法比較完整，適合用在：

- 欄位驗證
- 條件判斷
- 集合權限控制
- 類型檢查

### 風險評估

這一行本身沒有風險，因為它只是設定規則版本，不是權限判斷。

---

## 3. 開始定義 Firestore 服務

原始碼位置：`firestore.rules: 2-3`

```firestore
service cloud.firestore {
  match /databases/{database}/documents {
```

### 逐行解釋

#### 第 2 行
```firestore
service cloud.firestore {
```

- 宣告這是 Firestore 的安全規則區塊。
- 所有規則都寫在 `service cloud.firestore { ... }` 內。

#### 第 3 行
```firestore
  match /databases/{database}/documents {
```

- 代表匹配所有 Firestore 文件路徑。
- `{database}` 是資料庫名稱變數，通常是預設資料庫：
  - `(default)`

也就是說：

- 這份規則會套用到整個 Firestore 資料庫
- 之後再用 `match /articles/{articleId}` 等方式切分集合

---

## 4. admin 白名單判斷：`isSignedIn()`

原始碼位置：`firestore.rules: 6-14`

```firestore
    function isSignedIn() {
      return request.auth != null;
    }
```

### 功能

檢查使用者是否登入 Firebase Authentication。

### 什麼是 `request.auth`

`request.auth` 是 Firestore rule 中的內建變數，代表目前請求的使用者身份。

如果這個值不是 `null`，代表：

- 使用者已登入
- Firebase 已有 Auth 上下文
- request.auth.uid 是有效的登入者 UID

### 範例

```firestore
request.auth != null
```

表示：

- 已登入使用者可以通過這個條件
- 未登入使用者則不能

---

## 5. 管理者判斷：`isAdmin()`

原始碼位置：`firestore.rules: 16-20`

```firestore
    function isAdmin() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
```

### 逐行解釋

#### 第 16 行：函式開始
```firestore
    function isAdmin() {
```

#### 第 17 行：先確認登入
```firestore
      return isSignedIn() &&
```

- 前面必須先確認 `request.auth != null`
- 否則未登入使用者不會被視為 admin

#### 第 18-19 行：確認 UID 是否存在於 `admins` 集合
```firestore
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
```

- 這一行是核心
- 它表示：

  「查詢 Firestore 中是否存在 `admins/{request.auth.uid}` 這個文件」

### 這代表什麼

如果你登入的使用者 UID 是：

```text
AxU8ApQhu.....zz1
```

那 Firestore 會檢查：

```text
admins/AxU8ApQhu.....zz1
```

是否存在。

如果存在，這個使用者就被判定為 admin。

如果不存在，就不是 admin。

### 這個設計的優點

- 以 UID 為唯一識別，不依賴 email
- 比 email 更穩定
- 不會因為使用者改 email 就失去權限
- 比前端判斷更安全

---

## 6. 管理者集合的權限：`match /admins/{uid}`

原始碼位置：`firestore.rules: 22-26`

```firestore
    match /admins/{uid} {
      allow get: if isSignedIn() && request.auth.uid == uid;
      allow create, update, delete: if isSignedIn() && request.auth.uid == uid;
    }
```

### 功能

這段規則定義 `admins` 集合中的文件權限。

### 逐行解釋

#### 第 22 行
```firestore
    match /admins/{uid} {
```

- 代表 `admins` 集合中的每個文件
- `uid` 是文件 ID

例如：

```text
admins/user123
admins/user456
```

#### 第 23 行
```firestore
      allow get: if isSignedIn() && request.auth.uid == uid;
```

- 只有登入者本人可以讀取自己這份 admin 資料
- 例如：`uid` 等於登入者 UID 才能讀

#### 第 24 行
```firestore
      allow create, update, delete: if isSignedIn() && request.auth.uid == uid;
```

- 只有登入者本人能新增、更新、刪除自己的 admin 文件
- 這是很安全的設計

### 這是什麼意思

這是「帳號自身管理自己的 admin 權限資料」的規則。

不過真正控制是否能管理文章、留言的核心，其實是下一段 `match /articles/{articleId}` 與 `match /comments/{commentId}`。

---

## 7. 文章集合規則：`match /articles/{articleId}`

原始碼位置：`firestore.rules: 29-36`

```firestore
    match /articles/{articleId} {
      // 任何人都能讀取已發布文章
      allow read: if resource.data.published == true || isAdmin();

      // 只有管理者可以新增、修改、刪除文章
      allow create, update, delete: if isAdmin();
    }
```

### 逐行解釋

#### 第 29 行
```firestore
    match /articles/{articleId} {
```

- 針對 `articles` 集合的每一篇文章做規則設定
- `articleId` 是文件 ID

#### 第 30 行
```firestore
      allow read: if resource.data.published == true || isAdmin();
```

這行非常重要。它表示：

- 若文章 `published` 欄位是 `true`，任何人都可讀
- 或者若使用者是 admin，則也可讀

也就是說：

- 公開文章：任何人可看
- 草稿文章：只有 admin 可看

### 判斷邏輯說明

```firestore
resource.data.published == true
```

- `resource.data` 指目前被讀取的文章文件內容
- `published` 是文章是否發佈的布林值

如果文章不是公開狀態，則不會被匿名訪客讀取。

#### 第 33 行
```firestore
      allow create, update, delete: if isAdmin();
```

- 只有 admin 才能新增、修改、刪除文章
- 這裡沒有放寬條件
- 若不是 admin，直接不允許

### 這代表什麼

即使前端 `admin.js` 裡面有新增文章按鈕，如果你不是 admin，Firestore 也絕對不會接受這個寫入請求。

這就是安全規則真正的防線。

---

## 8. 留言集合規則：`match /comments/{commentId}`

原始碼位置：`firestore.rules: 39-53`

```firestore
    match /comments/{commentId} {
      // 任何人都能讀取已核准留言，管理者也可讀取所有留言
      allow read: if resource.data.approved == true || isAdmin();

      // 任何人都可以留言，但留言必須是未核准狀態，且欄位長度受限
      allow create: if request.resource.data.approved == false
                    && request.resource.data.author is string
                    && request.resource.data.author.size() > 0
                    && request.resource.data.author.size() <= 50
                    && request.resource.data.message is string
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() <= 1000;

      // 只有管理者能核准、取消核准或刪除留言
      allow update, delete: if isAdmin();
    }
```

### 基本概念

留言集合的設計是：

- 訪客可留言
- 但留言先是「未核准」狀態
- 只有經過 admin 審核後，才會被顯示給一般使用者

---

## 9. 留言讀取權限：`allow read`

原始碼位置：`firestore.rules: 40-41`

```firestore
      allow read: if resource.data.approved == true || isAdmin();
```

### 逐行解釋

這條規則表示：

- 允許讀取的條件是：
  1. `approved == true`，或
  2. 使用者是 admin

### 這樣設計的原因

- 已核准留言：顯示給所有人看
- 未核准留言：只有管理員可看
- 避免未審核留言直接暴露在公開頁面

---

## 10. 訪客留言建立規則：`allow create`

原始碼位置：`firestore.rules: 43-51`

```firestore
      allow create: if request.resource.data.approved == false
                    && request.resource.data.author is string
                    && request.resource.data.author.size() > 0
                    && request.resource.data.author.size() <= 50
                    && request.resource.data.message is string
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() <= 1000;
```

### 這段非常重要，因為它限制了留言格式與內容

#### 第 43 行
```firestore
      allow create: if request.resource.data.approved == false
```

- 新留言必須先被設置為 `approved: false`
- 也就是說：留言不能直接直接公開。它必須先等待審核。

#### 第 44 行
```firestore
                    && request.resource.data.author is string
```

- `author` 必須是一個字串

#### 第 45 行
```firestore
                    && request.resource.data.author.size() > 0
```

- 暱稱不能是空字串

#### 第 46 行
```firestore
                    && request.resource.data.author.size() <= 50
```

- 暱稱最多 50 個字元
- 避免過長資訊造成排版問題

#### 第 47 行
```firestore
                    && request.resource.data.message is string
```

- 留言內容必須是字串

#### 第 48 行
```firestore
                    && request.resource.data.message.size() > 0
```

- 留言內容不能為空

#### 第 49 行
```firestore
                    && request.resource.data.message.size() <= 1000;
```

- 留言最多 1000 個字元
- 避免過長內容和垃圾資料

### 整體結論

只有符合這些條件的留言，才允許新增。

也就是說：

- 不能直接寫入 `approved: true`
- 不能留空白名稱
- 不能留空留言
- 不能超過長度限制

這是基本的資料完整性保護。

---

## 11. admin 修改留言權限：`allow update, delete`

原始碼位置：`firestore.rules: 52-53`

```firestore
      allow update, delete: if isAdmin();
```

### 功能

- 只有 admin 才能核准、取消核准或刪除留言

### 什麼是 update

`update` 不一定表示「修改全部內容」，而是指任何對該文件的更新。這裡的意義是：

- 將留言從未核准改成已核准
- 把文章狀態改掉
- 刪除留言

### 這是安全的

因為一般使用者沒有權限去做這種操作，避免：

- 任意修改留言內容
- 任意撤銷顯示
- 任意刪除其他人的留言

---

## 12. 整體安全設計總結

這份 `firestore.rules` 的設計非常典型，核心邏輯是：

### 1. 前端不是安全邊界

前端 `admin.js` 可以做 UI 判斷，但不安全。

真正的限制在 Firestore rules。

### 2. 只允許 admin 管理內容

```firestore
allow create, update, delete: if isAdmin();
```

這代表：

- 非 admin 無法新增文章
- 非 admin 無法更新文章
- 非 admin 無法刪除文章

### 3. 文章公開與未公開區分

```firestore
resource.data.published == true
```

- 已發布文章可供公開閱讀
- 未發布文章只給 admin 看

### 4. 留言需審核

```firestore
request.resource.data.approved == false
```

- 訪客留言先是待審核狀態
- 只有 admin 才能核准顯示

### 5. UID 白名單比 email 更安全

```firestore
exists(/databases/$(database)/documents/admins/$(request.auth.uid));
```

這代表 admin 判斷依據是登入者 UID，而非 email。

UID 的優點：

- 唯一
- 穩定
- 不因使用者改 email 而失效

---

## 13. 你這份規則的真正核心一句話

整份規則的核心邏輯可以概括成：

- 已登入使用者若存在 `admins/{uid}`，就可以管理內容
- 已發布文章可以公開讀取
- 留言必須先通過審核才能顯示
- 任何寫入文章、刪除留言、核准留言，必須由 admin 才能做

---

## 14. 這份規則的實際安全效果

這份規則能避免以下問題：

- 未登入者直接修改資料
- 一般訪客新增文章
- 一般使用者直接刪除文章
- 一般使用者直接核准留言
- 一般使用者直接刪除留言
- 任何人隨意改動公開內容

也就是說：

這份規則是整個博客是否安全的核心分界線。

---

## 15. 一句話概括

`firestore.rules` 是整個專案的真實安全閘門：

- `isAdmin()` 依賴 `admins/{uid}` 白名單
- 公開文章可讀
- 草稿文章只給 admin
- 留言需要 `approved == false` 才能送出
- 文章與留言的管理權限都只有 admin 才有

這也是為什麼它比任何前端條件判斷更重要。