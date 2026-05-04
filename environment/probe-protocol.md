# Environment Probe — 多 Agent 环境能力探测协议

> 通过自然语言诱导实验探测当前环境的多 Agent 能力边界，
> 从执行日志和结果中提取能力指标，映射为 skill 所需的 scheme 维度，
> 生成环境档案缓存，供后处理动态适配。
>
> **核心原则：自然语言诱导 > 硬 API 探测** — 不猜 API 名，让环境自己展示能力。

---

## 一、设计原则

### 1.1 为什么不用硬 API 探测

硬 API 探测（如尝试调用 `team_create()`、`sessions_spawn()`）存在根本缺陷：

- **猜 API 名本质上是 browser detection** — 猜中就灵，猜不中就漏
- **大模型应用框架快速更迭** — API 会变、会增、会删，硬编码很快过时
- **新平台出现时** — 不知道它用什么 API，注册表永远滞后
- **同平台不同版本** — 能力不同，API 探测无法反映真实能力边界

### 1.2 为什么用自然语言诱导

大模型本身就是自然语言接口。用自然语言描述"我要做什么"，环境自行选择如何执行：

- **环境自发展示能力** — 它用什么 API、什么模式，是它的事
- **能发现我们没想到的执行方式** — 比如 fallback 到单 agent 模拟多步
- **跨平台天然兼容** — 同样的自然语言指令，不同环境自行适配
- **探测到的是真实能力边界** — 不是"API 存在"，而是"真的能做到"

### 1.3 scheme 与实验的对应关系

scenario-pipeline 后处理的实际需求 → 能力维度 → 实验中的验证点：

| skill 需求 | 能力维度 | 实验验证 |
|-----------|---------|---------|
| 主 agent 创建自定义工具集的子 agent | C0: custom_agent | 能否通过定义文件创建子 agent 并指定其工具集（可跨会话分段验证） |
| 并行 spawn 子 agent | C1: spawn | 是否产生了独立执行单元 |
| 子 agent 读 capability-graph | C2: read | 子 agent 能否读取文件 |
| 子 agent 写 capabilities + summaries | C3: write | 子 agent 能否写入文件 |
| 子 agent web_fetch/web_search | C4: fetch | 子 agent 能否爬取网络 |
| 子 agent 理解 briefing 指令 | C5: shared_goal | 子 agent 能否理解目标并产出预期结果 |
| 子 agent 信源失败时自主换源 | C6: autonomous | 子 agent 遇到障碍能否自主调整 |
| 主 agent 等所有子 agent 完成 | C7: barrier | 主 agent 能否获取子 agent 完成信号 |

### 1.4 元能力优先原则

**C0 是元能力**——它回答的问题是："能否通过定义文件创建子 agent 并指定其工具集？"

C0 可分解为 4 个子步骤，**支持跨会话分段验证**：

| 子步骤 | 验证内容 | 会话要求 |
|--------|---------|---------|
| C0a: discoverable | 自定义 agent 机制是否存在（路径+格式） | 当前会话可完成 |
| C0b: definable | 定义文件能否被创建到正确路径 | 当前会话可完成 |
| C0c: callable | 自定义 agent 能否被调用并正确响应 | 可能需新会话加载 |
| C0d: toolset_effective | 配置的工具集是否实际生效 | 需 C0c ✅ 后在 Phase B 验证 |

- **C0=✅** → C0a ✅ + C0b ✅ + C0c ✅ → 按需创建子 agent；Phase B 使用自定义 agent
- **C0=⚠️** → C0a ✅ + C0b ✅ + C0c ⚠️ → 机制可达但需跨会话，缓存检查点到 meta，新会话继续
- **C0=❌** → C0a ❌ 或 C0b ❌ → 只能使用内置子 agent

C0 **不检测具体工具是否可用**——C0d 的验证由 Phase B 的 C2-C4 诱导实验完成。
探测流程**先测 C0**，因为它的结果决定 Phase B 使用哪种子 agent。

### 1.5 会话边界与检查点恢复

当实验步骤在当前会话内无法完成时（如自定义 agent 定义需新会话加载），协议采用**检查点/恢复**模式：

1. **缓存检查点**：将当前进度写入 `.meta/environment-profile.json` 的 `checkpoint` 字段
2. **显式指导用户**：输出明确的下一步操作指引（如"请重启会话后继续"）
3. **新会话恢复**：主 agent 读取检查点，跳过已完成步骤，从断点继续

