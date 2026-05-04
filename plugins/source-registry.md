# Plugin: 信源质量白名单 (source-registry)

> 定义能力研究的信源域名优先级、质量分级、反爬黑名单。
> 本文件是 processes/capability-extract.md 和 processes/capability-research.md 的信源配置。
> 可热插拔替换，修改后无需改动其他文件。

---

## 一、信源分级定义

| 级别 | 含义 | 可信度 | 用途 |
|------|------|--------|------|
| T1 | 官方规范、官方文档、官方博客 | 1.0 | 事实来源，必须引用 |
| T2 | 大厂技术博客、高质量社区 | 0.7 | 补充实践案例 |
| T3 | 一般社区、论坛、个人博客 | 0.3 | 热点风向参考，不作为主要依据 |

---

## 二、技术域 → T1 域名映射

```yaml
source_domain_map:

  browser_api:                    # 浏览器 API / Web 标准
    description: "DOM、CSSOM、渲染管线、事件循环、IntersectionObserver 等浏览器 API"
    t1:
      - domain: developer.mozilla.org
        name: "MDN Web Docs"
        search_hint: "site:developer.mozilla.org"
      - domain: w3c.github.io
        name: "W3C 规范"
        search_hint: "site:w3c.github.io"
      - domain: whatwg.org
        name: "WHATWG 规范"
        search_hint: "site:whatwg.org"
    t2:
      - domain: web.dev
        name: "Google Web 技术博客"
        search_hint: "site:web.dev"
      - domain: developer.chrome.com
        name: "Chrome 开发者文档"
        search_hint: "site:developer.chrome.com"

  chrome_v8:                      # Chrome 工具 / V8 引擎
    description: "DevTools、Heap Snapshot、Performance 面板、V8 GC、编译优化"
    t1:
      - domain: developer.chrome.com
        name: "Chrome DevTools 官方文档"
        search_hint: "site:developer.chrome.com"
      - domain: v8.dev
        name: "V8 官方博客"
        search_hint: "site:v8.dev"
    t2:
      - domain: web.dev
        name: "Google Web 技术博客"
        search_hint: "site:web.dev"

  web_performance:                # Web 性能标准
    description: "Core Web Vitals、Paint Timing、Long Tasks、PerformanceObserver"
    t1:
      - domain: web.dev
        name: "web.dev（Core Web Vitals 定义）"
        search_hint: "site:web.dev"
      - domain: w3c.github.io
        name: "W3C 性能规范"
        search_hint: "site:w3c.github.io"
    t2:
      - domain: developer.chrome.com
        name: "Chrome 性能工具文档"
        search_hint: "site:developer.chrome.com"

  http_protocol:                  # HTTP 协议 / 缓存 / CDN
    description: "HTTP 缓存协商、Cache-Control、ETag、CDN、Service Worker"
    t1:
      - domain: developer.mozilla.org
        name: "MDN HTTP 文档"
        search_hint: "site:developer.mozilla.org"
      - domain: httpwg.org
        name: "HTTP Working Group（RFC 规范）"
        search_hint: "site:httpwg.org"
    t2:
      - domain: developers.cloudflare.com
        name: "Cloudflare 技术文档"
        search_hint: "site:developers.cloudflare.com"

  vue:                            # Vue 框架
    description: "Vue 响应式系统、Composition API、Patch Flag、虚拟 DOM"
    t1:
      - domain: vuejs.org
        name: "Vue 官方文档"
        search_hint: "site:vuejs.org"
    t2:
      - domain: github.com/vuejs/core
        name: "Vue 源码"
        search_hint: "site:github.com/vuejs/core"

  react:                          # React 框架
    description: "React Fiber、Hooks、Concurrent Mode、Suspense"
    t1:
      - domain: react.dev
        name: "React 官方文档（新版）"
        search_hint: "site:react.dev"
    t2:
      - domain: legacy.reactjs.org
        name: "React 旧文档"
        search_hint: "site:legacy.reactjs.org"

  webpack:                        # Webpack 构建工具
    description: "Code Splitting、Tree Shaking、持久化缓存、Module Federation"
    t1:
      - domain: webpack.js.org
        name: "Webpack 官方文档"
        search_hint: "site:webpack.js.org"
    t2:
      - domain: github.com/webpack/webpack
        name: "Webpack 源码 Wiki"
        search_hint: "site:github.com/webpack/webpack"

  vite:                           # Vite 构建工具
    description: "ESM 原生加载、预构建、Rollup 产物优化"
    t1:
      - domain: vitejs.dev
        name: "Vite 官方文档"
        search_hint: "site:vitejs.dev"
    t2:
      - domain: github.com/vitejs/vite
        name: "Vite 源码"
        search_hint: "site:github.com/vitejs/vite"

  ecmascript_node:                # ECMAScript / Node.js
    description: "ESM 语义、模块系统、Node.js API"
    t1:
      - domain: tc39.es
        name: "TC39 ECMAScript 规范"
        search_hint: "site:tc39.es"
      - domain: nodejs.org
        name: "Node.js 官方文档"
        search_hint: "site:nodejs.org"
    t2:
      - domain: developer.mozilla.org
        name: "MDN JavaScript 文档"
        search_hint: "site:developer.mozilla.org"
```

