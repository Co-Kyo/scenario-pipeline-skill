# Service Worker编程式缓存

> ID: A11 | 扇出: 1/8 | 耦合度: 1 | 战略价值: 1.0

## 核心机制

### Service Worker 生命周期

Service Worker 是运行在浏览器后台的独立 JavaScript 线程，通过事件驱动模型拦截网络请求并实现编程式缓存控制。其完整生命周期包含三个阶段：

1. **注册（Registration）**：通过 `navigator.serviceWorker.register('/sw.js', { scope: '/' })` 注册，指定作用域（scope）控制可拦截的 URL 范围。必须在 HTTPS 安全上下文中运行（localhost 除外）。

2. **安装（Install）**：首次下载或字节级更新时触发 `install` 事件。标准做法是在此阶段预缓存关键资源：
   ```js
   self.addEventListener('install', event => {
     event.waitUntil(
       caches.open('app-shell-v1')
         .then(cache => cache.addAll(['/index.html', '/styles.css', '/app.js']))
     );
   });
   ```
   `event.waitUntil()` 确保预缓存完成前 Service Worker 不会进入激活状态。

3. **激活（Activate）**：旧版本 Service Worker 无活跃客户端时触发 `activate` 事件。标准做法是清理旧缓存：
   ```js
   self.addEventListener('activate', event => {
     event.waitUntil(
       caches.keys().then(names =>
         Promise.all(names.filter(n => n !== 'app-shell-v1').map(n => caches.delete(n)))
       )
     );
   });
   ```

**关键方法**：
- `self.skipWaiting()`：跳过等待阶段，立即激活新版本
- `clients.claim()`：激活后立即接管所有未受控客户端
- `InstallEvent.addRoutes()`：静态路由，绕过 Service Worker 启动开销直接获取资源

### Cache API

Cache 接口提供 `Request`/`Response` 对的持久化存储，独立于 HTTP 缓存头：

| 方法 | 作用 |
|------|------|
| `cache.match(request)` | 返回第一个匹配的 Response |
| `cache.matchAll(request)` | 返回所有匹配的 Response 数组 |
| `cache.add(url)` | fetch + put 的语法糖 |
| `cache.addAll(urls)` | 批量预缓存 |
| `cache.put(request, response)` | 手动写入缓存（需 clone Response） |
| `cache.delete(request)` | 删除匹配项 |
| `cache.keys()` | 返回所有缓存 key |

**CacheStorage**：通过 `caches.open(name)` 获取命名缓存空间，`caches.keys()` 列出所有缓存，`caches.delete(name)` 删除指定缓存。

**注意事项**：
- Cache API **不遵循** HTTP 缓存头（Cache-Control 等），需自行实现过期逻辑
- 匹配算法依赖 `VARY` 头，跨域 opaque 响应无法检查 headers
- 浏览器对单源有配额限制，通过 `navigator.storage.estimate()` 查询使用量
- `Response` 存入缓存时 `Set-Cookie` 头已被剥离

### 缓存策略

通过 `fetch` 事件拦截请求，结合 Cache API 实现不同策略：

