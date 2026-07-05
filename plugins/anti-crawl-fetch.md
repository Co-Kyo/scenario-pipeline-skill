---
name: anti-crawl-fetch
description: "Step ① scan 的 web_fetch 反爬降级方案。当 web_fetch 失败（403/超时/JS渲染空白）时，用 Playwright headless Chromium 绕过反爬提取内容。触发条件：fetch_status=failed 且域名不在排除列表中。"
---

# 反爬降级抓取（Anti-Crawl Fallback）

> 本 plugin 被 Step ① scan 按需加载。当 `web_fetch` 失败时，作为降级方案执行。

---

## 域名分类

域名路由逻辑在 `processes/02-scan.md` 的抓取策略中定义。域名分类统一维护在 `assets/common/sources.md`（T0 表 + 反爬域名表）。

本插件只负责：当 02-scan.md 判定某个 URL 需要走 Playwright 时，提供执行指令。

---

## 触发条件

02-scan.md 的抓取策略判定某 URL 需要走 Playwright 时，加载本插件执行。

---

## 环境检查

> **🔴 Playwright 使用全局安装，不在产物目录安装。**

### Step 1：检查 Playwright 是否已全局安装

```bash
# 全局检查（不依赖当前目录）
npx playwright --version 2>/dev/null && echo "OK" || echo "MISSING"
```

- 输出 `OK` → 跳过安装，直接执行
- 输出 `MISSING` → 进入 Step 2 全局安装

> **注意**：Playwright 通过 npx 调用，不要用 `require('playwright')`（全局安装后 require 路径可能找不到）。

### Step 2：全局安装 Playwright（npmmirror 加速）

国内环境 npmjs.org 延迟极高（超时 5s+），必须切源：

```bash
npm install -g playwright --registry=https://registry.npmmirror.com && npx playwright install chromium
```

**回退策略**：如果 npmmirror 也超时，尝试官方源：

```bash
npm install -g playwright && npx playwright install chromium
```

**标记**：安装成功后，后续步骤不再重复检查。安装失败标记 `fetch_status: "failed"` + `fetch_status_trace: "Playwright 安装失败"`。

> **注意**：全局安装后，`require('playwright')` 在任何目录都能访问，不需要在产物目录安装。

---

## 降级抓取流程

对每个 `fetch_status: "failed"` 的 URL，按以下步骤执行：

### Step 1：域名匹配 → 选择提取策略

| 域名模式 | 站点 | 注入脚本 | 提取方式 |
|---------|------|---------|---------|
| `juejin.cn` | 掘金 | juejin-clean | DOM 提取 + API 降级 |
| `csdn.net` / `blog.csdn.net` | CSDN | csdn-clean | DOM 提取 |
| `zhihu.com` / `zhuanlan.zhihu.com` | 知乎 | zhihu-expand | DOM 提取 |
| `segmentfault.com` | 思否 | 无 | DOM 提取（通用选择器） |
| `jianshu.com` | 简书 | 无 | DOM 提取（通用选择器） |
| 其他 | 未知 | 无 | 通用提取器 |

### Step 2：Playwright 抓取（逐个 URL，串行）

⚠️ **铁律：每个 URL 用完必须 close context + page。每 tab 50-200MB，不关 = 内存泄漏。**

```javascript
const { chromium } = require('playwright');

async function antiCrawlFetch(url, domain) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 注入油猴脚本（如果有）
    const script = getScriptForDomain(domain);
    if (script) await page.addInitScript({ content: script });

    // 打开页面
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);  // 等待 JS 渲染

    // 提取内容
    const data = await page.evaluate(() => getExtractorForDomain(location.hostname)());
    return data;
  } catch (err) {
    return { error: err.message };
  } finally {
    await context.close();  // 必须关闭
    await browser.close();  // 必须关闭
  }
}
```

### Step 3：内容提取选择器

#### 掘金 (juejin.cn)
```javascript
() => {
  const title = document.querySelector('h1')?.innerText?.trim();
  const author = document.querySelector('[class*="author"] a, a[href*="/user/"]')?.innerText?.trim();
  const time = document.querySelector('time')?.innerText?.trim();
  const content = document.querySelector('article')?.innerText?.substring(0, 15000);
  const tags = [...document.querySelectorAll('article [class*="tag"] a, [class*="article"] [class*="tag"] a')]
    .map(a => a.innerText?.trim()).filter(Boolean).filter((v,i,a) => a.indexOf(v) === i);
  return { title, author, time, content, tags, source: 'playwright' };
}
```

**掘金 API 降级**：如果 DOM 提取失败（content 为空），尝试 API：
```bash
curl -s -X POST 'https://api.juejin.cn/content_api/v1/article/detail' \
  -H 'Content-Type: application/json' \
  -d '{"article_id": "<从URL提取>"}'
```
从 API 响应中提取 `data.article_info` 的 title、markdown_content。

#### CSDN (blog.csdn.net)
```javascript
() => {
  const title = document.querySelector('.title-article h1, #articleContentId, h1.title')?.innerText?.trim();
  const author = document.querySelector('.follow-nickName, .author-name, [class*="author"] a')?.innerText?.trim();
  const time = document.querySelector('.time, [class*="time"]')?.innerText?.trim();
  const content = document.querySelector('#content_views, .article_content, #article_content')?.innerText?.substring(0, 15000);
  const tags = [...document.querySelectorAll('.tags-box a, .tag-link, [class*="tag"] a')]
    .map(a => a.innerText?.trim()).filter(Boolean);
  const views = document.querySelector('.read-count, [class*="read"]')?.innerText?.trim();
  return { title, author, time, content, tags, views, source: 'playwright' };
}
```