---

## 三、能力 → 技术域自动映射规则

根据能力的 `tags` 和 `name` 自动匹配技术域：

| 能力关键词/标签 | 匹配的技术域 |
|---------------|-------------|
| 渲染管线、DOM、CSSOM、事件循环、IntersectionObserver、rAF | browser_api |
| DevTools、Performance 面板、Heap Snapshot、Memory、Lighthouse | chrome_v8 |
| Web Vitals、LCP、FID、CLS、INP、Paint Timing | web_performance |
| HTTP 缓存、Cache-Control、ETag、CDN、Service Worker、Nginx | http_protocol |
| Vue、Proxy、Composition API、Patch Flag、nextTick、响应式 | vue |
| React、Fiber、Hooks、Concurrent、Suspense、setState | react |
| Webpack、Code Splitting、Module Federation、loader、plugin | webpack |
| Vite、ESM、预构建、esbuild、Rollup | vite |
| ESM、CommonJS、require、import、Node.js | ecmascript_node |
| 虚拟列表、虚拟化算法、前缀和、二分 | browser_api（默认，通用浏览器能力） |
| Web Worker、Service Worker、SharedWorker | browser_api + chrome_v8 |
| 图片优化、WebP、AVIF、srcset | web_performance + http_protocol |
| 内存泄漏、GC、V8 垃圾回收 | chrome_v8 |

**多域匹配规则：** 如果一个能力匹配多个技术域，取所有匹配域的 T1 域名合并搜索。

---

## 四、反爬黑名单

> 当某些域名出现反爬、内容质量下降、或被证实不可靠时，加入此列表。

```yaml
blacklist:
  # 格式：
  # - domain: xxx.com
  #   reason: "反爬/付费墙/内容过时/质量不可靠"
  #   added: "2026-05-03"

  # 暂无黑名单条目，后续按需添加
```

**加入黑名单的条件：**
- web_fetch 被 403/429 拦截（反爬）
- 内容需要登录/付费才能查看（付费墙）
- 内容严重过时（如 3 年前的框架版本文档）
- 被证实内容错误或误导

---

## 五、搜索策略模板

在搜索信源时，按以下模板执行：

```
输入：能力名称、技术域
输出：T1 URL 列表、T2 URL 列表

1. 从 source_domain_map 获取该技术域的 T1 域名列表
2. 对每个 T1 域名：
   a. mimo_web_search "<能力名称> site:<域名>"
   b. 取第一个结果
   c. web_fetch 验证：HTTP 200？内容 > 200 字？与能力相关？
   d. 通过 → 记录 URL + title，标记 verified: true
   e. 不通过 → 尝试下一个 T1 域名
3. 所有 T1 无结果：
   a. 获取 T2 域名列表
   b. 重复上述流程
4. T2 也无结果：
   a. mimo_web_search "<能力名称> official documentation"
   b. 从结果中选取最权威来源
   c. 标记 t1_missing: true
```

---

## 六、配置维护指南

### 新增技术域

当遇到新的技术领域（如 Rust/WASM、AI/LLM 前端集成）时：

```yaml
# 在 source_domain_map 中新增条目
rust_wasm:
  description: "Rust 编译 WASM、wasm-bindgen、WebAssembly 性能"
  t1:
    - domain: developer.mozilla.org
      name: "MDN WebAssembly 文档"
      search_hint: "site:developer.mozilla.org"
    - domain: rustwasm.github.io
      name: "Rust and WebAssembly 官方"
      search_hint: "site:rustwasm.github.io"
  t2:
    - domain: web.dev
      name: "web.dev WASM 文章"
      search_hint: "site:web.dev"
```

### 更新域名

当官方文档域名迁移时（如 reactjs.org → react.dev），只需更新本文件的 domain 字段。

### 加入黑名单

```
blacklist:
  - domain: some-unreliable-site.com
    reason: "403 Forbidden on web_fetch"
    added: "2026-05-03"
```

---

## 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-05-03 | 初版，9 个技术域、反爬黑名单框架 |
