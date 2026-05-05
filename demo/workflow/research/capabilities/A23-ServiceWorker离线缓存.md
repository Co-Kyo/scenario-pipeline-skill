# A23 - Service Worker 离线缓存

## 核心机制

Service Worker 是运行在浏览器后台的 JavaScript 线程，独立于网页，能够拦截网络请求、管理缓存，是 PWA（Progressive Web App）的核心技术。

### Service Worker 生命周期

1. **注册（Registration）**：主线程通过 `navigator.serviceWorker.register('/sw.js')` 注册
2. **安装（Install）**：首次下载或文件变化时触发 `install` 事件，通常在此预缓存关键资源
   ```javascript
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open('v1').then(cache => 
         cache.addAll(['/index.html', '/styles.css', '/app.js'])
       )
     );
   });
   ```
3. **激活（Activate）**：旧 SW 的所有页面关闭后触发 `activate` 事件，通常在此清理旧缓存
   ```javascript
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then(keys => 
         Promise.all(keys.filter(k => k !== 'v1').map(k => caches.delete(k)))
       )
     );
   });
   ```
4. **空闲 → terminated**：无事件时浏览器可终止 SW，下次需要时重新启动

### Cache API

Cache API 是一个独立于 HTTP 缓存的存储机制，提供细粒度的缓存控制：

```javascript
// 存储
const cache = await caches.open('my-cache');
await cache.put(request, response);

// 匹配
const response = await cache.match(request);
const allMatches = await cache.matchAll(request);

// 删除
await cache.delete(request);

// 列出所有键
const keys = await cache.keys();
```

关键特性：
- Cache API **不遵循 HTTP 缓存头**（`Cache-Control`、`Expires` 等被忽略）
- 需要手动管理缓存的添加、更新和删除
- 支持 `Vary` 头匹配
- 每个源可有多个命名缓存空间
- 存储配额通过 `navigator.storage.estimate()` 查询

### 常见缓存策略

**Cache First（缓存优先）**：
```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```
适用：静态资源（CSS、JS、图片），配合构建时预缓存。

**Network First（网络优先）**：
```javascript
event.respondWith(
  fetch(event.request).catch(() => caches.match(event.request))
);
```
适用：需要最新数据的内容（新闻、API），离线时降级使用缓存。

**Stale While Revalidate（缓存优先 + 后台更新）**：
```javascript
event.respondWith(
  caches.match(event.request).then(cached => {
    const fetchPromise = fetch(event.request).then(response => {
      caches.open('v1').then(cache => cache.put(event.request, response.clone()));
      return response;
    });
    return cached || fetchPromise;
  })
);
```
适用：可容忍短暂过期的内容，兼顾速度和新鲜度。

### Workbox

Google 提供的 Service Worker 工具库，简化缓存策略配置：

```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';

// 预缓存（构建时生成 manifest）
precacheAndRoute(self.__WB_MANIFEST);

// 运行时缓存策略
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 })],
  })
);
```

## 工程瓶颈

1. **缓存失效管理**：SW 缓存不会自动过期，需要手动版本管理和清理逻辑。缓存策略不当可能导致用户长期看到旧版本。
2. **更新延迟**：新 SW 需要等待所有旧页面关闭才能激活，`skipWaiting()` 可强制激活但可能导致新旧资源不一致。
3. **调试困难**：SW 的生命周期状态（installing → waiting → active）和缓存状态需要在 DevTools 中专门查看。
4. **存储配额限制**：浏览器对 SW 缓存有大小限制（Chrome 约为可用磁盘的 60%），超出可能被清除。
5. **HTTPS 要求**：SW 仅在安全上下文（HTTPS 或 localhost）下可用，HTTP 站点无法使用。

## 调试工具

- **Chrome DevTools → Application → Service Workers**：查看注册状态、版本、生命周期
- **Chrome DevTools → Application → Cache Storage**：查看所有缓存内容
- **Chrome DevTools → Application → Storage → Clear site data**：清除所有 SW 和缓存
- **`Update on reload` 选项**：DevTools → Application → Service Workers 中勾选，每次刷新都更新 SW
- **Workbox DevTools 扩展**：可视化 Workbox 缓存策略

## 典型权衡

1. **缓存命中率 vs 数据新鲜度**：Cache First 策略命中率高但数据可能过期；Network First 数据新鲜但离线不可用。通常按资源类型混合使用。
2. **预缓存范围 vs 首次加载速度**：预缓存更多资源提升离线体验但增加首次安装时间。通常只预缓存 App Shell（核心骨架）。
3. **`skipWaiting` 安全性 vs 更新及时性**：跳过等待阶段让用户立即使用新版本，但可能在新旧资源混合状态下出现异常。

## 最小验证实验

```javascript
// 1. 注册 Service Worker
// main.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg.scope));
}

// 2. sw.js - Cache First 策略
const CACHE_NAME = 'v1';
const ASSETS = ['/', '/index.html', '/styles.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// 3. 测试离线
// 打开 Chrome DevTools → Application → Service Workers 确认激活
// 勾选 Network → Offline，刷新页面 → 应从缓存加载
```

## 参考资料

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [web.dev: Service Workers](https://web.dev/articles/service-workers-cache-storage)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [RFC: Service Workers](https://w3c.github.io/ServiceWorker/)