#### 知乎 (zhihu.com)
```javascript
() => {
  const title = document.querySelector('.QuestionHeader-title, h1')?.innerText?.trim();
  const detail = document.querySelector('.QuestionRichText')?.innerText?.substring(0, 1000);
  const answers = [...document.querySelectorAll('.AnswerItem, .List-item')].map(el => ({
    author: el.querySelector('.AuthorInfo-name')?.innerText?.trim(),
    content: el.querySelector('.RichContent-inner')?.innerText?.substring(0, 5000),
    upvotes: el.querySelector('.VoteButton--up')?.innerText?.trim()
  })).filter(a => a.content);
  return { title, detail, answerCount: answers.length, answers, source: 'playwright' };
}
```

#### 思否 (segmentfault.com)
```javascript
() => {
  const title = document.querySelector('h1, .title, .article-title')?.innerText?.trim();
  const content = document.querySelector('.article-content, .answer-content, article')?.innerText?.substring(0, 15000);
  const author = document.querySelector('.author-name, [class*="author"] a')?.innerText?.trim();
  return { title, author, content, source: 'playwright' };
}
```

#### 通用提取器（未适配站点）
```javascript
() => {
  const title = document.querySelector('h1')?.innerText?.trim() || document.title;
  const article = document.querySelector('article, .article-content, .post-content, main');
  const content = article?.innerText?.substring(0, 15000) || document.body?.innerText?.substring(0, 10000);
  return { title, content, source: 'playwright-generic' };
}
```

---

## 油猴脚本（内联版）

以下是各站点的 UI 清理脚本，通过 `page.addInitScript()` 在页面初始化前注入。

### juejin-clean（掘金去登录弹窗）
```javascript
(function(){
  'use strict';
  const s=['.login-guide','.guide-box','.recommend-block','.login-modal','.overlay','[class*="loginGuide"]'];
  const r=()=>{s.forEach(sel=>document.querySelectorAll(sel).forEach(e=>e.remove()));document.body.style.overflow='auto';};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',r);else r();
  new MutationObserver(r).observe(document.documentElement,{childList:true,subtree:true});
})();
```

### csdn-clean（CSDN去弹窗去广告）
```javascript
(function(){
  'use strict';
  const rm=()=>{['.passport-login-container','.hide-article-box','.blog_container_aside .recommend','#passport_box','.modal-box','.login-mark'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.remove()));document.body.style.overflow='auto';document.documentElement.style.overflow='auto';};
  const exp=()=>{const c=document.getElementById('content_views');if(c){c.style.maxHeight='none';c.style.overflow='visible';}document.querySelectorAll('.hide-article-box,.readall_box').forEach(e=>e.remove());};
  const run=()=>{rm();exp();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(rm).observe(document.documentElement,{childList:true,subtree:true});
})();
```

### zhihu-expand（知乎展开全文去登录）
```javascript
(function(){
  'use strict';
  const rm=()=>{['.Modal-wrapper','.signFlowModal','.Modal-backdrop','.css-1hy48yp','[class*="LoginModal"]','[class*="SignModal"]'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.remove()));document.body.style.overflow='auto';document.body.classList.remove('Modal--active');};
  const exp=()=>{document.querySelectorAll('.Button.ContentItem-expandButton,.RichContent-inner--collapsed .ContentItem-more').forEach(b=>b.click());document.querySelectorAll('.RichContent-mask,.ContentItem-mask').forEach(e=>e.remove());};
  const run=()=>{rm();exp();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(()=>{rm();setTimeout(exp,500);}).observe(document.documentElement,{childList:true,subtree:true});
})();
```

---

## 结果写回

降级抓取成功后，将提取结果转换为 Step ① scan 的 material 格式：

```json
{
  "fetch_status": "ok",
  "fetch_status_trace": "web_fetch 失败（403），Playwright 降级成功",
  "fetch_method": "playwright",
  "content_extract": {
    "key_concepts": ["从 content 中提取 3-8 个核心技术概念"],
    "capability_points": ["从 content 中提取原子能力点"],
    "depth_level": "根据内容深度判定",
    "quality_signals": {
      "has_code": true/false,
      "has_diagram": false,
      "word_count": "实际字数"
    }
  }
}
```

**降级失败时**：
```json
{
  "fetch_status": "failed",
  "fetch_status_trace": "web_fetch 403 + Playwright 降级也失败：{错误原因}",
  "fetch_method": "playwright-failed"
}
```

---

## 内存清理

每个 URL 抓取完成后，确认 context 和 browser 已关闭。

批量抓取完成后，检查是否有孤儿进程：
```bash
# Windows
tasklist | grep -i chromium | grep -v grep
# 如果有残留
taskkill /F /IM chromium.exe 2>/dev/null

# Linux/Mac
pgrep -f chromium && pkill -f chromium
```

---

## 校验清单

- [ ] 仅在 `web_fetch` 失败后触发（不替代成功的 `web_fetch`）
- [ ] 每个 URL 串行处理（不并行开多个 tab）
- [ ] 每个 URL 处理后 context.close() + browser.close() 已执行
- [ ] 提取结果已转换为 material 格式（含 content_extract）
- [ ] 降级失败已标记 fetch_status: "failed" + trace
- [ ] 批量完成后检查孤儿进程
