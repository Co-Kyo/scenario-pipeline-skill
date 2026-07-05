# 信源分级表

> 扫描阶段（03-scan）和能力图谱构建阶段（04-capability-graph）均依赖此表。

## T0 内置信源

以下域名视为最高可信度，直接采用，无需评估。

### Web 标准与规范

| 域名 | 名称 |
|------|------|
| developer.mozilla.org | MDN Web Docs |
| w3c.github.io | W3C 规范 |
| whatwg.org | WHATWG 规范 |
| tc39.es | TC39 ECMAScript 规范 |
| httpwg.org | HTTP Working Group |

### 浏览器厂商

| 域名 | 名称 |
|------|------|
| web.dev | Google Web 技术博客 |
| developer.chrome.com | Chrome 开发者文档 |
| v8.dev | V8 官方博客 |
| chromestatus.com | Chrome Platform Status |

### 框架官方

| 域名 | 名称 |
|------|------|
| vuejs.org | Vue 官方文档 |
| react.dev | React 官方文档 |
| legacy.reactjs.org | React 旧文档 |
| angular.io | Angular 官方文档 |
| svelte.dev | Svelte 官方文档 |
| nextjs.org | Next.js 官方文档 |
| nuxt.com | Nuxt 官方文档 |

### 构建工具

| 域名 | 名称 |
|------|------|
| webpack.js.org | Webpack 官方文档 |
| vitejs.dev | Vite 官方文档 |
| rollupjs.org | Rollup 官方文档 |
| esbuild.github.io | esbuild 官方文档 |
| turbopack.dev | Turbopack 官方文档 |

### 运行时

| 域名 | 名称 |
|------|------|
| nodejs.org | Node.js 官方文档 |
| deno.land | Deno 官方文档 |
| bun.sh | Bun 官方文档 |

### 小程序

| 域名 | 名称 |
|------|------|
| developers.weixin.qq.com | 微信小程序官方文档 |

### 大厂技术博客

| 域名 | 名称 |
|------|------|
| developers.cloudflare.com | Cloudflare 技术文档 |
| aws.amazon.com/blogs | AWS 技术博客 |
| netflixtechblog.com | Netflix 技术博客 |
| engineering.fb.com | Meta 工程博客 |
| blog.chromium.org | Chromium 博客 |

### TypeScript

| 域名 | 名称 |
|------|------|
| www.typescriptlang.org | TypeScript 官方文档 |

---

## T1 预置信源（大厂技术博客、高质量工程文章）

以下域名经实测验证，内容质量稳定，直接按 T1 处理，无需运行时评估。

### 国内大厂技术博客

| 域名 | 名称 | 验证来源 |
|------|------|---------|
| tech.meituan.com | 美团技术团队 | 小程序性能优化、前端工程化 |
| cloud.tencent.com | 腾讯云技术社区 | setData 优化、小程序 CI/CD |
| mp.weixin.qq.com | 微信公众号技术文章 | Taro 跨端原理、小程序架构 |
| developers.aliyun.com | 阿里云开发者中心 | 前端性能、Node.js 实践 |
| aotu.io | 字节跳动前端技术博客 | 跨端框架、构建优化 |
| ai.baidu.com | 百度 AI 技术博客 | 小程序、智能体 |
| developer.baidu.com | 百度开发者中心 | 小程序 SDK、地图 API |

### 国际高质量博客

| 域名 | 名称 | 验证来源 |
|------|------|---------|
| smashingmagazine.com | Smashing Magazine | 前端设计、性能优化 |
| dev.to | Dev.to 开发者社区 | 前端实践、框架对比 |
| css-tricks.com | CSS-Tricks | CSS 技巧、布局方案 |
| overflowBlog.stackoverflow.com | Stack Overflow 博客 | 工程实践、调试技巧 |

---

## T2 预置信源（优质社区、技术专栏）

以下域名内容质量中等偏上，直接按 T2 处理。

| 域名 | 名称 | 说明 |
|------|------|------|
| blog.logrocket.com | LogRocket 博客 | 前端调试、性能分析 |
| blog.sentry.io | Sentry 博客 | 错误监控、前端稳定性 |
| thenewstack.io | The New Stack | 云原生、DevOps、前端工具链 |
| infoq.cn | InfoQ 中文站 | 架构决策、技术趋势 |
| oschina.net | 开源中国 | 开源项目、工具评测 |

---

## 反爬域名（Anti-Crawl）

以下域名已确认 web_fetch 无法获取内容，scan 步骤必须跳过 web_fetch，直接走 Playwright 抓取。

| 域名模式 | 站点 | 反爬机制 |
|---------|------|---------|
| `juejin.cn` | 掘金 | JS 渲染 + Cookie 检测 + 详情页 403 |
| `zhihu.com` / `zhuanlan.zhihu.com` | 知乎 | 强制登录弹窗 + 指纹检测 + 内容折叠 |
| `blog.csdn.net` / `csdn.net` | CSDN | 登录弹窗 + 内容折叠 + 广告遮挡 |
| `segmentfault.com` | 思否 | JS 渲染 + 登录弹窗 |
| `jianshu.com` | 简书 | JS 渲染 + 登录弹窗 |

**维护规则**：域名升级反爬 → 加入此表；域名放松反爬 → 移到 T1/T2/T3。所有变更集中在本文件。

---

## Tier 定义

| Tier | 定义 | 典型来源 |
|------|------|---------|
| **T0** | 官方文档/规范/标准 | 上表所列域名 |
| **T1** | 大厂技术博客、高质量工程文章 | Vercel Blog、字节技术、美团技术、Cloudflare Blog 等 |
| **T2** | 优质社区、技术专栏 | 掘金优质专栏、思否精选、Dev.to 高赞、CSS-Tricks 等 |
| **T3** | 一般社区、个人博客 | 普通掘金文章、CSDN、个人站点 |

## Unknown 域名评估标准

当 `classify_sources` 返回 unknown 时，按以下维度评估：

| 维度 | T1 标准 | T2 标准 | T3 标准 |
|------|---------|---------|---------|
| 内容来源 | 大厂官方博客/工程团队 | 社区精选/编辑推荐 | 普通用户投稿 |
| 内容深度 | 原理+实践+数据 | 实践为主+部分原理 | 入门介绍/搬运 |
| 引用规范 | 有规范/论文/源码引用 | 有外部链接引用 | 无引用或引用不可靠 |
| 更新频率 | 持续更新、有维护 | 偶尔更新 | 停更或不定期 |
| 技术准确性 | 可交叉验证 | 主流观点无明显错误 | 需要验证 |

**判定规则**：5 个维度中 ≥3 个达标即归入对应 Tier。不确定时归低一级。

## 动态信源池

运行时发现的优质域名记录在 `{workDir}/.meta/sources/dynamic-sources.json`：

```json
{
  "cloud.tencent.com": {
    "tier": "T2",
    "reason": "腾讯云官方技术社区，setData 性能优化文章质量高",
    "discovered_by": "scan/2026-05-16",
    "discovered_at": "2026-05-16T10:00:00Z"
  }
}
```

主 agent 在扫描阶段对 unknown 域名评估后，直接写入此文件。后续扫描自动复用已有评级。
