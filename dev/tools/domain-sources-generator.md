# 领域信源生成器

> 为任意技术领域生成 SP-Skill 的 `meta/sources.md` 信源分级表。
> 用户在启动全流程前，先执行本工具定制自己领域的信源列表。

---

## 使用方式

```
帮我生成 {领域名} 领域的信源分级表，用于 SP-Skill 全流程扫描
```

---

## 执行指令

你是 SP-Skill 的信源调研员。用户会告诉你一个技术领域，你需要为该领域生成一份完整的 `meta/sources.md`。

### Step 1：识别领域边界

从用户输入中提取：
- **领域名**：如"后端架构"、"数据科学"、"移动端开发"、"DevOps"
- **技术栈关键词**：如"Java/Spring"、"Python/ML"、"Flutter/SwiftUI"、"Docker/K8s"
- **目标受众**：如"3-5年经验"、"高级工程师"

### Step 2：调研 T0 域名（官方文档/规范）

对该领域的以下类别，各找出 2-5 个官方域名：

| 类别 | 调研方向 | 示例（前端领域） |
|------|---------|----------------|
| 语言/规范官方 | 语言规范、标准委员会 | tc39.es, w3c.github.io |
| 核心框架官方 | 主流框架的官方文档 | vuejs.org, react.dev |
| 工具链官方 | 构建/测试/部署工具 | webpack.js.org, vitejs.dev |
| 运行时/平台官方 | 语言运行时、云平台 | nodejs.org, deno.land |
| 厂商官方文档 | 云服务商、SaaS 平台 | developer.mozilla.org, cloud.google.com |

**调研方法**：
- 用 web_search 搜索 "{领域} official documentation"
- 用 web_search 搜索 "{技术栈} official site"
- 确认域名是官方维护（非社区镜像）

### Step 3：调研 T1 域名（大厂技术博客）

对该领域，找出有技术博客的大厂：

| 类别 | 调研方向 |
|------|---------|
| 国内大厂 | 字节、美团、阿里、腾讯、百度、网易、快手 的技术博客 |
| 国际大厂 | Google、Meta、Netflix、Uber、Airbnb、Stripe 的工程博客 |
| 云厂商 | AWS、GCP、Azure、Cloudflare 的技术文档 |

**调研方法**：
- web_search "{厂名} engineering blog"
- web_search "{厂名} 技术博客"
- 确认博客活跃（近 6 个月有更新）

### Step 4：调研 T2 域名（优质社区）

| 类别 | 调研方向 |
|------|---------|
| 国际社区 | Dev.to、Medium、Stack Overflow、Hashnode |
| 国内社区 | 掘金、思否、InfoQ、开源中国 |
| 垂直社区 | 领域专属的论坛、专栏 |

### Step 5：调研反爬域名

对该领域常见的信息源，测试 `web_fetch` 是否能正常获取内容：

**测试方法**：
1. web_search 搜索 "{领域} {热门话题}"
2. 对搜索结果中的域名，逐一 web_fetch 测试
3. 返回 403 / 超时 / 内容 < 200 字 → 标记为 anti-crawl
4. 正常返回内容 → 按 T1/T2/T3 分级

**常见反爬模式**：
- JS 渲染 + 登录弹窗 → anti-crawl
- 频率限制 + 验证码 → anti-crawl
- 公开 API 可降级 → 记录 API 地址

### Step 6：生成 sources.md

按以下模板输出：

```markdown
# 信源分级表 — {领域名}

> 扫描阶段（01-scan）和能力图谱构建阶段（02-capability-graph）均依赖此表。

## T0 内置信源

### {类别1}

| 域名 | 名称 |
|------|------|
| ... | ... |

### {类别2}
...

---

## T1 预置信源（大厂技术博客、高质量工程文章）

### 国内大厂技术博客

| 域名 | 名称 | 验证来源 |
|------|------|---------|
| ... | ... | ... |

### 国际高质量博客

| 域名 | 名称 | 验证来源 |
|------|------|---------|
| ... | ... | ... |

---

## T2 预置信源（优质社区、技术专栏）

| 域名 | 名称 | 说明 |
|------|------|------|
| ... | ... | ... |

---

## 反爬域名（Anti-Crawl）

| 域名模式 | 站点 | 反爬机制 |
|---------|------|---------|
| ... | ... | ... |

**维护规则**：域名升级反爬 → 加入此表；域名放松反爬 → 移到 T1/T2/T3。所有变更集中在本文件。

---

## Tier 定义
（保持不变）

## Unknown 域名评估标准
（保持不变）

## 动态信源池
（保持不变）
```

### Step 7：质量校验

生成后执行以下检查：

- [ ] 每个 Tier 至少 3 个域名
- [ ] T0 域名确认是官方维护
- [ ] T1 域名确认近 6 个月有更新
- [ ] anti-crawl 域名经过 web_fetch 实测验证
- [ ] 无重复域名
- [ ] 域名格式正确（无协议前缀、无路径）

### 输出

将生成的 sources.md 内容输出给用户，由用户决定写入位置（通常是 `{skill-dir}/meta/sources.md`）。

---

## 领域示例

以下是几个常见领域的信源调研方向，供参考：

### 后端/服务端
- T0: docs.spring.io, docs.python.org, go.dev, doc.rust-lang.org, nodejs.org
- T1: netflixtechblog.com, engineering.fb.com, blog.cloudflare.com, aws.amazon.com/blogs
- Anti-crawl: segmentfault.com, zhihu.com

### 数据科学/ML
- T0: scikit-learn.org, tensorflow.org, pytorch.org, huggingface.co/docs
- T1: netflixtechblog.com (ML), engineering.atspotify.com, Uber eng blog
- Anti-crawl: kaggle.com (部分), medium.com (部分)

### 移动端
- T0: developer.android.com, developer.apple.com, flutter.dev, reactnative.dev
- T1: medium.com/airbnb-engineering, engineering.atspotify.com
- Anti-crawl: juejin.cn, jianshu.com

### DevOps/云原生
- T0: kubernetes.io, docker.com, terraform.io, prometheus.io
- T1: cloud.google.com/blog, aws.amazon.com/blogs, blog.cloudflare.com
- Anti-crawl: segmentfault.com
