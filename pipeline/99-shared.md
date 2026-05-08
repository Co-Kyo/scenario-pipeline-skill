# 跨阶段共享参考

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/post-process.md`

> 本文档记录跨阶段共享的参考信息：数据实体、插件依赖、故障模式。
> 调度算法、增量复用等执行细节见 `references/post-process.md`。

---

## 核心数据实体生命周期

| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
|---------|---------|---------|---------|
| `raw_materials[]` | scan | decompose, evaluate | 内存传递 |
| `decompositions[]` | decompose | capability-extract, evaluate | 内存传递 |
| `capability-graph.json` | capability-extract → highground-identify 追加 | 后处理全流程 | 文件读写 |
| `evaluations[]` | evaluate | pool | 内存→文件 |
| `README.md` | pool | 用户 + 后处理 | 人类阅读 + agent 读取 |
| `capabilities/<id>.md` | capability-research | **人类阅读** | 人类消费 |
| `summaries/<id>.json` | capability-research 双写 | Briefing 组装 + 学习阶梯 | 机器消费 |
| `briefings/<命题>.md` | Briefing 组装 | assemble agent | 内联到 task |
| `<命题>/overview.md` 等 | assemble | 用户 + 学习阶梯 | 人类消费 + 阶梯引用 |
| `<命题>/learning-ladder.md` | 阶段三 | 用户 | 人类消费（渐进式引导） |

---

## 插件引用关系

```
plugins/year-granularity.md
  └── 被 decompose.md 按需加载（--year 参数）

plugins/capability-research-mode.md
  ├── 被 capability-research.md 必须加载（材料块格式）
  └── 被 assemble.md 必须加载（组装格式+实验模板）

plugins/source-registry.md
  ├── 被 capability-extract.md 必须加载（信源URL预查找）
  └── 被 capability-research.md 必须加载（fallback搜索）
```

---

## 故障模式与恢复

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| 前处理 scan 网络不通 | raw_materials 为空 | 换镜像/指定 --source |
| capability-extract 信源验证全部失败 | t1_missing=true 普遍 | 后处理 fallback 搜索 |
| 阶段一 agent 超时 | summary.json 缺失 | 精确重跑该能力（1 agent 1 文件） |
| Briefing 组装超时 | .meta/briefings/ 不完整 | 按缺失命题增量生成 |
| 阶段二 agent 输出质量差 | 文件内容空洞 | 重跑：拿同样的 briefing 再写一次 |
| 阶段三生成的阶梯质量差 | 步骤不可操作或引用错误 | 重跑：基于同样的命题产出重新生成 |
| 阶段三依赖的命题产出缺失 | overview/experiment 未生成 | 先补完阶段二，再生成阶梯 |
| summary 与主文件不一致 | 摘要过时 | 从主文件重新提取（增量修复） |
| 运行时 spawn 失败 | agent 无法创建 | 检查平台是否支持多 agent，降级为单线程执行 |
