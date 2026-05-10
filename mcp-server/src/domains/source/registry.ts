/**
 * 信源注册表 - 从 source-registry.md 提取的结构化数据
 * 集成在 MCP 服务器内部，避免从外部文件读取
 */

import { SourceRegistry } from "./types.js";

export const sourceRegistry: SourceRegistry = {
  source_domain_map: {
    browser_api: {
      description: "DOM、CSSOM、渲染管线、事件循环、IntersectionObserver 等浏览器 API",
      t1: [
        { domain: "developer.mozilla.org", name: "MDN Web Docs", search_hint: "site:developer.mozilla.org" },
        { domain: "w3c.github.io", name: "W3C 规范", search_hint: "site:w3c.github.io" },
        { domain: "whatwg.org", name: "WHATWG 规范", search_hint: "site:whatwg.org" }
      ],
      t2: [
        { domain: "web.dev", name: "Google Web 技术博客", search_hint: "site:web.dev" },
        { domain: "developer.chrome.com", name: "Chrome 开发者文档", search_hint: "site:developer.chrome.com" }
      ]
    },
    chrome_v8: {
      description: "DevTools、Heap Snapshot、Performance 面板、V8 GC、编译优化",
      t1: [
        { domain: "developer.chrome.com", name: "Chrome DevTools 官方文档", search_hint: "site:developer.chrome.com" },
        { domain: "v8.dev", name: "V8 官方博客", search_hint: "site:v8.dev" }
      ],
      t2: [
        { domain: "web.dev", name: "Google Web 技术博客", search_hint: "site:web.dev" }
      ]
    },
    web_performance: {
      description: "Core Web Vitals、Paint Timing、Long Tasks、PerformanceObserver",
      t1: [
        { domain: "web.dev", name: "web.dev（Core Web Vitals 定义）", search_hint: "site:web.dev" },
        { domain: "w3c.github.io", name: "W3C 性能规范", search_hint: "site:w3c.github.io" }
      ],
      t2: [
        { domain: "developer.chrome.com", name: "Chrome 性能工具文档", search_hint: "site:developer.chrome.com" }
      ]
    },
    http_protocol: {
      description: "HTTP 缓存协商、Cache-Control、ETag、CDN、Service Worker",
      t1: [
        { domain: "developer.mozilla.org", name: "MDN HTTP 文档", search_hint: "site:developer.mozilla.org" },
        { domain: "httpwg.org", name: "HTTP Working Group（RFC 规范）", search_hint: "site:httpwg.org" }
      ],
      t2: [
        { domain: "developers.cloudflare.com", name: "Cloudflare 技术文档", search_hint: "site:developers.cloudflare.com" }
      ]
    },
    vue: {
      description: "Vue 响应式系统、Composition API、Patch Flag、虚拟 DOM",
      t1: [
        { domain: "vuejs.org", name: "Vue 官方文档", search_hint: "site:vuejs.org" }
      ],
      t2: [
        { domain: "github.com/vuejs/core", name: "Vue 源码", search_hint: "site:github.com/vuejs/core" }
      ]
    },
    react: {
      description: "React Fiber、Hooks、Concurrent Mode、Suspense",
      t1: [
        { domain: "react.dev", name: "React 官方文档（新版）", search_hint: "site:react.dev" }
      ],
      t2: [
        { domain: "legacy.reactjs.org", name: "React 旧文档", search_hint: "site:legacy.reactjs.org" }
      ]
    },
    webpack: {
      description: "Code Splitting、Tree Shaking、持久化缓存、Module Federation",
      t1: [
        { domain: "webpack.js.org", name: "Webpack 官方文档", search_hint: "site:webpack.js.org" }
      ],
      t2: [
        { domain: "github.com/webpack/webpack", name: "Webpack 源码 Wiki", search_hint: "site:github.com/webpack/webpack" }
      ]
    },
    vite: {
      description: "ESM 原生加载、预构建、Rollup 产物优化",
      t1: [
        { domain: "vitejs.dev", name: "Vite 官方文档", search_hint: "site:vitejs.dev" }
      ],
      t2: [
        { domain: "github.com/vitejs/vite", name: "Vite 源码", search_hint: "site:github.com/vitejs/vite" }
      ]
    },
    ecmascript_node: {
      description: "ESM 语义、模块系统、Node.js API",
      t1: [
        { domain: "tc39.es", name: "TC39 ECMAScript 规范", search_hint: "site:tc39.es" },
        { domain: "nodejs.org", name: "Node.js 官方文档", search_hint: "site:nodejs.org" }
      ],
      t2: [
        { domain: "developer.mozilla.org", name: "MDN JavaScript 文档", search_hint: "site:developer.mozilla.org" }
      ]
    },
    toolchain_releases: {
      description: "Chrome、Vite、Node.js、Webpack 等工具链的版本更新日志和 Release Notes",
      t1: [
        { domain: "chromestatus.com", name: "Chrome Platform Status（Chrome 版本特性追踪）", search_hint: "site:chromestatus.com" },
        { domain: "developer.chrome.com", name: "Chrome Release Blog", search_hint: "site:developer.chrome.com blog" },
        { domain: "vitejs.dev", name: "Vite 官方博客（版本发布公告）", search_hint: "site:vitejs.dev blog" },
        { domain: "nodejs.org", name: "Node.js 官方博客（版本发布公告）", search_hint: "site:nodejs.org en/blog" }
      ],
      t2: [
        { domain: "github.com", name: "GitHub Releases（各工具链的 Release Notes）", search_hint: "site:github.com releases" }
      ]
    }
  },

  blacklist: [
    // 暂无黑名单条目，后续按需添加
  ],

  capability_to_tech_domain: {
    // 渲染管线、DOM、CSSOM、事件循环、IntersectionObserver、rAF
    "渲染管线": ["browser_api"],
    "DOM": ["browser_api"],
    "CSSOM": ["browser_api"],
    "事件循环": ["browser_api"],
    "IntersectionObserver": ["browser_api"],
    "rAF": ["browser_api"],
    
    // DevTools、Performance 面板、Heap Snapshot、Memory、Lighthouse
    "DevTools": ["chrome_v8"],
    "Performance 面板": ["chrome_v8"],
    "Heap Snapshot": ["chrome_v8"],
    "Memory": ["chrome_v8"],
    "Lighthouse": ["chrome_v8"],
    
    // Web Vitals、LCP、FID、CLS、INP、Paint Timing
    "Web Vitals": ["web_performance"],
    "LCP": ["web_performance"],
    "FID": ["web_performance"],
    "CLS": ["web_performance"],
    "INP": ["web_performance"],
    "Paint Timing": ["web_performance"],
    
    // HTTP 缓存、Cache-Control、ETag、CDN、Service Worker、Nginx
    "HTTP 缓存": ["http_protocol"],
    "Cache-Control": ["http_protocol"],
    "ETag": ["http_protocol"],
    "CDN": ["http_protocol"],
    "Service Worker": ["http_protocol"],
    "Nginx": ["http_protocol"],
    
    // Vue、Proxy、Composition API、Patch Flag、nextTick、响应式
    "Vue": ["vue"],
    "Proxy": ["vue"],
    "Composition API": ["vue"],
    "Patch Flag": ["vue"],
    "nextTick": ["vue"],
    "响应式": ["vue"],
    
    // React、Fiber、Hooks、Concurrent、Suspense、setState
    "React": ["react"],
    "Fiber": ["react"],
    "Hooks": ["react"],
    "Concurrent": ["react"],
    "Suspense": ["react"],
    "setState": ["react"],
    
    // Webpack、Code Splitting、Module Federation、loader、plugin
    "Webpack": ["webpack"],
    "Code Splitting": ["webpack"],
    "Module Federation": ["webpack"],
    "loader": ["webpack"],
    "plugin": ["webpack"],
    
    // Vite、ESM、预构建、esbuild、Rollup
    "Vite": ["vite"],
    "ESM": ["vite"],
    "预构建": ["vite"],
    "esbuild": ["vite"],
    "Rollup": ["vite"],
    
    // ESM、CommonJS、require、import、Node.js
    "CommonJS": ["ecmascript_node"],
    "require": ["ecmascript_node"],
    "import": ["ecmascript_node"],
    "Node.js": ["ecmascript_node"],
    
    // 虚拟列表、虚拟化算法、前缀和、二分
    "虚拟列表": ["browser_api"],
    "虚拟化算法": ["browser_api"],
    "前缀和": ["browser_api"],
    "二分": ["browser_api"],
    
    // Web Worker、Service Worker、SharedWorker
    "Web Worker": ["browser_api", "chrome_v8"],
    "SharedWorker": ["browser_api", "chrome_v8"],
    
    // 图片优化、WebP、AVIF、srcset
    "图片优化": ["web_performance", "http_protocol"],
    "WebP": ["web_performance", "http_protocol"],
    "AVIF": ["web_performance", "http_protocol"],
    "srcset": ["web_performance", "http_protocol"],
    
    // 内存泄漏、GC、V8 垃圾回收
    "内存泄漏": ["chrome_v8"],
    "GC": ["chrome_v8"],
    "V8 垃圾回收": ["chrome_v8"],
    
    // 版本更新、Release Notes、Changelog、版本验证
    "版本更新": ["toolchain_releases"],
    "Release Notes": ["toolchain_releases"],
    "Changelog": ["toolchain_releases"],
    "版本验证": ["toolchain_releases"]
  }
};
