const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const STATIC_DIR = __dirname;

// 模拟版本号（部署时更新）
let deployVersion = 'v1';

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// 生成 ETag（内容哈希）
function generateETag(content) {
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

// 缓存策略配置
const CACHE_POLICIES = {
  '.html': 'no-cache',           // HTML：每次验证
  '.css': 'public, max-age=30',  // CSS：30 秒强缓存（方便实验观察）
  '.js': 'public, max-age=30',   // JS：30 秒强缓存
  '.json': 'private, max-age=10',// API 数据：10 秒私有缓存
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(STATIC_DIR, url.pathname === '/' ? '/index.html' : url.pathname);

  // 安全检查
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // API 端点：模拟动态数据
  if (url.pathname === '/api/data') {
    const data = JSON.stringify({
      message: `Hello from server! Version: ${deployVersion}`,
      timestamp: new Date().toISOString(),
      version: deployVersion,
    });
    const etag = generateETag(data);

    // 协商缓存检查
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304, {
        'ETag': etag,
        'Cache-Control': 'private, max-age=10',
      });
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=10',
      'ETag': etag,
      'X-Deploy-Version': deployVersion,
      // 模拟 CDN 头
      'X-Cache': 'MISS',
      'Age': '0',
    });
    res.end(data);
    return;
  }

  // 静态文件服务
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const etag = generateETag(content);
    const cacheControl = CACHE_POLICIES[ext] || 'public, max-age=60';

    // 协商缓存检查
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304, {
        'ETag': etag,
        'Cache-Control': cacheControl,
      });
      res.end();
      return;
    }

    // 正常响应
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'ETag': etag,
      'Last-Modified': new Date().toUTCString(),
      'X-Deploy-Version': deployVersion,
      // 模拟 CDN 头
      'X-Cache': Math.random() > 0.5 ? 'HIT' : 'MISS',
      'Age': String(Math.floor(Math.random() * 60)),
    };

    // Service Worker 文件特殊处理：不缓存
    if (filePath.endsWith('sw.js')) {
      headers['Cache-Control'] = 'no-cache, no-store';
      headers['Service-Worker-Allowed'] = '/';
    }

    res.writeHead(200, headers);
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 缓存实验服务器启动: http://localhost:${PORT}`);
  console.log(`📦 当前部署版本: ${deployVersion}`);
  console.log(`\n📋 缓存策略:`);
  console.log(`   HTML: no-cache (每次验证)`);
  console.log(`   CSS/JS: max-age=30 (30秒强缓存)`);
  console.log(`   API: private, max-age=10`);
  console.log(`   SW: no-cache, no-store`);
  console.log(`\n💡 提示:`);
  console.log(`   - 修改此文件中的 deployVersion 并重启可模拟新版本部署`);
  console.log(`   - 在 DevTools Network 面板观察缓存行为`);
  console.log(`   - 勾选 Offline 测试离线回退`);
});
