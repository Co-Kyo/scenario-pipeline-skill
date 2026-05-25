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

### ⚠️ 强制分步读取协议（Context Isolation Protocol）

**核心规则：每一步只读该步的文件，严禁提前加载后续步骤。**

执行流程：
1. **初始化**：只读 `meta/paths.md` + `meta/sources.md`（路径约定和信源分级）
2. **前处理**（串行 6 步）：严格按以下循环执行：
   ```
   for step in [01, 02, 03, 04, 05, 06]:
       ① 读 processes/{step}-xxx.md          ← 只读当前步骤文件
       ② 读该步骤引用的 core/*.md 或 meta/*.md（按文件中的"前置条件"指示）
       ③ 执行该步骤的全部操作，产出文件
       ④ 进入下一步前，不再引用上一步的 processes 文件内容
   ```
3. **后处理**：读 `processes/00-shared.md` 了解调度协议，然后按 `processes/07` → `processes/10` 同样分步执行

**违规判定**：如果在执行 Step N 时引用了 Step N+1 或更后续步骤文件的内容，即视为违规。

> 设计理由见 `dev/design/context-isolation.md`

## 数据参考

| 文件 | 内容 | 何时读取 |
|------|------|---------|
| `meta/paths.md` | 路径约定表 | 初始化时读取一次即可 |
| `meta/sources.md` | T0 域名表 + 信源分级规则 | 由 Step 01 和 Step 03 的前置条件指示读取 |
| `meta/output-contracts.md` | 每步的输出结构 + 完整示例 | 由每步的前置条件指示读取对应 §N 节 |
| `core/*.md` | 方法论定义 | 由对应步骤的前置条件指示读取，**不在初始化阶段加载** |
| `plugins/*.md` | 可选增强 | 由对应步骤的前置条件指示读取 |
