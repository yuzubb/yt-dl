// server.js
const express = require('express');
// node-fetch は、Node.jsのバージョンによってはネイティブで利用可能ですが、
// 互換性のため require しておくと安心です。
const fetch = require('node-fetch'); 

const app = express();
const port = process.env.PORT || 3000;

// Vercelで設定した環境変数からAPIキーを読み込む
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// 定数
const API_HOST = 'yt-api.p.rapidapi.com';

// ----------------------------------------------------
// ヘルパー関数: 外部APIへのリクエストを抽象化し、重複を減らす
// ----------------------------------------------------
async function fetchRapidApi(endpoint, params, reqType) {
    if (!RAPIDAPI_KEY) {
        throw new Error('Server configuration error: RAPIDAPI_KEY not set.');
    }
    
    // パラメータをクエリ文字列に変換
    const searchParams = new URLSearchParams(params);
    const url = `https://${API_HOST}${endpoint}?${searchParams.toString()}`;

    console.log(`Processing ${reqType} request to: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-rapidapi-host': API_HOST,
            'x-rapidapi-key': RAPIDAPI_KEY
        }
    });

    if (!response.ok) {
        // APIからのエラー情報を取得 (JSONを試行し、失敗したらテキストとして取得)
        const errorData = await response.json().catch(() => response.text());
        throw {
            status: response.status,
            message: `External RapidAPI request failed (${reqType}).`,
            details: errorData
        };
    }

    return response.json();
}

// ----------------------------------------------------
// 1. GET /stream/:videoid (動画情報)
// ----------------------------------------------------
app.get('/stream/:videoid', async (req, res) => {
    const videoid = req.params.videoid;
    const DEFAULT_GEO = 'DE'; 

    if (!videoid) {
        return res.status(400).json({ error: 'Missing video ID in the URL path.' });
    }

    try {
        const data = await fetchRapidApi('/dl', { id: videoid, cgeo: DEFAULT_GEO }, 'stream');
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.status || 500).json({ 
            error: error.message || 'Internal server error.', 
            details: error.details 
        });
    }
});

// ----------------------------------------------------
// 2. GET /short/:channelid (チャンネルのショート動画)
// ----------------------------------------------------
app.get('/short/:channelid', async (req, res) => {
    const channelid = req.params.channelid;

    if (!channelid) {
        return res.status(400).json({ error: 'Missing channel ID in the URL path.' });
    }

    try {
        const data = await fetchRapidApi('/channel/shorts', { id: channelid }, 'shorts');
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.status || 500).json({ 
            error: error.message || 'Internal server error.', 
            details: error.details 
        });
    }
});

// ----------------------------------------------------
// 3. GET /search?q={query} (検索結果)
// ----------------------------------------------------
app.get('/search', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: 'Missing search query. Usage: /search?q=your_term' });
    }

    try {
        const data = await fetchRapidApi('/search', { query: query }, 'search');
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.status || 500).json({ 
            error: error.message || 'Internal server error.', 
            details: error.details 
        });
    }
});

// ----------------------------------------------------
// 4. GET /trend?geo={geo} (トレンド動画)
// ----------------------------------------------------
app.get('/trend', async (req, res) => {
    // geoが指定されていない場合は 'US' をデフォルト値とする
    const geo = req.query.geo || 'US'; 

    try {
        const data = await fetchRapidApi('/trending', { geo: geo }, 'trending');
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.status || 500).json({ 
            error: error.message || 'Internal server error.', 
            details: error.details 
        });
    }
});

// ----------------------------------------------------
// サーバー起動
// ----------------------------------------------------
// Vercelでは、このポート番号は無視されますが、ローカル実行のために必要です
app.listen(port, () => {
    console.log(`Server running with 4 routes on port ${port}`);
    if (!RAPIDAPI_KEY) {
        console.warn('⚠️ WARNING: RAPIDAPI_KEY is not set in environment variables.');
    }
});