> **核心原则**：实验不因会话边界而断裂——每一步的成果都缓存到 meta，下一步总能接上。
> 这不是"降级"，而是正确处理了"某些能力天然需要跨会话"的现实。

---

## 二、能力维度 Scheme

### 2.1 维度定义

| ID | 维度 | 含义 | 对 skill 的影响 |
|----|------|------|----------------|
| **C0: custom_agent** | 可定义子 agent | 能通过定义文件创建子 agent 并指定其工具集 | C0=✅ → 按需创建子 agent，工具集可配置；C0=⚠️ → 机制可达需跨会话；C0=❌ → 只能用内置子 agent |
| **C1: spawn** | 可创建子 agent | 能创建独立上下文的执行单元 | C1=❌ → 后处理无法并行，只能串行 fallback |
| **C2: read** | 可读 | 子 agent 能读取文件系统 | C2=❌ → 子 agent 只能靠 prompt 内联获取信息 |
| **C3: write** | 可写 | 子 agent 能写入文件系统 | C3=❌ → 后处理无法产出文件，skill 不可用 |
| **C4: fetch** | 可爬虫 | 子 agent 能使用 web_fetch/web_search | C4=❌ → 子 agent 无法获取外部信源，研究深度受限 |
| **C5: shared_goal** | 可共享目标 | 子 agent 能理解意图并产出预期结果 | C5=❌ → 子 agent 产出不可控 |
| **C6: autonomous** | 可自动更迭 | 子 agent 遇到障碍时能自主调整策略 | C6=❌ → 子 agent 遇错即停，需逐一重派 |
| **C7: barrier** | 可等待 | 主 agent 能获取子 agent 完成信号 | C7=❌ → 无法实现阶段间 barrier，需降级为轮询 |

> **C0 是元能力**：它不描述"子 agent 能做什么"，而是描述"能否自建子 agent 并指定其能力"。
> 具体工具是否可用，由 Phase B 的 C1-C7 诱导实验判定。
>
> **C0 可跨会话分段验证**：C0a（发现）和 C0b（创建）在当前会话完成，
> C0c（调用）可能需新会话加载定义文件。检查点缓存在 meta 中，新会话从断点恢复。

### 2.2 维度组合与 skill 执行策略

| 组合 | 执行策略 |
|------|---------|
| C0✅ + C1✅ + C2✅ + C3✅ + C4✅ + C5✅ + C6✅ + C7✅ | **完整并行** — 自定义全功能子 agent，滑动窗口，标准两阶段管线 |
| C0❌ + C1✅ + C4❌ | **并行但无网络** — 内置子 agent 缺 web 工具，prompt 内联 T1/T2 内容，子 agent 离线研究 |
| C0✅ + C1✅ + C6❌ | **并行但需护航** — 缩短超时，失败后重派 |
| C0✅ + C1✅ + C7❌ | **并行 + 轮询** — barrier 降级为轮询输出文件 |
| C1❌ | **串行 fallback** — 主 agent 逐步执行，效率低但可用 |
| C3❌ | **不可用** — 后处理核心产出无法完成 |

---

## 三、诱导实验设计

### 3.1 实验原理

探测分为两个阶段：

1. **元探测（Phase A）**：测试能否创建自定义工具集的子 agent 定义文件，并让该子 agent 实际执行任务。支持跨会话分段验证——C0a/C0b 在当前会话完成，C0c 可能需新会话。这决定诱导实验使用哪种 agent。
2. **能力探测（Phase B）**：用 Phase A 确定的最优 agent 类型执行综合诱导实验，从结果中提取 C1-C7。

> Phase A 优先于 Phase B — 因为 C0 决定了子 agent 工具集上限，直接影响 C3/C4 的可达性。

### 3.2 Phase A：元探测 — C0 探测

#### 3.2.1 探测方法

C0 探测分 4 个子步骤，支持**跨会话分段验证**：

