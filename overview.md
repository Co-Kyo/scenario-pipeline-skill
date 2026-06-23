# 项目全貌梳理

## 任务
用户要求查看 scenario-pipeline skill 项目的全貌。

## 完成内容
- 读取了 SKILL.md、README.md、AGENTS.md、architecture-overview.md、pipeline-view/00-overview.md
- 扫描了 tests/ 目录结构（24 个测试文件）
- 用 SVG 可视化呈现了三阶段十步管线流程图（含 9 个检查点标注）

## 项目关键认知
- **定位**：纯 Markdown AI Skill，无代码构建。技术文章 → 面试答案 + 能力知识库 + 学习路径的自动化管线
- **结构**：10 步管线（⓪-⑨），21 个 Skill 定义文件，3 个阶段（前置/前处理/后处理）
- **三大设计铁律**：
  1. Context Isolation Protocol（每步只读自己的文件，禁预加载后续）
  2. 9 个强制检查点（ⓩ-ⓗ，阶段间必须停顿等确认）
  3. W=5 并发池（后处理 4 步共享，DAG 调度 vs 简单窗口两种模式）
- **测试体系**：184 个测试，3 层验证（Layer1 结构 166 + Layer2 属性 9 + Layer3 语义 9），177 通过 7 跳过，变异测试 kill rate 93.3%，覆盖率 77.3%
- **三层产物**：命题研究 / 能力知识库 / 学习阶梯 / 导向看板
- **入口**：SKILL.md（用户）、dev/TEST.md（测试）、dev/PATCH.md（修复）
- **TDD 流程**：测试即需求，修改功能走 test 分支 → 改测试 → 跑失败 → 修复 → 跑通过 → 回归 → 合并

## 注意
本次为分析/介绍类任务，未修改任何项目文件。可视化结果以 inline SVG 呈现，未落盘。
