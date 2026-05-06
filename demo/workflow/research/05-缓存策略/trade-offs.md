# P5-缓存策略 | Trade-offs — 方案对比

## 概述

缓存策略的核心不是"要不要缓存"，而是 **在一致性、性能、复杂度之间做取舍**。本节对比三层缓存中最关键的决策维度。

---

## 一、Service Worker 缓存策略对比

### Cache-First vs Network-First

| 维度 | Cache-First | Network-First |
|------|-------------|---------------|
| **工作方式** | 先查缓存，命中直接返回；未命中再请求网络 | 先请求网络，成功则更新缓存；失败则返回缓存 |
| **适用资源** | 静态资源（JS/CSS/图片/字体） | 动态内容（HTML/API/实时数据） |
| **离线能力** | ✅ 强（只要有缓存就能用） | ✅ 强（网络失败时兜底） |
| **数据新鲜度** | ⚠️ 可能过期 | ✅ 在线时保证最新 |
| **首次加载** | ❌ 首次无缓存，体验无提升 | ✅ 首次即走网络，正常加载 |
| **网络开销** | 低（大部分命中缓存） | 高（每次都请求网络） |
| **实现复杂度** | 低 | 中（需处理失败回退） |

**选择建议：**
```
静态资源（带内容哈希） → Cache-First
HTML/API 数据           → Network-First
高频读低频写的数据      → Stale-While-Revalidate
```

### Stale-While-Revalidate vs 同步验证

| 维度 | Stale-While-Revalidate | 同步验证 |
|------|------------------------|----------|
| **工作方式** | 立即返回旧缓存，后台异步更新 | 等待验证完成后才返回 |
| **用户感知** | 零延迟（立即响应） | 有延迟（等待网络） |
| **数据一致性** | ⚠️ 可能短暂不一致 | ✅ 保证一致 |
| **适用场景** | 新闻流、商品列表、社交动态 | 支付页面、库存、实时数据 |
| **实现复杂度** | 中 | 低 |

**选择建议：**
```
用户能容忍短暂延迟 → Stale-While-Revalidate（体验优先）
数据必须实时准确   → 同步验证（一致性优先）
```

### 按资源类型混合策略

```javascript
// Workbox 配置示例
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'script' ||
                   request.destination === 'style',
  new workbox.strategies.CacheFirst({
    cacheName: 'static-v1',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxEntries: 100 }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-v1',
    networkTimeoutSeconds: 3,
  })
);

workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'api-v1',
  })
);
```

---

## 二、HTTP 缓存机制对比

### 强缓存 vs 协商缓存

| 维度 | 强缓存（Cache-Control/Expires） | 协商缓存（ETag/Last-Modified） |
|------|----------------------------------|-------------------------------|
| **工作方式** | 浏览器直接使用本地副本，不发请求 | 发送条件请求，服务器决定是否返回新内容 |
| **网络请求** | ❌ 无（200 from cache） | ✅ 有（但可能返回 304，极小传输量） |
| **响应速度** | 极快（0ms 级） | 快（一次 RTT，但 304 body 很小） |
| **数据新鲜度** | ⚠️ 新鲜期内可能过期 | ✅ 每次验证，保证最新 |
| **源站压力** | 低（完全不请求） | 中（条件请求仍消耗 CPU） |
| **适用资源** | 静态资源（版本化 URL） | HTML 入口、API 数据 |

**选择建议：**
```
带内容哈希的静态资源 → 强缓存（max-age=1年, immutable）
HTML 入口             → 协商缓存（no-cache + ETag）
API 数据              → 短期强缓存 + stale-while-revalidate
```

### ETag vs Last-Modified

| 维度 | ETag | Last-Modified |
|------|------|---------------|
| **精度** | 精确（内容哈希） | 秒级（时间戳） |
| **计算开销** | 高（需生成哈希） | 低（读取文件时间） |
| **适用场景** | 内容可能不变但时间变了 | 简单文件服务 |
| **分布式一致性** | ✅ 跨服务器一致 | ⚠️ 服务器时间不同步可能不一致 |

**选择建议：**
```
内容可能被覆盖（同 URL 不同内容） → ETag
简单静态文件服务                   → Last-Modified
两者可同时使用（浏览器优先用 ETag） → 都设置
```

### no-cache vs no-store

| 维度 | no-cache | no-store |
|------|----------|----------|
| **含义** | 可以缓存，但每次必须验证 | 完全不缓存 |
| **304 支持** | ✅ 支持（条件请求） | ❌ 不支持（每次都完整传输） |
| **适用场景** | HTML 入口（需要最新但可 304） | 敏感数据（密码、token） |
| **性能** | 好（304 传输量小） | 差（每次都完整传输） |

---

## 三、CDN 架构对比

### 单 CDN vs Multi-CDN

| 维度 | 单 CDN | Multi-CDN |
|------|--------|-----------|
| **管理复杂度** | 低 | 高（多套配置、监控） |
| **成本** | 低 | 高（多服务商费用） |
| **可用性** | ⚠️ 单点风险 | ✅ 高可用（故障切换） |
| **性能** | 依赖单一服务商的节点覆盖 | 可按地域选择最优 CDN |
| **适用场景** | 中小项目、预算有限 | 大型项目、高可用要求 |