```
Step A1：C0a — 发现自定义 agent 机制
  ├── 通过环境探索发现 agent 定义路径和格式（见 3.2.3）
  ├── 发现路径 + 格式 → C0a=✅，记录到 custom_agent_config
  └── 无法发现 → C0a=❌ → C0=❌，跳到 Phase B

Step A2：C0b — 创建定义文件
  ├── 在发现的路径下创建 probe-agent 定义
  ├── 定义中嵌入唯一标记（probe_id = "C0-VERIFY-XXXX"）和工具集配置
  ├── 文件创建成功 → C0b=✅
  └── 无法创建 → C0b=❌ → C0=❌，跳到 Phase B

Step A3：C0c — 验证自定义 agent 可被调用
  ├── 尝试使用该自定义 agent 执行简单任务（回报 probe_id）
  ├── agent 被成功调用且回报正确标记 → C0c=✅ → C0=✅，进入 Phase B
  ├── 定义文件存在但当前会话无法识别（需新会话加载） → C0c=⚠️ → 缓存检查点
  └── 定义文件存在但调用失败（非会话边界问题） → C0c=❌ → C0=❌

Step A4：[仅 C0c=⚠️] 缓存检查点 + 指导用户
  ├── 将 C0a ✅ + C0b ✅ + C0c ⚠️ 写入 meta 的 checkpoint 字段
  ├── 保留 probe-agent 定义文件（不删除）
  ├── 向用户输出明确指引："自定义 agent 定义已创建，需重启会话加载。请重启后继续。"
  └── C0 暂判为 ⚠️，待新会话恢复
```

#### 3.2.2 检查点恢复（新会话续接）

当新会话启动，发现 meta 中有 C0 的检查点时：

```
1. 读取 .meta/environment-profile.json 的 checkpoint 字段
2. checkpoint.step == "C0c_verify" → 跳过 A1、A2，直接验证 C0c
3. 验证方式：尝试调用 probe-agent（定义文件在上一个会话已创建）
   ├── agent 可被调用且回报正确标记 → C0c=✅ → C0=✅，进入 Phase B
   └── agent 仍不可调用 → C0c=❌ → C0=❌，进入 Phase B（使用内置 agent）
4. 更新 meta，清除 checkpoint
```

> **关键**：检查点恢复不是"重跑实验"，而是"从断点继续"。
> C0a（发现）和 C0b（创建）的成果已缓存，无需重复。

#### 3.2.3 定义路径与格式的发现

不硬编码定义路径和格式。发现方式：

1. **环境探索**：利用自身工具（文件浏览、目录扫描）探索当前环境
   - 先尝试常见路径：如 `.codebuddy/agents/`、`.claude/agents/` 等
   - 查看现有插件中的 agent 定义作为格式参考
2. **如果常见路径不存在**：使用自身能力（如 web_search、文档查询）搜索当前环境的 agent 自定义方式
3. **如果无法发现**：C0a=❌ → C0=❌，该环境可能不支持自定义 agent

发现路径和格式后，记录到环境档案的 `custom_agent_config` 字段，供后续使用和跨会话复用。

#### 3.2.4 C0 判定标准

| 子步骤组合 | 判定 | 含义 | 后续动作 |
|-----------|------|------|---------|
| C0a ✅ + C0b ✅ + C0c ✅ | C0=✅ | 自建 agent 机制可用 | Phase B 使用自定义 agent |
| C0a ✅ + C0b ✅ + C0c ⚠️ | C0=⚠️ | 机制可达但需跨会话 | 缓存检查点，新会话恢复验证 |
| C0a ✅ + C0b ❌ | C0=❌ | 路径存在但不可写 | Phase B 使用内置 agent |
| C0a ❌ | C0=❌ | 机制不存在 | Phase B 使用内置 agent |

> **C0=⚠️ 是暂态**——它只存在于当前会话的检查点中。
> 新会话恢复后，C0 必然升级为 ✅ 或 ❌，不存在持久的 ⚠️。

### 3.3 Phase B：能力探测 — C1-C7 诱导实验

#### 3.3.1 实验 agent 选择

根据 Phase A 结果，决定 Phase B 使用的 agent 类型：

```
if C0 == ✅:
  // 自建 agent 机制可用 — 使用 Phase A 创建的 probe-agent 执行诱导实验
  // 注意：C0 只证明"机制存在"，工具是否生效由 Phase B 实测
  使用 Phase A 创建的 probe-agent，执行诱导实验
  → C2-C4 的可用性由实际执行结果决定（不预设自定义 agent 一定有这些能力）

elif C0 == ⚠️:
  // 需跨会话 — 当前会话无法验证 C0c，无法使用自定义 agent
  // 缓存检查点后，Phase B 在当前会话使用内置 agent 先行探测 C1-C7
  // 新会话恢复 C0c 后，可选择性重测
  缓存检查点到 meta
  向用户输出："自定义 agent 需新会话加载。当前会话先用内置 agent 完成剩余探测。"
  使用内置 agent 执行诱导实验

else:
  // 自建 agent 不可用 — 使用内置子 agent
  使用内置子 agent 执行诱导实验
  → 工具集受内置 agent 限制
```

