# P2-首屏白屏 — 坑点提取

> 从 briefing 瓶颈中筛选与首屏加载相关的坑点，按 P0/P1/P2 排序

---

## P0 — 首屏阻塞级（直接导致白屏或严重延迟）

### 1. CSS 渲染阻塞
- **来源**: A1-浏览器渲染管线
- **category**: Style
- **触发条件**: `<link rel='stylesheet'>` 阻塞首屏渲染，关键 CSS 体积大或网络慢
- **症状**: FCP 延迟，白屏时间长
- **版本**: 所有现代浏览器
- **诊断**: Lighthouse → Render-blocking resources

### 2. JS 阻塞 DOM 解析
- **来源**: A1-浏览器渲染管线
- **category**: Parsing
- **触发条件**: `<script>` 标签无 async/defer
- **症状**: DOM 构建延迟，TTFB 后长时间无内容渲染
- **版本**: 所有现代浏览器
- **诊断**: Chrome DevTools Performance → Main

### 3. 首屏 LCP 图片错误使用 lazy
- **来源**: A7-资源加载策略
- **category**: input variation
- **触发条件**: LCP 图片设置了 `loading='lazy'`
- **症状**: LCP 严重延迟，首屏图片不加载
- **版本**: 所有支持 lazy loading 的浏览器
- **诊断**: Lighthouse → LCP element analysis

### 4. Hydration Mismatch
- **来源**: A13-SSR/Hydration机制
- **category**: state transition
- **触发条件**: 客户端首次渲染与服务端 HTML 不一致（日期格式、随机数、浏览器差异）
- **症状**: 事件错位、交互异常、控制台警告
- **版本**: React 18+ / Vue 3+
- **诊断**: 浏览器控制台 Hydration 警告

### 5. JS Bundle 过大导致 TTI 延迟
- **来源**: A13-SSR/Hydration机制
- **category**: resource boundary
- **触发条件**: Hydration 需加载完整客户端 JS bundle
- **症状**: FCP 快（SSR HTML 已到）但 TTI 慢（JS 未执行完），页面不可交互
- **版本**: 所有框架
- **诊断**: Lighthouse → TBT (Total Blocking Time)

### 6. 缓存穿透
- **来源**: A5-HTTP缓存协议
- **category**: resource boundary
- **触发条件**: HTML 入口未配置缓存策略
- **症状**: 每次首屏都需完整网络往返，TTFB 高
- **版本**: 所有浏览器
- **诊断**: Network 面板 → Cache 状态列

### 7. 缓存雪崩
- **来源**: A5-HTTP缓存协议
- **category**: timing
- **触发条件**: 大量资源同时设置相同 max-age，同时过期
- **症状**: 瞬间大量回源请求冲击源站，源站超时
- **版本**: 所有浏览器
- **诊断**: CDN 控制台回源 QPS 突增

### 8. 缓存命中率低
- **来源**: A10-CDN与边缘计算
- **category**: resource boundary
- **触发条件**: 动态内容过多、Cache Key 过细、TTL 设置不合理
- **症状**: 回源率 >20%，首屏延迟升高
- **版本**: 通用
- **诊断**: CDN 控制台命中率监控

### 9. 回源风暴
- **来源**: A10-CDN与边缘计算
- **category**: timing
- **触发条件**: 热点内容同时过期、大促秒杀场景
- **症状**: 源站超时或宕机，首屏请求全部失败
- **版本**: 通用
- **诊断**: 源站 QPS 突增监控、5xx 错误率

### 10. 过度分割
- **来源**: A9-模块系统与构建优化
- **category**: resource boundary
- **触发条件**: SplitChunksPlugin minSize 过小
- **症状**: chunk 数量爆炸，HTTP 请求激增，首屏加载反而变慢
- **版本**: webpack 5+ / Vite
- **诊断**: webpack-bundle-analyzer 可视化

---

## P1 — 首屏体验劣化级（不直接白屏但严重影响体验）

### 11. 大图解码阻塞
- **来源**: A1-浏览器渲染管线
- **category**: Raster
- **触发条件**: 高分辨率图片在 Raster 阶段解码耗时过长
- **症状**: 主线程阻塞，页面卡死
- **版本**: 所有现代浏览器

