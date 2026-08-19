# 🚀 前後端分離部署指南

## 📋 前置準備

### 1. GAS 後端 API
GAS API 已部署在：
```
https://script.google.com/macros/d/{您的scriptId}/usercontent
```

### 2. 前端 Vercel 部署
本目錄包含所有前端靜態文件，準備部署到 Vercel。

---

## 🔧 部署步驟

### Step 1: 推送 GAS API（純後端）

```bash
cd ..  # 回到專案根目錄
clasp push --force
clasp deploy --description "前後端分離 - 純 API 後端"
```

複製新的部署 URL，格式如下：
```
https://script.google.com/macros/d/{scriptId}/usercontent
```

### Step 2: 設置 Vercel 部署

#### 方式 A: 使用 GitHub（推薦）

1. **建立 GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial frontend setup"
   git branch -M main
   git remote add origin https://github.com/你的用戶名/repo名稱.git
   git push -u origin main
   ```

2. **連接到 Vercel**
   - 訪問 https://vercel.com
   - 登入或註冊
   - 點擊「New Project」
   - 選擇你的 GitHub repository
   - 設置環境變數（可選）
   - 部署

#### 方式 B: 使用 Vercel CLI

```bash
npm install -g vercel
cd frontend
vercel

# 按照提示選擇：
# - 當前目錄是否為 Vercel 專案？選 Yes
# - 輸入 Vercel 帳戶名稱
# - 選擇 public 目錄作為 Root Directory
```

### Step 3: 配置 GAS API URL

部署後，前端會顯示在類似這樣的 URL：
```
https://your-project.vercel.app
```

#### 方式 A: 自動設置（首次訪問時）
1. 打開 https://your-project.vercel.app
2. 如果未設置 API URL，會彈出對話框
3. 貼上你的 GAS API URL：
   ```
   https://script.google.com/macros/d/{scriptId}/usercontent
   ```
4. URL 會被儲存在本地儲存中

#### 方式 B: URL 參數設置
```
https://your-project.vercel.app?api=https://script.google.com/macros/d/{scriptId}/usercontent
```

#### 方式 C: HTML 中硬編碼（部署前）
在 `public/index.html` 頂部添加：
```html
<script>
window.GAS_API_URL = 'https://script.google.com/macros/d/{您的scriptId}/usercontent';
</script>
```

---

## 🔐 CORS 配置

GAS API 已配置為允許跨域請求 (CORS)：
```javascript
'Access-Control-Allow-Origin': '*'
```

Vercel 前端可以自由訪問 GAS API。

---

## ✅ 部署完成檢查

### 測試清單

- [ ] 前端能在 Vercel 上訪問
- [ ] 頁面能夠加載（無 404 錯誤）
- [ ] 打開瀏覽器開發者工具 (F12)
- [ ] 檢查 Console，應該看到：
  ```
  ✅ API_URL 從全域變數讀取: ...
  或
  ✅ API_URL 從本地儲存讀取: ...
  ```
- [ ] 測試一個 API 調用（例如提交捐贈表單）
- [ ] 檢查網路標籤，應該看到對 GAS API 的請求

### 常見問題

**Q: 看到 "API 客戶端初始化失敗" 錯誤**
- A: 需要設置 GAS API URL，請參考「Step 3: 配置 GAS API URL」

**Q: API 請求失敗 CORS 錯誤**
- A: 檢查 GAS API 是否正確部署，確認 CORS 標頭已設置

**Q: 頁面無法加載**
- A: 檢查 Vercel 部署是否完成，查看 Vercel Dashboard 中的部署日誌

---

## 📁 目錄結構

```
frontend/
├── public/                 # 前端靜態文件
│   ├── index.html         # 主頁面
│   ├── recent.html        # 最近捐贈
│   ├── near-expiry.html   # 即期品
│   ├── withdraw.html      # 領借用
│   ├── asset_entry.html   # 資產入庫
│   ├── asset_return.html  # 資產歸還
│   ├── inventory.html     # 庫存總覽
│   ├── transfer.html      # 資產轉移
│   ├── stocktake-correction.html
│   └── api.js             # 前端 API 客戶端
├── vercel.json            # Vercel 配置
└── README.md              # 本文件
```

---

## 🎯 架構圖

```
┌─────────────────────────────────────┐
│ Vercel (前端)                        │
│ https://your-project.vercel.app     │
│                                     │
│  HTML + CSS + JS + api.js           │
│                                     │
│  (發起 fetch 請求)                   │
└─────────────┬───────────────────────┘
              │
              │ CORS-enabled fetch
              │
┌─────────────▼───────────────────────┐
│ GAS (純 API 後端)                    │
│ https://script.google.com/macros/    │
│  d/{id}/usercontent                 │
│                                     │
│  API.gs (路由層)                     │
│  AppRouter.gs (業務邏輯)              │
│  其他 .gs 檔案 (資料庫操作)           │
└─────────────────────────────────────┘
```

---

## 🚀 下一步

1. 完成上述部署步驟
2. 測試所有功能
3. 根據需要調整 CSS/JS
4. 設置自動部署（推薦使用 GitHub Actions）

祝部署順利！🎉