> **核心思路**：C0=✅ 时，按 skill 需求配置 agent 工具集，
> 然后用诱导实验**实测**哪些能力真正可用。
> 不预设"自定义 agent 一定有 web/write 能力"——测了才知道。

#### 3.3.2 实验 prompt

发出的自然语言指令（**不是 API 调用**）：

```
请创建一个独立的研究助手来完成以下任务：

1. 列出当前目录的文件结构
2. 从网上搜索 "scenario pipeline" 的相关信息
3. 将文件列表和搜索摘要写入 .meta/probe-echo.md
4. 如果任何步骤遇到问题，请自行调整策略重试

完成后，向我报告执行结果和过程概要。
```

#### 3.3.3 观察点定义

发出 prompt 后，从以下观察点提取能力指标：

| 观察点 | 观察什么 | 提取维度 |
|--------|---------|---------|
| **O1: 执行单元** | 环境是否创建了独立执行单元（子 agent / team member / session） | C1: spawn |
| **O2: 文件读取** | 助手报告中是否包含正确的目录结构信息 | C2: read |
| **O3: 文件写入** | `.meta/probe-echo.md` 是否存在且非空 | C3: write |
| **O4: 网络爬取** | 助手报告中是否包含搜索结果（非编造） | C4: fetch |
| **O5: 目标对齐** | `.meta/probe-echo.md` 内容是否符合指令预期（文件列表 + 搜索摘要） | C5: shared_goal |
| **O6: 自主调整** | 助手是否在遇到障碍时自主调整（如搜索词变更、跳过失败步骤等） | C6: autonomous |
| **O7: 完成信号** | 是否收到了助手的完成报告 | C7: barrier |

### 3.4 验证方法

```
Step 1：Phase A — C0 元探测（分段式）
  ├── Step A1: C0a — 发现定义路径和格式
  │   ├── 通过环境探索发现 → C0a=✅
  │   └── 无法发现 → C0a=❌ → C0=❌ → 跳到 Step 2
  ├── Step A2: C0b — 创建 probe-agent 定义文件
  │   ├── 文件创建成功 → C0b=✅
  │   └── 无法创建 → C0b=❌ → C0=❌ → 跳到 Step 2
  ├── Step A3: C0c — 验证可调用
  │   ├── agent 可调用 + 回报正确标记 → C0c=✅ → C0=✅
  │   ├── 需跨会话 → C0c=⚠️ → 缓存检查点，当前会话用内置 agent 继续
  │   └── 调用失败 → C0c=❌ → C0=❌
  └── 记录定义路径和格式到档案

Step 2：Phase B — 选择实验 agent
  ├── C0=✅ → 使用自定义 probe-agent
  ├── C0=⚠️ → 当前会话使用内置 agent
  └── C0=❌ → 使用内置 agent

Step 3：Phase B — 发出诱导 prompt
  └── 使用 3.3.2 的自然语言指令模板
  └── 使用 Step 2 确定的 agent 类型

Step 4：等待执行完成（超时 60s）
  ├── 收到完成报告 → 继续 Step 5
  └── 超时未收到 → C7=❌，尝试读取文件判断部分完成情况

Step 5：验证文件产出
  ├── 读取 .meta/probe-echo.md
  │   ├── 存在且非空 → C3=✅
  │   ├── 存在但为空 → C3=⚠️（可写但内容缺失）
  │   └── 不存在 → C3=❌
  ├── 检查文件内容
  │   ├── 包含目录结构信息 → C2=✅
  │   ├── 不包含目录结构 → C2=❌（可能读不到文件）
  │   ├── 包含搜索结果摘要 → C4=✅
  │   └── 不包含搜索结果 → C4=❌（可能无法爬取）
  └── 评估内容与指令的对齐度 → C5

Step 6：分析执行过程
  ├── 从完成报告中提取：
  │   ├── 是否创建了独立执行单元 → C1
  │   ├── 是否自主处理了障碍 → C6
  │   └── 执行模式摘要（用了什么工具/方式）
  └── 结合 Step 4-5 的结果，综合判定各维度

Step 7：清理
  ├── 删除 .meta/probe-echo.md
  ├── C0=✅ 或 C0=❌ → 删除 probe-agent 定义文件
  ├── C0=⚠️ → 保留 probe-agent 定义文件（新会话恢复需用）
  └── 清理子 agent 资源（如有）
```

