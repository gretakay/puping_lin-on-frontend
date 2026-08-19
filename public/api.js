/**
 * ==========================================
 * GAS API 客戶端 - 前端與後端通訊層
 * ==========================================
 *
 * 用途：封裝所有 fetch() 調用，提供簡單的 Promise 式 API
 * 使用：const res = await addDonation(formData);
 *
 * ⚠️ 注意：此檔案只在瀏覽器中執行，不在 GAS 服務器端執行
 */

// 防止在 GAS 服務器端執行（只在瀏覽器中執行）
if (typeof window === 'undefined') {
  // GAS 服務器環境 - 不執行任何代碼
  // 此檔案不應在服務器端運行
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = null;
  }
} else {
  // 瀏覽器環境 - 正常執行以下代碼

// ==================== 配置 ====================

let API_URL = ''; // 將在 initApiClient() 時設置

const API_CONFIG = {
  timeout: 30000, // 30 秒超時
  retryCount: 2,  // 失敗重試次數
  debug: false    // 調試模式
};

// ==================== 初始化 ====================

/**
 * 初始化 API 客戶端 - 必須在頁面載入時調用
 * @returns {Promise<boolean>} 成功返回 true
 */
async function initApiClient() {
  try {
    // 從全域變數讀取 API_URL（最高優先級）
    if (window.GAS_API_URL) {
      API_URL = window.GAS_API_URL;
      logDebug('✅ API_URL 從全域變數讀取:', API_URL);
      return true;
    }

    // 從本地儲存讀取（如果存在）
    const storedUrl = localStorage.getItem('gasApiUrl');
    if (storedUrl) {
      API_URL = storedUrl;
      logDebug('✅ API_URL 從本地儲存讀取:', API_URL);
      return true;
    }

    // 自動推導 API_URL：如果在 GAS WebApp 中
    if (window.location.hostname.includes('script.google.com')) {
      API_URL = window.location.origin + window.location.pathname;
      localStorage.setItem('gasApiUrl', API_URL);
      logDebug('✅ API_URL 自動推導 (GAS):', API_URL);
      return true;
    }

    // 如果在 Vercel/localhost，從 URL 參數讀取
    const urlParam = new URLSearchParams(window.location.search).get('api');
    if (urlParam) {
      API_URL = urlParam;
      localStorage.setItem('gasApiUrl', API_URL);
      logDebug('✅ API_URL 從 URL 參數設置:', API_URL);
      return true;
    }

    // 提示用戶需要設置 API URL
    console.warn(
      '⚠️ API_URL 未設置。\n' +
      '請執行以下任一方式：\n' +
      '1. 在 HTML 中設置：window.GAS_API_URL = "你的GAS API URL"\n' +
      '2. URL 中傳遞：?api=https://script.google.com/macros/d/xxx/usercontent\n' +
      '3. 本地儲存已有值'
    );

    // 提示對話框幫用戶設置
    const apiUrl = prompt('請輸入 GAS API URL (格式: https://script.google.com/macros/d/{id}/usercontent):');
    if (apiUrl) {
      API_URL = apiUrl;
      localStorage.setItem('gasApiUrl', API_URL);
      logDebug('✅ API_URL 已設置:', API_URL);
      return true;
    }

    throw new Error('API_URL 未設置，無法初始化 API 客戶端');
  } catch (error) {
    console.error('❌ API 客戶端初始化失敗:', error.message);
    return false;
  }
}

/**
 * 設置 API_URL（手動設置）
 * @param {string} url GAS Web App 的 URL
 */
function setApiUrl(url) {
  API_URL = url;
  localStorage.setItem('gasApiUrl', url);
  logDebug('✅ API_URL 已設置:', API_URL);
}

// ==================== 內部工具函數 ====================

function logDebug(...args) {
  if (API_CONFIG.debug) {
    console.log('[API]', ...args);
  }
}

function logError(...args) {
  console.error('[API]', ...args);
}

/**
 * 執行帶重試的 fetch
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // 重試邏輯
    if (retryCount < API_CONFIG.retryCount && error.name !== 'AbortError') {
      logDebug(`⚠️ 請求失敗，重試 (${retryCount + 1}/${API_CONFIG.retryCount})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
      return fetchWithRetry(url, options, retryCount + 1);
    }

    logError('❌ 請求失敗:', error.message);
    throw error;
  }
}

// ==================== GET 請求 ====================

/**
 * 發送 GET 請求
 * @param {string} endpoint 端點名稱
 * @param {object} params 查詢參數
 * @returns {Promise<object>} API 回應
 */
async function apiGet(endpoint, params = {}) {
  if (!API_URL) {
    return {
      success: false,
      error: '❌ API_URL 未設置'
    };
  }

  try {
    // 構建查詢字符串
    const queryParams = new URLSearchParams({
      action: 'api',
      endpoint: endpoint,
      ...params
    });

    const url = `${API_URL}?${queryParams.toString()}`;
    logDebug('GET 請求:', url);

    const data = await fetchWithRetry(url);
    logDebug('GET 回應:', data);
    return data;
  } catch (error) {
    logError(`GET ${endpoint} 失敗:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==================== POST 請求 ====================

/**
 * 發送 POST 請求
 * @param {string} endpoint 端點名稱
 * @param {object} data 請求資料
 * @returns {Promise<object>} API 回應
 */
async function apiPost(endpoint, data = {}) {
  if (!API_URL) {
    return {
      success: false,
      error: '❌ API_URL 未設置'
    };
  }

  try {
    const payload = {
      endpoint: endpoint,
      data: data
    };

    logDebug('POST 請求:', endpoint, data);

    const response = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    logDebug('POST 回應:', response);
    return response;
  } catch (error) {
    logError(`POST ${endpoint} 失敗:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==================== 系統端點 ====================

/**
 * 獲取 GAS Script URL
 */
async function getScriptUrl() {
  return apiGet('script_url');
}

/**
 * 初始化系統
 */
async function initSystem() {
  return apiGet('init_system');
}

/**
 * 暖機（預加載快取）
 */
async function warmUpSummaryCache() {
  return apiGet('warmup');
}

// ==================== 捐贈操作 ====================

/**
 * 新增捐贈
 * @param {object} formData 表單資料
 *   - donationDate: 捐贈日期
 *   - donorName: 捐贈者
 *   - itemName: 物品名稱
 *   - quantity: 數量
 *   - unitRatio: 單位比例
 *   - unit: 單位
 *   - location: 位置
 *   - handler: 經手人
 *   - expiryDate: 有效期限
 *   - color: 顏色規格
 *   - itemStatus: 庫存屬性
 * @returns {Promise<object>} { success, row, category, error }
 */
async function addDonation(formData) {
  return apiPost('donation_add', formData);
}

/**
 * 獲取捐贈清單
 */
async function getDonationList(limit = 100) {
  return apiGet('donation_list', { limit });
}

/**
 * 獲取最近捐贈（含庫存狀態）
 * @param {number} limit 數量限制
 * @returns {Promise<object>} { success, recent, inventory }
 */
async function getRecentDonationsLite(limit = 20) {
  return apiGet('recent_donations', { limit });
}

/**
 * 獲取位置資料（含地圖）
 */
async function getLocationData() {
  return apiGet('location_data');
}

/**
 * 獲取已借出的資產列表
 */
async function getBorrowedAssets() {
  return apiGet('borrowed_assets');
}

/**
 * 獲取全部庫存摘要
 */
async function getSummaryData() {
  return apiGet('summary_data');
}

/**
 * 獲取領借用清單
 */
async function getWithdrawInventory(forceRefresh = false) {
  return apiGet('withdrawal_inventory', { forceRefresh: forceRefresh ? 'true' : 'false' });
}

/**
 * 獲取報廢詳細資訊
 */
async function getScrapDetails() {
  return apiGet('scrap_details');
}

/**
 * 獲取位置列表
 */
async function getLocationList() {
  return apiGet('location_list');
}

/**
 * 同步分類規則
 */
async function syncCategoryRules() {
  return apiGet('sync_category_rules');
}

/**
 * 上傳照片（背景處理）
 * @param {number} row 表單行號
 * @param {string} base64Data Base64 圖片資料
 * @param {string} itemName 物品名稱
 * @param {string} spec 規格
 * @param {string} locationName 位置名稱
 * @returns {Promise<object>} { success, url, error }
 */
async function uploadPhoto(row, base64Data, itemName, spec, locationName) {
  return apiPost('photo_upload', {
    row,
    photoData: base64Data,
    itemName,
    spec,
    locationName
  });
}

// ==================== 資產查詢 ====================

/**
 * 搜索資產（補充庫存）
 * @param {string} keyword 搜索關鍵字
 * @param {boolean} forceRefresh 強制重新整理
 * @returns {Promise<array>} 資產清單
 */
async function searchAssets(keyword, forceRefresh = false) {
  return apiGet('asset_search', {
    keyword,
    forceRefresh: forceRefresh ? 'true' : 'false'
  });
}

/**
 * 獲取所有資產位置
 * @returns {Promise<object>} { success, locations }
 */
async function getAssetLocations() {
  return apiGet('asset_locations');
}

/**
 * 查詢特定資產編號的行資訊
 * @param {string} assetId 資產編號
 * @returns {Promise<object>} { success, rows }
 */
async function findAssetRows(assetId) {
  return apiGet('asset_rows', { id: assetId });
}

// ==================== 資產操作（未實裝） ====================

/**
 * 新增資產
 */
async function addAsset(assetData) {
  return apiPost('asset_add', assetData);
}

/**
 * 轉移資產
 */
async function transferAsset(transferData) {
  return apiPost('asset_transfer', transferData);
}

// ==================== 公開 API ====================

// 匯出所有函數到全域（供 HTML 頁面使用）
window.GAS_API = {
  // 初始化
  init: initApiClient,
  setUrl: setApiUrl,

  // 系統
  getScriptUrl,
  initSystem,
  warmUp: warmUpSummaryCache,

  // 捐贈
  addDonation,
  getDonationList,
  getRecentDonationsLite,
  getNearExpiryLite,
  uploadPhoto,

  // 資產
  searchAssets,
  getAssetLocations,
  findAssetRows,
  getLocationData,
  getBorrowedAssets,
  getSummaryData,
  getWithdrawInventory,
  getScrapDetails,
  getLocationList,
  syncCategoryRules,
  addAsset,
  transferAsset,

  // 配置
  config: API_CONFIG
};

// 也可以直接訪問（不用透過 GAS_API）
// 但建議使用 GAS_API. 前綴以避免命名衝突

} // 結束瀏覽器環境檢查
