// API 配置
// 改打同源的 /api/gas（Vercel Serverless Function），
// 由它在伺服器端轉發到 GAS，避開瀏覽器 CORS 限制。
// 真正的 GAS URL 設定在 frontend/api/gas.js（或 Vercel 環境變數 GAS_API_URL）。

window.GAS_API_URL = '/api/gas';




