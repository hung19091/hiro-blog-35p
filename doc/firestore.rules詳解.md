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
      allow create, update, delete: if isAdmin();
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
      allow create, update, delete: if isAdmin();
```

- 只有已存在 admin 白名單中的使用者，才能新增／更新／刪除 admin 文件
- 這樣可以避免一般使用者自行建立一個假的 admin 資料

> 這份規則僅適用於 Firestore。Firebase Storage 的權限必須另外在 Firebase Console 的 Storage Rules 設定，不能直接寫在這裡。

---

## 6. Storage 規則與 Firestore 規則不同

這點曾經是專案中最常見的錯誤：

- `firestore.rules` 只保護 Firestore
- Firebase Storage 另有一套 `storage.rules`
- 兩者不能混用，也不能把 `exists()` 這種 Firestore 語法直接放進 Storage 規則

### 正確做法

如果要讓後台能上傳文章圖片，應該在 Firebase Console → Storage → Rules 中設定：

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /articles/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 這段規則的意義

- `allow read: if true;`：公開讀取圖片
- `allow write: if request.auth != null;`：必須登入之後才可寫入

這樣就能讓文章中的圖片上傳功能正常工作，而不會再因為把 Storage 規則放錯地方而導致 `storage/unauthorized` 錯誤。

---

## 7. 文章集合規則：`match /articles/{articleId}`

原始碼位置：`firestore.rules: 29-47`

```firestore
    match /articles/{articleId} {
      // 任何人都能讀取已發布文章
      // 文章作者本人也能讀取自己的文章
      // 管理者可讀取全部文章
      allow read: if resource.data.published == true
                  || resource.data.authorUid == request.auth.uid
                  || isAdmin();

      // 已登入使用者只能建立自己的文章
      // 文章作者 UID 必須等於當前登入使用者 UID
      allow create: if isSignedIn()
                    && request.resource.data.authorUid == request.auth.uid;

      // 管理者可完整修改任何文章
      // 文章作者本人可更新自己的文章
      allow update: if isAdmin()
                    || (isSignedIn() && resource.data.authorUid == request.auth.uid);

      // 管理者可刪除任何文章
      // 文章作者本人可刪除自己的文章
      allow delete: if isAdmin()
                    || (isSignedIn() && resource.data.authorUid == request.auth.uid);
    }
```

### 逐行解釋

#### 第 29 行
```firestore
    match /articles/{articleId} {
```

- 針對 `articles` 集合的每一篇文章做規則設定
- `articleId` 是文件 ID

#### 第 30-34 行：讀取規則
```firestore
      allow read: if resource.data.published == true
                  || resource.data.authorUid == request.auth.uid
                  || isAdmin();
```

這表示：

- 若文章 `published == true`，任何人可讀
- 若文章作者是目前登入者，也可讀
- 若使用者是 admin，也可讀

這是目前版本的關鍵設計，因為已經加入 `authorUid` 欄位，讓作者能讀取自己的草稿與內容。 

#### 第 35-38 行：建立規則
```firestore
      allow create: if isSignedIn()
                    && request.resource.data.authorUid == request.auth.uid;
```

- 必須登入
- 新增文章時，`authorUid` 必須等於目前登入使用者 UID
- 這樣就不能讓非登入的使用者、或其他使用者冒用別人的 UID

#### 第 39-45 行：更新與刪除規則
```firestore
      allow update: if isAdmin()
                    || (isSignedIn() && resource.data.authorUid == request.auth.uid);
```

```firestore
      allow delete: if isAdmin()
                    || (isSignedIn() && resource.data.authorUid == request.auth.uid);
```

- 管理者可管理所有文章
- 作者本人可更新或刪除自己的文章

### 這代表什麼

這不再是單純的「全站只有 admin 可寫」設計，而是變成更實用的擁有者模式：

- 公開文章可讀
- 作者可管理自己的文章
- 管理者仍可維護整體內容

這也正是你現在問到的「非 admin 使用者登入後，仍能看到自己文章」需求的根本解法。

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
- 作者本人可以讀取與管理自己的文章
- 留言必須先通過審核才能顯示
- 任何寫入文章、刪除留言、核准留言，主要由 admin 負責，但文章作者可管理自己的文章

---

## 14. 這份規則的實際安全效果

這份規則能避免以下問題：

- 未登入者直接修改資料
- 一般訪客冒用別人的 UID 建立文章
- 一般使用者直接刪除其他人的文章
- 一般使用者直接核准留言
- 一般使用者直接刪除留言
- 任何人隨意改動公開內容

也就是說：

這份規則是整個博客是否安全的核心分界線，同時也保留了作者能管理自己內容的必要能力。

---

## 15. 一句話概括

`firestore.rules` 是整個專案的真實安全閘門：

- `isAdmin()` 依賴 `admins/{uid}` 白名單
- 公開文章可讀
- 草稿文章只給 admin
- 留言需要 `approved == false` 才能送出
- 文章與留言的管理權限都只有 admin 才有

這也是為什麼它比任何前端條件判斷更重要。