**Multi-CDN 策略：**
```
DNS 智能解析 → 按地域/延迟选择 CDN
     ↓
CDN A（亚太）  CDN B（欧美）  CDN C（备用）
     ↓              ↓              ↓
  用户请求 → 最优节点响应
```

### 边缘计算 vs 纯缓存

| 维度 | 纯缓存 CDN | Edge Computing |
|------|------------|----------------|
| **功能** | 只做缓存和分发 | 在边缘执行计算逻辑 |
| **延迟** | 最低（纯缓存命中） | 略高（执行代码） |
| **灵活性** | 低（只能缓存静态内容） | 高（路由、鉴权、格式转换） |
| **适用场景** | 纯静态站点 | 需要动态逻辑的场景 |
| **成本** | 低 | 高（按计算量计费） |

**Edge Computing 典型用例：**
```javascript
// Cloudflare Workers 示例
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // A/B 测试路由
    const cookie = request.headers.get('Cookie');
    const variant = cookie?.includes('variant=B') ? 'B' : 'A';
    url.pathname = `/variants/${variant}${url.pathname}`;

    // 图片格式转换
    const accept = request.headers.get('Accept');
    if (accept.includes('image/avif')) {
      url.pathname = url.pathname.replace('.jpg', '.avif');
    }

    return fetch(url);
  }
};
```

---

## 四、缓存失效策略对比

### 时间失效 vs 版本失效 vs 主动失效

| 维度 | 时间失效（TTL） | 版本失效（内容哈希） | 主动失效（Purge） |
|------|-----------------|---------------------|-------------------|
| **触发方式** | 自动（TTL 到期） | 自动（URL 变化） | 手动/API 调用 |
| **精确度** | 低（过期前可能已变） | 高（内容变了 URL 就变） | 高（精确到 URL） |
| **延迟** | 最长（等 TTL） | 无（部署即生效） | 秒级（Purge 生效时间） |
| **适用资源** | 不太重要的资源 | 静态构建产物 | 紧急更新 |
| **复杂度** | 低 | 中（需要构建工具支持） | 高（需要 Purge 流程） |

**最佳实践组合：**
```
静态资源 = 版本化 URL + 长 TTL（immutable）
HTML     = 短 TTL + stale-while-revalidate + 部署后 Purge
API      = 短 TTL + ETag 协商
```

---

## 五、三层协作模式对比

### 模式一：浏览器缓存主导

```
浏览器: max-age=3600
CDN:    不额外配置（遵循 HTTP 头）
SW:     不使用
```
- **优点**：最简单，零额外配置
- **缺点**：无法精确控制，CDN 和浏览器行为一致
- **适用**：简单项目、静态站点

### 模式二：CDN 缓存主导

```
浏览器: max-age=300
CDN:    s-maxage=86400（CDN 缓存更久）
SW:     不使用
```
- **优点**：CDN 缓存命中率高，源站压力小
- **缺点**：浏览器缓存短，用户刷新可能慢
- **适用**：内容型网站、高流量场景

### 模式三：三层协作

```
浏览器: max-age=3600, immutable（静态资源）
CDN:    s-maxage=86400, stale-while-revalidate
SW:     Cache-First（静态） + Network-First（HTML）
```
- **优点**：每层做最擅长的事，整体最优
- **缺点**：配置复杂，需要理解每层的行为
- **适用**：PWA、大型应用

### 模式四：SW 缓存主导

```
浏览器: no-store（不使用浏览器缓存）
CDN:    不缓存
SW:     完全控制所有缓存逻辑
```
- **优点**：最灵活，代码完全控制
- **缺点**：SW 未激活时无缓存，首次加载慢
- **适用**：离线优先应用

---

## 六、决策矩阵

| 场景 | 浏览器缓存 | CDN 缓存 | SW 缓存 | 推荐模式 |
|------|-----------|----------|---------|----------|
| 静态资源（JS/CSS/图片） | 强缓存 + 版本化 URL | s-maxage=1年 | Cache-First 预缓存 | 三层协作 |
| HTML 入口 | no-cache + ETag | s-maxage=60 + SWR | Network-First | CDN 主导 |
| API 数据 | private, max-age=300 | 不缓存 | Stale-While-Revalidate | SW 主导 |
| 敏感数据 | no-store | 不缓存 | 不缓存 | 无缓存 |
| 离线优先 PWA | 强缓存 | 不缓存 | 全部 Cache-First | SW 主导 |
| 高流量内容站 | 短 TTL | s-maxage=1天 | 不使用 | CDN 主导 |

---

## 小结

没有"最好"的缓存策略，只有"最适合"的组合：

- **一致性要求高** → 短 TTL + 协商缓存 + Network-First
- **性能要求高** → 长 TTL + 版本化 URL + Cache-First
- **离线要求高** → SW 预缓存 + Cache-First + App Shell
- **简单优先** → 只用浏览器缓存 + CDN，不引入 SW
- **灵活优先** → 三层协作，按资源类型分策略
