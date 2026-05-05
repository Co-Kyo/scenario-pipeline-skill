# A21 - 接口合并与 BFF

## 核心机制

BFF（Backend For Frontend）是一种架构模式，在微服务后端和前端之间增加一个聚合层，针对前端页面需求编排和合并后端接口，减少前端请求次数和数据冗余。

### 问题背景

微服务架构下，一个页面往往需要调用多个后端服务：
- 首页 = 用户服务 + 推荐服务 + 通知服务 + 广告服务
- 每个服务独立部署，前端需要发 4+ 个请求
- 各接口返回格式不统一，前端需要大量数据转换
- 移动端带宽有限，多次请求的开销更大

### BFF 架构

```
[Web/Mobile Client]
        │
   [BFF Layer]  ← 接口聚合、裁剪、编排
   ┌────┼────┐
[用户服务] [推荐服务] [通知服务]
```

BFF 层的职责：
- **接口聚合**：将多个微服务调用合并为一个前端请求
- **数据裁剪**：根据页面需求只返回必要字段，减少传输量
- **格式统一**：将不同服务的响应格式标准化为前端友好的格式
- **端适配**：Web 端和移动端可能需要不同的数据粒度

### GraphQL 聚合

GraphQL 天然适合做 BFF：

```graphql
query HomePage {
  user { name, avatar }
  notifications { count, latest { title, time } }
  recommendations(limit: 5) { id, title, image }
}
```

- 一次请求获取所有需要的数据
- 前端精确声明需要的字段，避免 over-fetching
- Schema 作为前后端契约

### 接口编排模式

- **串行编排**：B 依赖 A 的结果时必须串行（如先获取 userId 再获取订单）
- **并行编排**：无依赖关系的请求用 `Promise.all` 并行执行
- **扇出聚合（Fan-out/Fan-in）**：一个请求扇出到多个服务，并行获取后聚合返回
- **瀑布降级**：关键数据优先返回，非关键数据延迟加载或降级

### 接口合并的替代方案

- **HTTP/2 多路复用**：单连接并发，减少连接开销但请求次数不变
- **`<link rel="preload">`**：预加载关键资源
- **GraphQL DataLoader**：在服务端合并同类查询（N+1 问题）
- **gRPC 流式传输**：适合大量小请求的场景

## 工程瓶颈

1. **BFF 层成为新的单点和瓶颈**：所有前端流量经过 BFF，需要高可用和水平扩展。BFF 故障影响所有前端。
2. **数据一致性**：聚合多个服务的数据时，各服务的数据可能处于不同时间点，返回的聚合数据可能是不一致的快照。
3. **错误处理复杂**：部分子请求失败时，需要决定是整体失败还是部分降级返回。
4. **缓存策略复杂**：聚合接口的缓存失效依赖所有子服务的数据变化，TTL 设置困难。
5. **BFF 维护成本**：每个页面/端可能需要不同的聚合逻辑，BFF 代码量随业务增长膨胀。

## 调试工具

- **GraphQL Playground / GraphiQL**：GraphQL BFF 的交互式调试工具
- **Postman / Insomnia**：REST 接口调试，支持批量请求
- **Chrome DevTools → Network**：观察合并前后的请求数量和大小差异
- **Zipkin / Jaeger**：分布式链路追踪，定位 BFF 内部各服务调用的耗时
- **GraphQL Extensions**：返回每个 resolver 的执行时间

## 典型权衡

1. **接口合并 vs 代码复杂度**：合并减少请求次数但增加 BFF 层逻辑和维护成本。小项目直接多调几个接口更简单；大项目/移动端收益明显。
2. **GraphQL vs REST BFF**：GraphQL 灵活但学习曲线和工具链成本高；REST BFF 简单直接但灵活性差。常见选择：内部用 REST，对外/复杂页面用 GraphQL。
3. **聚合粒度**：过粗的聚合导致 BFF 臃肿且缓存命中率低；过细的聚合则失去合并意义。通常按页面/组件维度划分。

## 最小验证实验

```javascript
// 1. Node.js BFF 聚合示例
const express = require('express');
const app = express();

app.get('/api/homepage', async (req, res) => {
  // 并行请求多个后端服务
  const [user, posts, notifications] = await Promise.all([
    fetch('http://user-service/api/user').then(r => r.json()),
    fetch('http://post-service/api/posts').then(r => r.json()),
    fetch('http://notify-service/api/notifications').then(r => r.json()),
  ]);
  
  // 裁剪和聚合
  res.json({
    user: { name: user.name, avatar: user.avatar },
    posts: posts.slice(0, 5).map(p => ({ id: p.id, title: p.title })),
    unreadCount: notifications.filter(n => !n.read).length,
  });
});

// 2. 对比：合并前 3 个请求 vs 合并后 1 个请求
// 在 Network 面板中观察请求数量和总耗时差异
```

## 参考资料

- [Sam Newman: Pattern: Backends For Frontends](https://samnewman.io/patterns/architectural/bff/)
- [Netflix: BFF Pattern](https://netflixtechblog.com/our-learnings-from-adopting-graphql-f712ef39a864)
- [GraphQL Official](https://graphql.org/)
- [GraphQL-BFF: 微服务背景下的前后端数据交互方案](https://www.infoq.cn/article/8CTAakhd*EsUtwqIcGNl)
- [web.dev: Reduce HTTP Requests](https://web.dev/articles/reduce-network-payloads-using-text-compression)
