// Vercel Serverless Function — GAS API 代理
//
// 為什麼需要這支代理：
// Google Apps Script 的 ContentService 無法真正設定回應 Header
// （Access-Control-Allow-Origin 等），所以瀏覽器直接呼叫
// script.google.com 一定會被 CORS 政策擋下，這是 GAS 平台本身的限制，
// 不是設定問題。改由這支伺服器端 function 轉發請求，因為伺服器對
// 伺服器的呼叫不受瀏覽器 CORS 限制，前端只需改打同源的 /api/gas。
//
// 部署方式：在 Vercel 專案的 Environment Variables 設定 GAS_API_URL，
// 未設定時退回使用下方預設值。

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbx3H3tiQ44DYtyfge22k3PdmTTxteC6bmTB38wU5pzXm7mdmcdZdv2NBesVHxBECM78/exec';
// GAS 冷啟動（專案閒置一段時間後第一次被叫醒）實測要 20-37 秒，
// 這裡給足夠的餘裕，避免把「還在跑、只是慢」誤判成逾時失敗。
const UPSTREAM_TIMEOUT_MS = 55000;

async function handler(req, res) {
  const gasUrl = process.env.GAS_API_URL || DEFAULT_GAS_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    let targetUrl = gasUrl;
    const fetchOptions = { method: req.method, redirect: 'follow', signal: controller.signal };

    if (req.method === 'GET') {
      const queryIndex = req.url.indexOf('?');
      const queryString = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
      targetUrl = gasUrl + queryString;
    } else if (req.method === 'POST') {
      // 前端以 text/plain 傳送 JSON 字串（避開瀏覽器 preflight），
      // Vercel 會把 text/plain body 原封不動放進 req.body（字串）
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      fetchOptions.body = body;
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    } else {
      clearTimeout(timeoutId);
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ success: false, error: '不支援的方法: ' + req.method });
      return;
    }

    const gasRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);
    const text = await gasRes.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(gasRes.status).send(text);
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    res.status(isTimeout ? 504 : 502).json({
      success: false,
      error: (isTimeout ? 'GAS 上游逾時（超過 ' + (UPSTREAM_TIMEOUT_MS / 1000) + ' 秒）' : 'GAS 代理請求失敗: ' + err.message)
    });
  }
}

// 一定要在 module.exports 已經指向最終的 handler 之後才附加 .config，
// 順序顛倒的話 Vercel 讀不到，會直接套用它自己的預設逾時（遠低於 60 秒）
handler.config = { maxDuration: 60 };
module.exports = handler;