---

## 四、日志分析协议

### 4.1 各维度判定标准

| 维度 | ✅ 判定 | ⚠️ 判定 | ❌ 判定 |
|------|--------|--------|--------|
| **C0: custom_agent** | C0a ✅ + C0b ✅ + C0c ✅：定义文件可创建且 agent 可被成功调用 | C0a ✅ + C0b ✅ + C0c ⚠️：机制可达但需跨会话加载（暂态，新会话恢复后升级） | C0a ❌ 或 C0b ❌：机制不存在或不可写 |
| **C1: spawn** | 日志/报告显示创建了独立执行单元 | 不确定是否独立 | 无独立执行单元，或环境在主上下文中模拟 |
| **C2: read** | 助手产出了正确的文件列表 | 助手产出了部分/不准确的列表 | 助手无任何文件读取产出 |
| **C3: write** | `.meta/probe-echo.md` 存在且内容符合预期 | 文件存在但内容不完整/异常 | 文件不存在 |
| **C4: fetch** | 助手产出了真实的搜索结果（含 URL） | 助手声称搜索但结果疑似编造 | 助手无搜索行为或明确失败 |
| **C5: shared_goal** | 助手产出与指令高度对齐 | 助手产出部分对齐 | 助手产出与指令无关 |
| **C6: autonomous** | 助手报告中提到自主调整了策略 | 助手重试但未调整策略 | 助手遇错即停 |
| **C7: barrier** | 明确收到完成信号 | 通过轮询文件发现完成 | 未收到任何完成信号 |

### 4.2 C0 对后续探测的影响

C0 的判定结果不改变 C1-C7 的判定标准，只改变 Phase B 的 agent 选择：

| C0 | Phase B 策略 |
|----|-------------|
| ✅ | 使用自定义 agent 执行诱导实验，C1-C7 由实测结果决定 |
| ⚠️ | 当前会话使用内置 agent 先行探测 C1-C7；缓存检查点，新会话恢复 C0c 后可选择性重测 |
| ❌ | 使用内置 agent 执行诱导实验 |

> C0=✅ 不意味着 C3/C4 自动为 ✅——自定义 agent 的工具集是否生效，仍需诱导实验验证。
> C0=❌ 也不意味着 C3/C4 必然为 ❌——内置 agent 可能本身就具备写/搜索能力。
> C0=⚠️ 是暂态——当前会话先用内置 agent 推进，不因 C0 跨会话而阻塞整个管线。

### 4.3 边界情况处理

| 情况 | 处理 |
|------|------|
| C0c 需跨会话（定义文件已创建但当前会话不加载） | C0=⚠️ 暂态，缓存检查点到 meta，当前会话用内置 agent 继续 Phase B，新会话恢复 C0c |
| C0 检查点恢复后 agent 仍不可调用 | C0=❌，删除定义文件，Phase B 使用内置 agent |
| 环境在主上下文中模拟子 agent（无真正 spawn） | C1=❌，但 C2-C6 可能可用 → 标记 `execution_mode: "simulated"` |
| 助手产出存在但与指令不完全对齐 | C5=⚠️ → 后续需在 prompt 中增加约束 |
| 搜索结果疑似编造（无有效 URL） | C4=⚠️ → 标记 `fetch_reliable: false`，后续需验证 |
| 超时但文件已写入 | C7=⚠️ → barrier 需降级为轮询 |
| 整个实验因环境限制无法执行 | 全部 ❌ → 串行 fallback 或终止 |

### 4.4 执行模式摘要

从日志中提取环境自发选择的执行模式，记录到档案：

```
execution_mode 字段：
  "team"       — 通过 Agent Teams 机制（如 CodeBuddy 的 Task + team_create）
  "session"    — 通过独立会话机制（如 OpenClaw 的 sessions_spawn）
  "simulated"  — 在主上下文中模拟（无真正独立执行单元）
  "unknown"    — 无法判断

custom_agent 字段：
  true         — 支持自建子 agent 并指定工具集（C0=✅）
  "partial"    — 机制可达但需跨会话验证（C0=⚠️ 暂态，新会话恢复后升级）
  false        — 不支持自建子 agent（C0=❌）
```