#### 1. Cache-First（缓存优先）
先查缓存，命中则直接返回；未命中则网络请求并写入缓存。适合**静态资源**（JS/CSS/图片/字体）。

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const clone = response.clone();
      caches.open('static-v1').then(cache => cache.put(event.request, clone));
      return response;
    }))
  );
});
```

#### 2. Network-First（网络优先）
先走网络，失败则回退缓存。适合**需要实时性但需离线兜底**的内容（API 数据、动态页面）。

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

#### 3. Stale-While-Revalidate（陈旧-重验证）
立即返回缓存，同时后台发起网络请求更新缓存。适合**频繁读取但偶尔更新**的资源（用户头像、配置）。

```js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        caches.open('swr-v1').then(cache => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || networkFetch;
    })
  );
});
```

#### 4. Network-Only（仅网络）
不使用缓存，始终走网络。适合**不应缓存**的请求（非 GET、认证接口）。

#### 5. Cache-Only（仅缓存）
只从缓存读取，不发网络请求。适合**预缓存后完全离线**的场景。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 缓存版本污染 | 版本号未更新或旧缓存未清理 | 用户加载到过时资源，界面行为异常 | DevTools → Application → Cache Storage 检查缓存列表；对比文件哈希 | 使用内容哈希命名缓存（如 `app-v2.1.3`）；在 `activate` 事件中清理旧缓存 |
| 2 | 首次加载延迟 | Service Worker 注册+安装+激活需要时间 | 首次访问页面白屏或加载变慢 | Performance 面板观察 SW 启动耗时；Lighthouse PWA 审计 | 使用 `InstallEvent.addRoutes()` 静态路由绕过 SW；`skipWaiting()` + `clients.claim()` 加速接管 |
| 3 | 缓存配额溢出 | 缓存数据超出浏览器单源配额 | 新资源无法写入缓存，旧缓存被浏览器强制清除 | `navigator.storage.estimate()` 监控使用量；Chrome DevTools → Application → Storage | 实现 LRU 淘汰策略；限制缓存资源数量和大小；定期清理 |
| 4 | 跨域缓存失败 | 跨域请求返回 opaque 响应 | 缓存 match 失败或无法检查响应状态 | 检查 `response.type === 'opaque'` | 使用 CORS 模式请求（`fetch(url, { mode: 'cors' })`）；接受 opaque 响应的限制 |
| 5 | 缓存一致性问题 | 多标签页/多实例同时操作缓存 | 不同标签页显示不同版本内容 | 多标签页对比资源版本；监控 SW 控制的 clients | 使用版本化缓存名 + 消息通道通知客户端更新；`clients.claim()` 统一接管 |
| 6 | 更新不可见 | 新 SW 安装但旧版本仍在服务 | 用户长时间使用旧版本，新功能/修复不可达 | 监听 `controllerchange` 事件；定期检查 `navigator.serviceWorker.controller` | `skipWaiting()` + `clients.claim()` 立即激活；向用户提示"有新版本可用" |
| 7 | POST 请求缓存盲区 | Cache API 仅支持 GET 请求 | POST/PUT 等请求无法被缓存 | 监控非 GET 请求的 fetch 事件 | 使用 IndexedDB 缓存 POST 响应；将数据 GET 化（RESTful 设计） |

## 调试工具

| 工具 | 用法 |
|------|------|
| **Chrome DevTools → Application → Service Workers** | 查看注册状态、生命周期阶段，支持 Update/Unregister/Stop 操作 |
| **Chrome DevTools → Application → Cache Storage** | 浏览所有缓存空间和缓存项，支持手动删除 |
| **Chrome DevTools → Network → Disable cache** | 勾选后可禁用浏览器缓存，观察 SW 缓存行为 |
| **Lighthouse PWA 审计** | 自动检测 SW 注册、离线能力、预缓存清单等合规项 |
| **Workbox（Google）** | `workbox-webpack-plugin` / `workbox-build` 提供开箱即用的缓存策略和预缓存清单生成 |
| **Service Worker Toolbox** | Google 维护的轻量级路由+缓存策略库 |
| **`navigator.serviceWorker.getRegistrations()`** | 控制台命令查看所有已注册的 SW 实例 |
| **`caches.keys()` / `caches.open()`** | 控制台命令直接操作 CacheStorage，调试缓存内容 |
| **`self.clients.matchAll()`** | SW 内部命令，查看当前受控的客户端列表 |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|-------|-------|---------|
| **激活策略** | `skipWaiting()` + `clients.claim()` 立即接管 | 等待所有客户端关闭后自然激活 | 对实时性要求高的应用（如电商）用 A；对稳定性要求高的应用（如金融）用 B，配合"新版本提示" |
| **缓存粒度** | 整页缓存（App Shell 模式） | 单资源细粒度缓存 | SPA/PWA 用 A；内容型网站用 B，便于差异化策略 |
| **离线策略** | Network-First 全局应用 | 按资源类型混合策略 | 简单场景用 A 快速上线；生产环境用 B（静态 Cache-First + API Network-First） |
| **缓存更新** | 版本化缓存名 + 全量替换 | 内容哈希 + 增量更新 | 小型项目用 A 简单可靠；大型项目用 B 节省带宽 |
| **存储方案** | Cache API 存 Response | IndexedDB 存结构化数据 | HTTP 资源用 Cache API（原生优化）；非 GET/自定义数据用 IndexedDB |
| **工具链** | 手写 SW | Workbox 框架 | 学习/简单场景手写理解原理；生产环境用 Workbox 减少出错 |

## 最小验证实验

```js
// === sw.js ===
const CACHE_NAME = 'demo-v1';

// 1. 安装阶段：预缓存关键资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/index.html', '/style.css', '/app.js']))
  );
  self.skipWaiting();
});

// 2. 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// 3. Fetch 拦截：Cache-First 策略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
```

```html
<!-- index.html 中注册 Service Worker -->
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg.scope))
    .catch(err => console.error('SW registration failed:', err));
}
</script>
```

**验证步骤**：
1. 在本地服务器（如 `npx serve`）运行上述代码
2. 打开 Chrome DevTools → Application → Service Workers，确认注册成功
3. 刷新页面，Network 面板中预缓存资源应显示 `(from ServiceWorker)`
4. 勾选 DevTools → Network → Offline，刷新页面，预缓存资源仍可加载
5. 修改 `CACHE_NAME` 为 `'demo-v2'`，刷新页面，在 Cache Storage 中确认旧缓存被清除

## 参考资料

1. [MDN - Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
2. [MDN - Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
3. [MDN - Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
4. [web.dev - Service Worker Lifecycle](https://web.dev/articles/service-worker-lifecycle)
5. [Google Chrome Samples - Selective Caching](https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/selective-caching/service-worker.js)
6. [W3C Service Workers Nightly Spec](https://w3c.github.io/ServiceWorker/)
7. [Workbox - Google's Service Worker Libraries](https://developer.chrome.com/docs/workbox/)
8. [RFC 5861 - HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861)
