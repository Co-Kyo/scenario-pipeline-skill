# 故障模式与恢复

> ⚠️ **观测文档**，不是执行配置。
> 执行文档 → `processes/` ｜ 本文件属于 `design/pipeline/`

## 前处理故障

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| ① scan 网络不通 | raw-materials.json 为空或条目过少 | 换搜索关键词、指定 `--source=<url>`、检查网络 |
| ① scan 信源全部 unknown | 无 T0 命中 | 全部 web_fetch 评估，不依赖 T0 表 |
| ② decompose 素材不足 | 无法识别有效命题 | 提示用户补充信源后重新扫描 |
| ② decompose 命题过多 | >10 个命题 | 提示用户用 `--filter` 缩小范围 |
| ③ capability-extract T0 全部不可达 | t0_missing 普遍 | 后处理 fallback 搜索补充 |
| ③ capability-extract 能力数量过多 | >30 个原子能力 | 提示用户缩小范围，标记 overload |
| ⑤ evaluate 信息不足 | 打分依据薄弱 | 标记为 medium，reasoning 说明 |
| ⑤ evaluate 全部 rejected | 无有效命题 | 提示用户调整搜索范围 |

## 后处理故障

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| ⑦ 能力研究 agent 超时 | summary.json 缺失 | 精确重跑该能力（1 agent 1 文件） |
| ⑦ 能力研究质量差 | 内容空洞、信源不足 | 补充信源后重跑该能力 |
| ⑧ Briefing 组装超时 | .meta/briefings/ 不完整 | 按缺失命题增量生成 |
| ⑨ 命题组装 agent 超时 | 命题目录文件缺失 | 精确重跑该命题 |
| ⑨ 命题组装质量差 | 内容空洞、比例不达标 | 拿同样的 briefing 重跑 |
| ⑩ 学习阶梯质量差 | 步骤不可操作、引用错误 | 基于同样的命题产出重新生成 |
| ⑩ 依赖的命题产出缺失 | overview/experiment 未生成 | 先补完阶段二，再生成阶梯 |
| summary 与主文件不一致 | 摘要过时 | 从主文件重新提取 |

## 运行时故障

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| spawn 失败 | agent 无法创建 | 检查平台是否支持多 agent，降级为单线程 |
| 并发过多 | 平台限流 | 减小窗口大小（W=4 → W=2） |
| 上下文溢出 | agent 输出截断 | 减小 task 中的输入量，分批处理 |
| 用户中断 | 管线暂停 | 读 pipeline-state.json，从 last_checkpoint 恢复 |

## 紧急中断处理

紧急中断后 `pipeline-state.json` 的 `interrupt_type` 为 `"emergency"`。恢复时：

```
1. 读取 pipeline-state.json，检测 interrupt_type
2. 如果 == "emergency"：
   a. 扫描产出目录，识别半成品文件
   b. 展示半成品列表，询问用户：丢弃 / 保留但标记 / 重新生成
   c. 清理后进入正常恢复流程
3. 如果 != "emergency"：直接从 last_checkpoint 恢复
```