### 12. preload CORS 模式不匹配
- **来源**: A7-资源加载策略
- **category**: input variation
- **触发条件**: preload 的 crossorigin 属性与实际请求不一致
- **症状**: 资源双重下载，浪费带宽
- **版本**: Chrome 优先检查

### 13. 过多 prefetch 争抢带宽
- **来源**: A7-资源加载策略
- **category**: resource boundary
- **触发条件**: 大量 prefetch 请求与首屏关键资源并行
- **症状**: LCP 退化，首屏关键资源加载被延迟
- **版本**: 所有支持 prefetch 的浏览器

### 14. Tree Shaking 失效
- **来源**: A9-模块系统与构建优化
- **category**: input variation
- **触发条件**: CommonJS 模块混入、模块顶层副作用
- **症状**: 死代码未消除，bundle 体积膨胀
- **版本**: webpack 5+ / Rollup

### 15. 动态 import 加载抖动
- **来源**: A9-模块系统与构建优化
- **category**: input variation
- **触发条件**: 网络不稳定时动态加载 chunk
- **症状**: chunk 加载失败，页面白屏或报错
- **版本**: 所有支持 dynamic import 的浏览器

### 16. 服务端 CPU 瓶颈
- **来源**: A13-SSR/Hydration机制
- **category**: resource boundary
- **触发条件**: 高并发下单线程 Node.js 渲染
- **症状**: SSR 响应延迟，TTFB 高
- **版本**: Node.js 单线程模型

### 17. 数据获取瓶颈
- **来源**: A13-SSR/Hydration机制
- **category**: timing
- **触发条件**: SSR 预取数据受数据库/API 延迟制约
- **症状**: TTFB 高，首屏等待时间长
- **版本**: 所有 SSR 框架

### 18. 跨请求状态污染
- **来源**: A13-SSR/Hydration机制
- **category**: state transition
- **触发条件**: 单例 store 在请求间共享状态
- **症状**: 用户 A 的数据出现在用户 B 的首屏
- **版本**: Node.js SSR 框架

### 19. 缓存一致性延迟
- **来源**: A10-CDN与边缘计算
- **category**: state transition
- **触发条件**: 内容更新后 CDN 缓存未及时失效
- **症状**: 用户看到旧版本首屏内容
- **版本**: 通用

### 20. Vary 过度膨胀
- **来源**: A5-HTTP缓存协议
- **category**: input variation
- **触发条件**: Vary:User-Agent 导致缓存键过多
- **症状**: 缓存命中率骤降，首屏加载变慢
- **版本**: 所有浏览器

---

## P2 — 边缘场景级（特定条件下触发）

### 21. 浏览器 API 不可用
- **来源**: A13-SSR/Hydration机制
- **category**: input variation
- **触发条件**: 服务端代码引用 window/document
- **症状**: 构建失败或运行时报错
- **版本**: Node.js SSR 环境

### 22. 启发式缓存失控
- **来源**: A5-HTTP缓存协议
- **category**: input variation
- **触发条件**: 缺少显式 Cache-Control 头
- **症状**: 浏览器按 Last-Modified 10% 推断有效期，可能长期缓存
- **版本**: 所有浏览器

### 23. preconnect 过多
- **来源**: A7-资源加载策略
- **category**: resource boundary
- **触发条件**: preconnect 超过 6 个域名
- **症状**: 浪费 DNS/TCP 资源，反向增加首屏延迟
- **版本**: 所有现代浏览器

### 24. 重复依赖
- **来源**: A9-模块系统与构建优化
- **category**: resource boundary
- **触发条件**: 多 chunk 引用同依赖不同版本
- **症状**: 同一库被多次打包，bundle 体积膨胀
- **版本**: webpack / Vite

### 25. CDN 故障/单点依赖
- **来源**: A10-CDN与边缘计算
- **category**: resource boundary
- **触发条件**: CDN 服务商宕机或区域网络故障
- **症状**: 网站不可访问或大面积 5xx
- **版本**: 通用