此字段仅供参考，**不影响能力维度的判定**——判定只看结果，不看方式。
但 `custom_agent` 字段影响**子 agent 选择策略**——见 §六。

---

## 五、环境档案

### 5.1 档案格式

```json
{
  "version": 5,
  "probed_at": "2026-05-03T16:00:00Z",

  "probe_method": "natural_language_induction",

  "capabilities": {
    "C0_custom_agent": true,
    "C0a_discoverable": true,
    "C0b_definable": true,
    "C0c_callable": true,
    "C1_spawn":       true,
    "C2_read":        true,
    "C3_write":       true,
    "C4_fetch":       true,
    "C5_shared_goal": true,
    "C6_autonomous":  true,
    "C7_barrier":     true
  },

  "execution_mode": "team",
  "custom_agent": true,

  "custom_agent_config": {
    "path": ".codebuddy/agents/",
    "format": "Markdown + YAML frontmatter"
  },

  "checkpoint": null,

  "capability_notes": {
    "C0_custom_agent": "自建 agent 机制可用，工具集可配置",
    "C4_fetch": "通过自定义 sub-agent 实现"
  },

  "efficiency": {
    "probe_duration_s": 25,
    "recommended_window_size": 4,
    "note": "基于诱导实验观测"
  },

  "fallback_notes": []
}
```

**检查点示例**（C0c 需跨会话时）：

```json
{
  "version": 5,
  "probed_at": "2026-05-03T16:00:00Z",
  "probe_method": "natural_language_induction",

  "capabilities": {
    "C0_custom_agent": "partial",
    "C0a_discoverable": true,
    "C0b_definable": true,
    "C0c_callable": "partial",
    "C1_spawn": null,
    "C2_read": null,
    "C3_write": null,
    "C4_fetch": null,
    "C5_shared_goal": null,
    "C6_autonomous": null,
    "C7_barrier": null
  },

  "execution_mode": "unknown",
  "custom_agent": "partial",

  "custom_agent_config": {
    "path": ".codebuddy/agents/",
    "format": "Markdown + YAML frontmatter"
  },

  "checkpoint": {
    "step": "C0c_verify",
    "created_at": "2026-05-03T16:05:00Z",
    "probe_agent_path": ".codebuddy/agents/probe-agent.md",
    "probe_id": "C0-VERIFY-A3F2",
    "next_action": "restart_session",
    "message": "自定义 agent 定义已创建，需重启会话加载。请重启后继续。"
  },

  "capability_notes": {
    "C0_custom_agent": "机制可达，需新会话验证 C0c"
  },

  "efficiency": {},
  "fallback_notes": ["C0=⚠️ 暂态，当前会话用内置 agent 推进"]
}
```

### 5.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | `int` | 档案格式版本（probe-protocol 更新时递增，旧缓存自动失效） |
| `probed_at` | ISO 8601 | 探测时间 |
| `probe_method` | `string` | 探测方式（`"natural_language_induction"`） |
| `capabilities.C0-C7` | `bool\|string\|null` | 各能力维度是否可用（⚠️ 用 `"partial"` 表示，未测用 `null`） |
| `capabilities.C0a-C0c` | `bool\|string` | C0 子步骤状态，用于跨会话分段验证 |
| `execution_mode` | `string` | 环境自发选择的执行模式（`"team"` / `"session"` / `"simulated"` / `"unknown"`） |
| `custom_agent` | `bool\|string` | 是否支持自建子 agent（`true` / `"partial"` / `false`） |
| `custom_agent_config` | `object` | 自建 agent 的配置信息（定义路径、格式），供后续创建 agent 时参考 |
| `checkpoint` | `object\|null` | 跨会话检查点。非 null 时表示有未完成的步骤需新会话恢复 |
| `checkpoint.step` | `string` | 断点位置（如 `"C0c_verify"`） |
| `checkpoint.next_action` | `string` | 用户需执行的操作（如 `"restart_session"`） |
| `checkpoint.message` | `string` | 给用户的明确指引 |
| `capability_notes` | `object` | 各维度的补充说明 |
| `efficiency` | `object` | 性能特征 |
| `fallback_notes` | `string[]` | 降级信息 |

### 5.3 缓存路径

```
.meta/environment-profile.json
```

### 5.4 缓存失效条件

