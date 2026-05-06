# P2-首屏白屏 — 最小可运行实验

## 实验目标
对比三种渲染策略（SSR / SSG / CSR）的首屏加载性能差异，直观感受白屏时间。

## 实验内容
`src/index.html` 是一个纯前端实验，通过模拟三种场景的资源加载瀑布图，展示：
1. **CSR（传统 SPA）**：空 HTML → 下载 JS → 执行 → 渲染 → 白屏时间最长
2. **SSR**：服务端预渲染 HTML → 浏览器直接显示 → Hydration → 白屏时间最短
3. **SSG**：预生成静态 HTML → CDN 直接返回 → Hydration → 白屏时间极短

## 运行方式

```bash
# 直接在浏览器中打开
open src/index.html

# 或使用本地服务器
cd src && python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

## 观察要点
1. **白屏时间**：从页面开始加载到第一个像素出现的时间
2. **FCP（First Contentful Paint）**：首次内容绘制
3. **TTI（Time to Interactive）**：可交互时间
4. **资源瀑布图**：CSS/JS/HTML 的加载顺序和阻塞关系

## 对应能力
- A1-浏览器渲染管线：CRP 全链路
- A5-HTTP缓存协议：缓存策略对首屏的影响
- A7-资源加载策略：preload/fetchpriority 优先级
- A9-模块系统与构建优化：Code Splitting 对首屏体积的影响
- A13-SSR/Hydration机制：SSR vs CSR 核心差异
