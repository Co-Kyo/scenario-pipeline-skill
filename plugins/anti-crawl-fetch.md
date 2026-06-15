---
name: anti-crawl-fetch
description: "sp-skill scan 阶段的反爬降级方案。当 web_fetch 失败（403/超时/JS渲染空白）时，委托 browser-flash skill 绕过反爬提取内容。触发条件：fetch_status=failed 且域名在反爬列表中。"
---

# 反爬降级抓取（Anti-Crawl Fallback）

> 本 plugin 被 Process ② (02-scan.md) 的 Phase B 按需加载。
> 执行由可执行脚本 `scripts/anti-crawl-fetch.js` 接管。
> 子 agent 不需要读 browser-flash SKILL.md，直接调用脚本即可。

## Playwright 前置条件

**sp-skill 自备 Playwright 锚点，不依赖 browser-flash（但脚本初始化参考了 browser-flash 的踩坑经验）。**

### 环境要求

- Node.js 18+
- Playwright 全局安装（v1.60.0+）
- Chromium 浏览器引擎

### 安装（如未安装）

```bash
# 检查是否已装
npx playwright --version 2>/dev/null && echo "INSTALLED" || echo "MISSING"
```

输出 `MISSING` 则执行：

```bash
npm install -g playwright
npx playwright install chromium

# 国内加速
npm install -g playwright --registry=https://registry.npmmirror.com
npx playwright install chromium
```

### NODE_PATH 设置（Windows 必须）

global 安装的 Playwright 只有设好 NODE_PATH 才能被 require：

```powershell
$env:NODE_PATH="C:\Users\cici\AppData\Roaming\QClaw\npm-global\node_modules"
```

### 验证

```powershell
$env:NODE_PATH="C:\Users\cici\AppData\Roaming\QClaw\npm-global\node_modules"
node -e "const {chromium}=require('playwright'); console.log('playwright ok')"
```

---

## 触发条件

02-scan.md Phase B 抓取策略判定某 URL 需要走 Playwright 时，加载本插件。

具体触发入口：
1. `url-batch.B{N}.json` 中某 URL 的 `tier == "anti-crawl"` 且 `need_playwright == true`
2. 或 web_fetch 对某 URL 返回 403/429/超时/内容不足 200 字

## 执行指令

### 单 URL 抓取（子 agent 用）

子 agent 设好 NODE_PATH 后直接运行：

```
# Windows PowerShell：
$env:NODE_PATH="C:\Users\cici\AppData\Roaming\QClaw\npm-global\node_modules"
node <skill_path>/scripts/anti-crawl-fetch.js <url> <output.json>
```

- 参数 1：URL（必填）
- 参数 2：输出文件路径（选填，不填则 stdout 输出）

输出格式（与 url-batch 中 material 的 fetch_status / content_extract 字段兼容）：
```json
{
  "fetch_status": "ok",
  "fetch_status_trace": "Playwright csdn 提取",
  "fetch_method": "playwright",
  "content_extract": {
    "key_concepts": ["..."],
    "capability_points": [],
    "depth_level": "机制级",
    "quality_signals": {
      "has_code": true,
      "has_diagram": false,
      "word_count": 4521
    }
  }
}
```

### 域名覆盖

脚本内置了以下站点的专用提取器：

| 站点 | 油猴脚本 | 提取方式 |
|------|---------|---------|
| `juejin.cn` | juejin-clean | DOM 提取 + API 降级（DOM 为空时自动尝试） |
| `csdn.net` / `blog.csdn.net` | csdn-clean | DOM 提取去弹窗去折叠 |
| `zhihu.com` / `zhuanlan.zhihu.com` | zhihu-expand | DOM 提取展开全部回答 |
| `segmentfault.com` | 通用清理 | 通用提取器 |
| `jianshu.com` | 通用清理 | 通用提取器 |
| 其他站点 | 无 | 通用提取器 |

### 内存清理

脚本内部已处理 `context.close()` + `browser.close()`。
批量完成后检查孤儿进程：

```bash
# Windows
tasklist | findstr /I chromium
taskkill /F /IM chromium.exe 2>nul
```

### Step 3：结果写回

提取结果转换为 partial index 中的 material 格式，含：

```json
{
  "fetch_status": "ok",
  "fetch_status_trace": "web_fetch 失败（403），Playwright 降级成功",
  "fetch_method": "playwright",
  "content_extract": {
    "key_concepts": ["核心技术概念"],
    "capability_points": ["原子能力点"],
    "depth_level": "概念级|机制级|原理级|架构级",
    "quality_signals": {
      "has_code": true/false,
      "has_diagram": false,
      "word_count": 1234
    }
  }
}
```

### Step 4：内存清理

按 browser-flash 铁律：每个 URL 用完 close context。
批量完成后检查孤儿进程：

```bash
# Windows
tasklist | findstr /I chromium
taskkill /F /IM chromium.exe 2>nul
```

## 校验清单

- [ ] 已读 `browser-flash/SKILL.md` — 不使用本文件中的内联 Playwright 代码
- [ ] 每个 URL 串行处理（不并行开多个 tab）
- [ ] 每个 URL 处理后 context.close() + browser.close()
- [ ] 提取结果已写回 partial index（含 fetch_method 标记）
- [ ] 降级失败 → `fetch_status: "failed"` + `fetch_status_trace: "Playwright 降级失败：{原因}"`
- [ ] 批量完成后检查孤儿进程