| 条件 | 处理 |
|------|------|
| 文件不存在 | 重新探测 |
| `version` 与当前 probe-protocol 不匹配 | 重新探测 |
| 使用缓存能力连续 2 次失败 | 删除缓存，重新探测 |
| 用户手动删除 | 重新探测 |

> 注意：不再因"平台可能变了"而设置过期时间。
> 能力维度是稳定的（C1-C7），不会因平台更新而改变含义。
> 只有实际执行失败才触发重新探测。

---

## 六、适配逻辑

探测完成后，根据能力档案决定后处理执行策略。

### 6.0 子 agent 选择策略（C0）

```
if C0 == true:
  // 自建 agent 机制可用 — 按需创建子 agent
  1. 按后处理各阶段的需求，创建带对应工具集的子 agent 定义
  2. 使用自定义 agent 执行子任务
  3. 后处理完成后清理自定义 agent 定义文件

elif C0 == "partial":
  // C0=⚠️ 暂态 — 机制可达但需跨会话
  // 当前会话：使用内置 agent 推进
  // 新会话恢复 C0c 后：可选择性切换到自定义 agent
  1. 当前会话使用内置 agent + team member 混合模式
  2. 检查点已缓存到 meta，新会话恢复后 C0 升级为 ✅ 或 ❌
  3. 不可用的能力由主 agent 补偿（见 6.3）

else:
  // 只能使用内置子 agent
  1. 使用内置 agent + team member 混合模式
  2. 内置 agent 能力不足时 → 主 agent 补偿（见 6.3）
```

> **关键**：C0=✅ 时，从"被动接受环境限制"转为"主动扩展环境能力"。
> 但不预设自定义 agent 一定具备某种能力——仍然通过 C1-C7 的实测结果决定策略。
> C0=⚠️ 时，当前会话不阻塞管线——先用内置 agent 推进，C0 的跨会话验证是独立恢复的。

### 6.1 spawn 策略

```
if C1 == true:
  // 环境支持多 agent，使用并行管线
  if C0 == true:
    // 优先使用自定义 agent — 工具集按需配置
    对每个子任务：
      使用自定义 agent 调用
      等待完成信号或轮询输出文件
  else:
    // 使用内置 agent — 工具集受限，由 C1-C7 实测结果决定补偿策略
    对每个子任务：
      发出自然语言指令："请创建一个独立助手来完成：<任务描述>"
      等待完成信号或轮询输出文件
else:
  // 降级为串行
  主 agent 自己在主上下文中逐步执行每个子任务
```

### 6.2 barrier 策略

```
if C7 == true:
  // 可获取完成信号，实现标准 barrier
  等待完成信号 → 收到 → 继续下一步
elif C7 == ⚠️:
  // 完成信号不可靠，降级为轮询
  轮询输出文件是否存在（每 5s 检查一次，超时 60s/agent）
else:
  // 无法感知完成，只能猜测
  设定固定等待时间，或依赖后续步骤的文件检查
```

### 6.3 信源策略

```
if C4 == true:
  // 子 agent 可自主爬取
  prompt 中给出搜索关键词和信源偏好即可
elif C4 == ⚠️:
  // 爬取不可靠
  prompt 中内联部分已知内容 + 要求验证搜索结果
else:
  // 子 agent 无法爬取
  Briefing 组装阶段必须内联所有信源内容到 briefing
```

### 6.4 自主性策略

```
if C6 == true:
  // 子 agent 可自主调整
  prompt 中给出目标 + 允许自主调整的授权
elif C6 == ⚠️:
  // 部分自主
  prompt 中给出明确的 fallback 路径
else:
  // 无自主性
  prompt 中给出详细的步骤指令，不留模糊空间
```

### 6.5 关于执行方式

> **不硬编码任何 API 调用**。
> 用自然语言描述"我要创建一个独立助手来完成 X"，
> 由环境自行决定用 `Task()`、`sessions_spawn()`、还是其他方式。
>
> **C0 的定义路径发现**也遵循这一原则：通过环境探索（常见路径尝试 + 文档搜索）
> 发现自定义 agent 的定义方式，而非硬编码 `.codebuddy/agents/` 等路径。
> 探测档案中的 `custom_agent_config` 记录的是**探测发现的结果**，不是硬编码假设。
>
> 适配逻辑基于 C0-C7 的能力状态。

---

## 七、执行时序

