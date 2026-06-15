#!/usr/bin/env node
/**
 * anti-crawl-fetch.js — sp-skill 反爬 URL 抓取单发器
 *
 * 用法：
 *   node anti-crawl-fetch.js <url>                         → stdout 输出 material JSON
 *   node anti-crawl-fetch.js <url> <output-path.json>      → 写文件 + stdout 摘要
 *
 * 输入：单个 URL
 * 输出：与 partial index material 格式兼容的 JSON
 *
 * 依赖：全局安装的 playwright（v1.60.0+），设 NODE_PATH 或全局 node_modules 可访问
 *
 * 域名覆盖：juejin.cn | blog.csdn.net/csdn.net | zhihu.com/zhuanlan.zhihu.com
 *          | segmentfault.com | jianshu.com | 通用回退
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ─── 油猴清理脚本 ───────────────────────────────────────────────

const SCRIPTS = {
  'juejin-clean': `(() => {
    const s=['.login-guide','.guide-box','.recommend-block','.login-modal','.overlay','[class*="loginGuide"]'];
    const r=()=>{s.forEach(sel=>document.querySelectorAll(sel).forEach(e=>e.remove()));document.body.style.overflow='auto';};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',r);else r();
    new MutationObserver(r).observe(document.documentElement,{childList:true,subtree:true});
  })()`,

  'csdn-clean': `(() => {
    const rm=()=>{['.passport-login-container','.hide-article-box','.blog_container_aside .recommend','#passport_box','.modal-box','.login-mark'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.remove()));document.body.style.overflow='auto';document.documentElement.style.overflow='auto';};
    const exp=()=>{const c=document.getElementById('content_views');if(c){c.style.maxHeight='none';c.style.overflow='visible';}document.querySelectorAll('.hide-article-box,.readall_box').forEach(e=>e.remove());};
    const run=()=>{rm();exp();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
    new MutationObserver(rm).observe(document.documentElement,{childList:true,subtotal:true});
  })()`,

  'zhihu-expand': `(() => {
    const rm=()=>{['.Modal-wrapper','.signFlowModal','.Modal-backdrop','[class*="LoginModal"]','[class*="SignModal"]'].forEach(s=>document.querySelectorAll(s).forEach(e=>e.remove()));document.body.style.overflow='auto';document.body.classList.remove('Modal--active');};
    const exp=()=>{document.querySelectorAll('.Button.ContentItem-expandButton,.RichContent-inner--collapsed .ContentItem-more').forEach(b=>b.click());document.querySelectorAll('.RichContent-mask,.ContentItem-mask').forEach(e=>e.remove());};
    const run=()=>{rm();exp();};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
    new MutationObserver(()=>{rm();setTimeout(exp,500);}).observe(document.documentElement,{childList:true,subtree:true});
  })()`
};

// ─── 域名 → 策略映射 ─────────────────────────────────────────

function detectDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch { return ''; }
}

function selectStrategy(hostname) {
  if (hostname.includes('juejin.cn'))       return { script: 'juejin-clean', extractor: extractJuejin, name: 'juejin' };
  if (hostname.includes('csdn.net'))        return { script: 'csdn-clean',   extractor: extractCsdn,   name: 'csdn' };
  if (hostname.includes('zhihu.com'))       return { script: 'zhihu-expand', extractor: extractZhihu,  name: 'zhihu' };
  if (hostname.includes('segmentfault.com'))return { script: null,           extractor: extractGeneric, name: 'segmentfault' };
  if (hostname.includes('jianshu.com'))     return { script: null,           extractor: extractGeneric, name: 'jianshu' };
  return { script: null, extractor: extractGeneric, name: 'generic' };
}

// ─── 提取器 ──────────────────────────────────────────────────

function extractJuejin() {
  const title = document.querySelector('h1')?.innerText?.trim();
  const content = document.querySelector('article')?.innerText?.substring(0, 15000);
  const author = document.querySelector('[class*="author"] a, a[href*="/user/"]')?.innerText?.trim();
  const time = document.querySelector('time')?.innerText?.trim();
  const tags = [...document.querySelectorAll('article [class*="tag"] a, [class*="article"] [class*="tag"] a')]
    .map(a => a.innerText?.trim()).filter(Boolean).filter((v,i,a) => a.indexOf(v) === i);
  const codeBlocks = document.querySelectorAll('pre code, pre, .code-block').length;
  return { title, author, time, content, tags, hasCode: codeBlocks > 2 };
}

function extractCsdn() {
  const title = document.querySelector('.title-article h1, #articleContentId, h1.title')?.innerText?.trim();
  const content = document.querySelector('#content_views, .article_content, #article_content')?.innerText?.substring(0, 15000);
  const author = document.querySelector('.follow-nickName, .author-name, [class*="author"] a')?.innerText?.trim();
  const time = document.querySelector('.time, [class*="time"]')?.innerText?.trim();
  const tags = [...document.querySelectorAll('.tags-box a, .tag-link, [class*="tag"] a')]
    .map(a => a.innerText?.trim()).filter(Boolean);
  const views = document.querySelector('.read-count, [class*="read"]')?.innerText?.trim();
  const codeBlocks = document.querySelectorAll('pre code, pre, .code-block').length;
  return { title, author, time, content, tags, views, hasCode: codeBlocks > 2 };
}

function extractZhihu() {
  const title = document.querySelector('.QuestionHeader-title, h1')?.innerText?.trim();
  const detail = document.querySelector('.QuestionRichText')?.innerText?.substring(0, 3000);
  const answers = [...document.querySelectorAll('.AnswerItem, .List-item')].map(el => ({
    author: el.querySelector('.AuthorInfo-name')?.innerText?.trim(),
    content: el.querySelector('.RichContent-inner')?.innerText?.substring(0, 5000),
    upvotes: el.querySelector('.VoteButton--up')?.innerText?.trim()
  })).filter(a => a.content);
  const codeBlocks = document.querySelectorAll('pre code, pre').length;
  return { title, detail, answerCount: answers.length, answers, hasCode: codeBlocks > 2 };
}

function extractGeneric() {
  const title = document.querySelector('h1')?.innerText?.trim() || document.title;
  const article = document.querySelector('article, .article-content, .post-content, main');
  const content = article?.innerText?.substring(0, 15000) || document.body?.innerText?.substring(0, 10000);
  const codeBlocks = document.querySelectorAll('pre code, pre, .code-block').length;
  return { title, content, hasCode: codeBlocks > 2 };
}

// ─── 概念提取（简易内置版） ─────────────────────────────────

function extractConcepts(content, title) {
  if (!content && !title) return [];
  const text = (title || '') + ' ' + (content || '');
  // 中文技术关键词常见模式
  const patterns = [
    /(?:虚拟滚动|虚拟列表|virtual scroll)/i,
    /(?:性能优化|性能调优)/i,
    /(?:首屏|FCP|LCP|白屏)/i,
    /(?:代码分割|动态导入|code splitting|dynamic import)/i,
    /(?:图片优化|图片压缩|webp|图片懒加载)/i,
    /(?:重排|重绘|reflow|repaint)/i,
    /(?:长任务|long task|requestIdleCallback)/i,
    /(?:内存泄漏|memory leak)/i,
    /(?:打包优化|bundle size|tree shaking|code split)/i,
    /(?:CRP|关键渲染路径|critical rendering path)/i,
    /(?:缓存策略|http缓存|service worker|CDN)/i,
    /(?:动画|帧|60fps|requestAnimationFrame)/i,
    /(?:加载策略|预加载|preload|prefetch|resource hints)/i,
    /(?:SSR|服务端渲染|hydration|同构)/i,
    /(?:Web Worker|多线程|并行计算)/i,
    /(?:Webpack|Vite|esbuild|打包工具)/i,
    /(?:Lighthouse|性能检测|性能审计|性能评分)/i,
    /(?:DOM|虚拟DOM|diff算法|VDOM)/i
  ];
  const found = new Set();
  for (const p of patterns) {
    const m = text.match(p);
    if (m) found.add(m[0]);
  }
  return [...found].slice(0, 8);
}

function assessDepthLevel(content, hasCode) {
  if (!content) return '概念级';
  const wordCount = content.length;
  if (wordCount > 5000 && hasCode) return '原理级';
  if (wordCount > 2000) return '机制级';
  return '概念级';
}

// ─── 主函数 ──────────────────────────────────────────────────

async function fetchUrl(url) {
  const hostname = detectDomain(url);
  const strategy = selectStrategy(hostname);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // 注入油猴脚本
    if (strategy.script) {
      const scriptCode = SCRIPTS[strategy.script];
      if (scriptCode) {
        await page.addInitScript({ content: scriptCode });
      }
    }

    // 打开页面
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() =>
      page.goto(url, { waitUntil: 'load', timeout: 30000 })
    );
    await page.waitForTimeout(4000);

    // 提取内容
    const data = await page.evaluate(strategy.extractor);

    // 尝试掘金 API 降级（如果DOM提取结果为空）
    if (strategy.name === 'juejin' && (!data.content || data.content.length < 200)) {
      try {
        const idMatch = url.match(/(?:post|article)\/(\d+)/);
        if (idMatch) {
          const apiRes = await page.request.post('https://api.juejin.cn/content_api/v1/article/detail', {
            data: { article_id: idMatch[1] }
          });
          const apiData = await apiRes.json();
          if (apiData?.data?.article_info) {
            data.title = apiData.data.article_info.title;
            data.content = (apiData.data.article_info.markdown_content || '').substring(0, 15000);
            data.apiSource = true;
          }
        }
      } catch {}
    }

    await context.close();

    const contentText = data.content || '';
    const wordCount = contentText.length;
    const concepts = extractConcepts(contentText, data.title);
    const depthLevel = assessDepthLevel(contentText, data.hasCode);

    return {
      fetch_status: 'ok',
      fetch_status_trace: strategy.name === 'generic' ? 'Playwright 通用提取' : `Playwright ${strategy.name} 提取`,
      fetch_method: 'playwright',
      content_extract: {
        key_concepts: concepts,
        capability_points: [],
        depth_level: depthLevel,
        quality_signals: {
          has_code: !!data.hasCode,
          has_diagram: false,
          word_count: wordCount
        }
      }
    };

  } catch (err) {
    return {
      fetch_status: 'failed',
      fetch_status_trace: `Playwright 抓取失败：${err.message}`,
      fetch_method: 'playwright-failed',
      error: err.message
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// ─── 入口 ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法: node anti-crawl-fetch.js <url> [output-path.json]');
    process.exit(1);
  }

  const url = args[0];
  const outputPath = args[1] || null;

  console.error(`[anti-crawl] 抓取: ${url}`);
  const result = await fetchUrl(url);

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[anti-crawl] 已写入: ${outputPath}`);
    console.log(`[anti-crawl] 状态: ${result.fetch_status}`);
    if (result.fetch_status === 'ok') {
      console.log(`[anti-crawl] 字数: ${result.content_extract.quality_signals.word_count}`);
      console.log(`[anti-crawl] 概念: ${result.content_extract.key_concepts.join(', ')}`);
    }
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  const fail = {
    fetch_status: 'failed',
    fetch_status_trace: `脚本异常：${err.message}`,
    fetch_method: 'playwright-failed'
  };
  if (process.argv[3]) {
    fs.writeFileSync(process.argv[3], JSON.stringify(fail, null, 2), 'utf-8');
  } else {
    process.stdout.write(JSON.stringify(fail, null, 2));
  }
  process.exit(1);
});
