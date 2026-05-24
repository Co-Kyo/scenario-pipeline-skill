---
name: scenario-pipeline
description: "前端复合工程场景知识管线。两阶段工作流：前处理（扫描→分词→能力提取→高地识别→评估→入池）+ 后处理（能力研究→Briefing→命题组装→学习阶梯）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research'。"
---

# Scenario Pipeline

## 管道全景

```
前处理（串行）                         后处理（并行 + 检查点）

 ① scan          广域扫描              ⑦ capability-research   能力研究 × N（并行）
 ② decompose     架构分词              ⓔ 检查点 E
 ③ capability-   原子能力提取          ⑧ briefing-assemble     Briefing × M（并行）
    extract       + 信源预查找         ⓓ 检查点 D
 ④ highground-   战略高地识别          ⑨ assemble              命题组装 × M（并行）
    identify                           ⓕ 检查点 F
 ⑤ evaluate      四维评估              ⑩ learning-ladder       学习阶梯 × M（并行）
 ⑥ pool          入池归档              ⓖ 检查点 G
 ⓐ 检查点 A
 ⓑ 检查点 B
 ⓒ 检查点 C

  每步详情 → processes/01~06            每步详情 → processes/07~10
  共享约定 → processes/00-shared.md
```

## 三层产物

| 层 | 产物 | 用途 |
|----|------|------|
| **命题研究** | `{seq}-{name}/overview + edge-cases + trade-offs + experiment` | 面试前的深度答案速查 |
| **能力知识库** | `capabilities/{id}-{name}.md` | 跨命题的原子能力参考手册 |
| **学习阶梯** | `{seq}-{name}/learning-ladder.md` | 从不会到会的渐进式引导路径 |

## 触发方式

**前处理（扫描提取）：**
```
扫描：<信息源描述>
deep scan：<信息源描述>
```

**后处理（深度研究）：**
```
研究：<场景描述>
deep research：<场景描述>
```

**参数：** `--depth=shallow|normal|deep` `--platform=web|miniapp|rn|all` `--no-experiment` `--append` `--batch=pending` `--year=L1|L2|L3|L4`

## 执行入口

1. **首次使用**：读 `meta/paths.md` 了解路径约定，读 `meta/sources.md` 了解信源分级
2. **前处理**：按顺序读 `processes/01-scan.md` → `processes/06-pool.md`，每步按文件中的指令执行
3. **后处理**：读 `processes/00-shared.md` 了解子 agent 调度和检查点协议，然后按 `processes/07` → `processes/10` 执行

## 数据参考

| 文件 | 内容 | 何时读取 |
|------|------|---------|
| `meta/sources.md` | T0 域名表 + 信源分级规则 | scan 和 capability-extract 阶段 |
| `meta/output-contracts.md` | 每步的输出结构 + 完整示例 | 每步执行前，查看对应步骤的示例 |
| `meta/paths.md` | 路径约定表 | 需要拼接产出路径时 |
| `core/*.md` | 方法论定义 | decompose/capability-extract/highground/evaluate 执行前 |
| `plugins/*.md` | 可选增强 | 按需加载 |
