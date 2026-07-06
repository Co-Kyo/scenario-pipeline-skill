# 头脑风暴 Barrier 检查

> Step 01 维度 Agent 完成后的质量门禁。维度 Agent 的产出质量直接决定收敛者和后续整条管线的质量。缺少维度（尤其是技术维度）会导致 capability_web 残缺，错误会沿管线传导。因此在进入收敛者之前必须有一个显式的质量门禁。

---

## 检查项

所有 4 个维度 Agent（含补发）结束后，主 agent 必须执行以下检查：

对每个维度（scenario/technical/learning/constraint）：
1. 检查 `{workDir}/.meta/brainstorm/{dim}.json` 是否存在
2. 读取文件，验证是合法 JSON
3. 验证包含 `dimension` 字段且值与维度名一致
4. 验证对应 entries 数组非空（scenarios/capabilities/learning_path/constraints）

---

## 决策矩阵

| 完成维度 | 缺失维度 | 处理 |
|---------|---------|------|
| 4/4 | 0 | ✅ 直接进入收敛者 |
| 3/4 | 1 | 🛑 **停住**：展示缺失分析，等用户决策（见下方） |
| 2/4 | 2 | 🛑 **停住**：展示缺失分析，等用户决策 |
| ≤1/4 | ≥3 | 🛑 **停住**：降级为原始指令扫描，等用户确认 |

**核心原则**：有维度缺失时，**禁止自动推进到收敛者**。必须停住等用户决策。

---

## 缺失维度分析报告

当存在缺失维度时，主 agent 必须输出以下分析：

```
🛑 barrier-1: 维度完整性检查

✅ 已完成:{completed_list}
❌ 缺失:{missing_list}

缺失原因分析:
- {dim}: {failure_reason}（超时/文件未写入/JSON 非法/entries 为空）
- 原因推测:{hypothesis}

影响评估:
- 无 {dim} → {impact_on_pipeline}
- 后续步骤传导:{cascade_effect}

选项:
1. 重试缺失维度（加大超时或简化任务，每个维度最多 2 次重试）
2. 降级进入收敛者（执行降级协议，基于骨架+存活维度重建最小 requirement-web.json）
```

---

## 写入检查点记录

将分析结果写入 `{workDir}/.meta/checkpoints/barrier-1.md`：

```markdown
# barrier-1: 维度完整性检查

- 时间:{ISO 时间戳}
- 维度完成状态:{summary}
- 缺失维度:{missing_list}
- 失败原因:{failure_analysis}
- 用户决策:(待补)
```

用户决策后，补写决策字段，按用户指令行动。

---

## 用户决策后的处理

| 用户选择 | 处理 |
|---------|------|
| 重试缺失维度 | 重新 spawn 对应 Agent。**首次重试**使用原始 task；**第二次重试**使用简化 task：减少锚点覆盖（仅保留 core 锚点，跳过 premise/outlook）、降低输出要求（跳过 insights、跳过补充能力）、超时加倍。完成后重新执行检查。**每个维度最多重试 2 次**（含调度阶段的 1 次补发）。达到上限后重试选项消失，仅保留「降级进入收敛者」 |
| 降级进入收敛者 | 在收敛者 task 中标注缺失维度，标注"低置信度"，继续管线 |

**重试上限规则**：每个维度的总重试次数 = 调度阶段补发(1次) + 用户决策重试(最多1次) = 2次。超过上限后，主 agent 在分析报告中移除「重试」选项，仅展示「降级进入收敛者」。

**简化 task 规则**（第二次重试时使用）：
- 超时：原始超时 × 2（如 180s → 360s）
- 锚点范围：仅覆盖 core 锚点（跳过 premise 和 outlook）
- 输出要求：跳过 `insights` 字段、跳过 `supplemented` 补充能力步骤
- task 中明确标注：「简化模式：仅输出核心能力列表，不需要 insights 和补充能力」
