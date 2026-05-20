# Step ⑩: 学习阶梯

## 目的

为每个已组装的命题生成学习阶梯——从"不会"到"能讲"的渐进式引导路径。后处理阶段三。

## 输入

- `capability-graph.json`（前处理产出，含能力依赖关系）
- `.meta/summaries/*.json`（Step ⑦ 产出）
- `{seq}-{short_name}/overview.md` 等（Step ⑨ 产出的命题文件）

## 执行步骤

### 1. 筛选待生成命题

已有 `learning-ladder.md` 的命题跳过。

### 2. 并行 spawn

按 `processes/00-shared.md` §子 agent 调度规则，为每个命题 spawn 独立 agent。

**task 模板**：

```
你是「{proposition_name}」的学习阶梯生成专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
为命题「{proposition_name}」生成学习阶梯文档。

## 命题信息
- ID: {proposition_id}
- 名称: {proposition_name}

## 涉及能力
{capability_ids}

## 能力依赖关系
{dependency_edges}

## 能力详情
{capability_details}

## 输出路径
{workDir}/{seq}-{short_name}/learning-ladder.md

## 执行步骤

### Step 1: 提取能力子图
从上述能力依赖关系中，构建该命题的能力依赖图。

### Step 2: 拓扑排序
- Layer 0: 无依赖的叶子节点（基础能力）
- Layer 1: 依赖 Layer 0 的能力
- Layer 2: 依赖 Layer 0+1 的能力

### Step 3: 归纳阶段
合并相邻层（紧密关联的 1-2 个能力可合并）。
每个阶段 = 一个"你能做到什么"的里程碑。
通常 3-4 个阶段。

### Step 4: 编排步骤
每个阶段内：
- [概念] 读什么 → 建立心智模型
- [技能] 做什么 → 形成操作能力
- [综合] 想什么 → 建立判断力

每步结构：
- 要做什么（具体动作）
- 你会看到什么（预期结果，降低认知门槛）
- 这说明了什么（观察→知识连接）
- 接下来去哪（指向产出文件的精确路径）
- 做到才算过（二值验证标准）

### Step 5: 保存文件
写入 {workDir}/{seq}-{short_name}/learning-ladder.md

## 验证清单
- [ ] 包含 3-4 个阶段
- [ ] 每个阶段有明确的里程碑
- [ ] 每步有"做到才算过"的验证标准
- [ ] 引用路径指向实际产出文件
- [ ] 失败时有明确的回退指引
```

### 3. 等待全部完成

所有学习阶梯 agent 完成后，进入 ⓖ 检查点。

## 输出

- `{workDir}/{seq}-{short_name}/learning-ladder.md` × M
- 可选：`{workDir}/learning-ladder.md`（全局学习阶梯，跨命题的渐进式引导）

## 校验清单

- [ ] 每个已组装的命题有对应的学习阶梯
- [ ] 阶段数 3-4 个
- [ ] 每步有二值验证标准（做到/做不到）
- [ ] 引用路径指向实际产出文件
- [ ] 失败回退指引明确

## 异常处理

| 场景 | 处理 |
|------|------|
| 能力依赖图有环 | 打断循环依赖，标记 warning |
| 能力数量过多（>8） | 合并相似能力，减少阶段数 |
| 阶段数超过 5 个 | 合并相邻阶段 |