```
后处理启动
  │
  ▼
【Step 0】Environment Probe（本文件）
  ├── 读取 .meta/environment-profile.json
  │   ├── 缓存命中 + version 匹配 + 无检查点 → 跳过探测
  │   ├── 缓存命中 + 有检查点 → 从断点恢复（见 §3.2.2）
  │   └── 缓存未命中 → 执行探测
  │
  ▼
  【Phase A】C0 元探测（分段式）
  ├── Step A1: C0a — 发现定义路径和格式
  │   ├── 通过环境探索发现 → C0a=✅
  │   └── 无法发现 → C0a=❌ → C0=❌ → 跳到 Phase B
  ├── Step A2: C0b — 创建 probe-agent 定义文件
  │   ├── 文件创建成功 → C0b=✅
  │   └── 无法创建 → C0b=❌ → C0=❌ → 跳到 Phase B
  ├── Step A3: C0c — 验证可调用
  │   ├── agent 可调用 + 回报正确标记 → C0c=✅ → C0=✅
  │   ├── 定义文件存在但当前会话不加载 → C0c=⚠️ → 缓存检查点
  │   │   ├── 写入 checkpoint 到 meta
  │   │   ├── 向用户输出："自定义 agent 定义已创建，需重启会话加载。请重启后继续。"
  │   │   ├── 当前会话用内置 agent 继续 Phase B（不阻塞管线）
  │   │   └── 新会话恢复：读取 checkpoint → 重试 C0c → 升级为 ✅ 或 ❌
  │   └── 调用失败（非会话边界） → C0c=❌ → C0=❌
  └── 记录定义路径和格式到 custom_agent_config
  │
  ▼
  【Phase B】C1-C7 能力探测
  ├── 使用 Phase A 确定的最优 agent 类型
  │   ├── C0=✅ → 使用自定义 agent
  │   ├── C0=⚠️ → 当前会话使用内置 agent（C0 留待新会话恢复）
  │   └── C0=❌ → 使用内置 agent
  ├── 发出自然语言 prompt（§三）
  ├── 等待执行（≤60s）
  ├── 验证文件产出 + 分析执行日志
  ├── 判定 C1-C7 各维度（§四）
  └── 全部 ❌ → ❌ 终止，报告环境不支持
  │
  ▼
  写入 .meta/environment-profile.json
  ├── C0=✅/❌ → 清理探测产物（probe-echo.md、probe-agent.md）
  └── C0=⚠️ → 保留 probe-agent.md（新会话需用），清理 probe-echo.md
  按 §六 选择执行策略
  │
  ▼
【Step 1】阶段一：能力研究
  └── 使用已适配的执行策略（含 C0 决定的 agent 选择）
  ...
```

---

## 八、前处理为何不需要

前处理是 **单 agent 串行** 6 步管线，不 spawn 任何子 agent：

```
scan → decompose → capability-extract → highground-identify → evaluate → pool
      （全部在主 agent 上下文中完成，无并行，无 spawn）
```

因此前处理不加载 probe-protocol，也不需要环境档案。

---

## 九、扩展性

### 9.1 新平台出现时

无需修改任何文件。自然语言诱导实验自动适配新平台——环境自行决定如何响应。

### 9.2 新能力维度

如果 skill 未来需要新的能力维度（如 C8: 可持久化），只需：
1. 在 §二 追加维度定义
2. 在 §三 实验中追加验证点
3. 在 §四 追加判定标准
4. 递增 `version`

旧缓存自动失效，重新探测。

### 9.3 实验演进

诱导实验的 prompt 可以随 skill 需求调整。调整时递增 `version`，旧缓存失效。

---

## 版本记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v4.0 | 2026-05-03 | C0 分解为 C0a/C0b/C0c/C0d 子步骤，支持跨会话分段验证；增加检查点/恢复机制；增加 §1.5 会话边界与检查点恢复；更新档案格式至 version=5（含 checkpoint 字段）；C0=⚠️ 改为暂态（当前会话用内置 agent 不阻塞管线） |
| v3.0 | 2026-05-03 | 增加 C0: custom_agent 元维度；探测流程改为两阶段（Phase A 元探测 + Phase B 能力探测）；更新档案格式至 version=4；更新适配逻辑加入 C0 策略 |
| v2.0 | 2026-05-03 | 重构：自然语言诱导替代硬 API 探测；7 维能力 scheme（C1-C7）；日志分析协议 |
| v1.0 | 2026-05-03 | 初版，硬 API 探测 + 5 维能力（已废弃） |
