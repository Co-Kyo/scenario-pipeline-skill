// Service Worker - 三层缓存协作演示

const CACHE_NAME = 'api-v1';
const STATIC_CACHE = 'static-v1';

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/style.css',
  '/app.js',
];

// ========== Install 阶段 ==========
self.addEventListener('install', event => {
  console.log('[SW] Install: 预缓存静态资源');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // 立即激活
  );
});

// ========== Activate 阶段 ==========
self.addEventListener('activate', event => {
  console.log('[SW] Activate: 清理旧缓存');
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map(name => {
            console.log(`[SW] 删除旧缓存: ${name}`);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())  // 立即接管所有客户端
  );
});

// ========== Fetch 拦截 ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API 请求：Network-First 策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 静态资源：Cache-First 策略
  event.respondWith(cacheFirst(event.request));
});

// ========== 缓存策略实现 ==========

/**
 * Cache-First：先查缓存，未命中再请求网络
 * 适用于：静态资源（JS/CSS/图片）
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log(`[SW] Cache-First HIT: ${request.url}`);
    return cached;
  }

  console.log(`[SW] Cache-First MISS: ${request.url}`);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 网络也失败，返回离线页面
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network-First：先请求网络，失败则回退到缓存
 * 适用于：API 数据、HTML 页面
 */
async function networkFirst(request) {
  try {
    console.log(`[SW] Network-First: 尝试网络 ${request.url}`);
    const response = await fetch(request);

    if (response.ok) {
      // 网络成功，更新缓存
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      console.log(`[SW] Network-First: 网络成功，已更新缓存`);

      // 通知客户端缓存已更新
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHE_UPDATED', url: request.url });
      });

      return response;
    }

    // 服务器错误，尝试缓存
    const cached = await caches.match(request);
    if (cached) {
      console.log(`[SW] Network-First: 服务器错误，返回缓存`);
      return cached;
    }

    return response;

  } catch (err) {
    // 网络失败，回退到缓存
    console.log(`[SW] Network-First: 网络失败 (${err.message})`);
    const cached = await caches.match(request);

    if (cached) {
      console.log(`[SW] Network-First: 返回缓存数据`);
      // 添加标记，让客户端知道这是缓存数据
      const headers = new Headers(cached.headers);
      headers.set('X-From-SW-Cache', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: headers,
      });
    }

    // 完全无缓存
    return new Response(JSON.stringify({
      error: 'Offline',
      message: '无网络连接且无缓存数据'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
