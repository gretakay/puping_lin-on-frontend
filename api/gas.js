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

module.exports = async (req, res) => {
  const gasUrl = process.env.GAS_API_URL || DEFAULT_GAS_URL;

  try {
    let targetUrl = gasUrl;
    const fetchOptions = { method: req.method, redirect: 'follow' };

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
      res.setHeader('Allow', 'GET, POST');
      res.status(405).json({ success: false, error: '不支援的方法: ' + req.method });
      return;
    }

    const gasRes = await fetch(targetUrl, fetchOptions);
    const text = await gasRes.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(gasRes.status).send(text);
  } catch (err) {
    res.status(502).json({ success: false, error: 'GAS 代理請求失敗: ' + err.message });
  }
};
