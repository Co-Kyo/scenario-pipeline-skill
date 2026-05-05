# Plugin: 能力研究模式 (capability-research-mode)

> 定义能力研究的执行策略：材料块标准格式、研究深度分级、实验模板。
> 本文件是 processes/capability-research.md 和 processes/assemble.md 的格式规范。

---

## 一、材料块标准格式

每个原子能力的研究产出必须遵循以下 YAML 结构：

```yaml
capability_block:
  id: "A1"                              # 能力 ID
  name: "浏览器渲染管线"                  # 能力名称
  fanout: "6/7"                         # 扇出度
  coupling: 1                           # 限定词耦合度（1/2/3）

  mechanism: |                          # 核心机制阐述
    关键渲染路径（CRP）：
    DOM Tree + CSSOM Tree
      → Style（样式计算）
      → Layout（布局）
      → Paint（绘制）
      → Composite（合成）
    ...

  bottlenecks:                          # 工程瓶颈清单
    - id: "A1-B1"
      name: "强制同步布局"
      category: "时序竞争"                # 分类维度：输入变异/状态跃迁/资源边界/规模拐点/时序竞争
      priority: "P0"                     # 优先级：P0-必现/P1-高频/P2-边界/P3-极端
      trigger: "读 offsetHeight 后立即写 style"
      symptom: "帧率骤降到 15fps"
      detection: "DevTools Performance → Layout 事件"
      version_sensitive: "strong"        # 版本相关性：strong/weak/none
      affected_tool: "Chrome"            # 涉及的工具链/运行环境
      affected_versions: "< 85"          # 受影响版本范围
      fixed_version: "85"                # 修复版本（如有）
      fixed_source: "https://chromestatus.com/roadmap"  # 版本验证来源
      mitigation:
        - "读写分离：批量读完再批量写"
        - "ResizeObserver 异步测量"
        - "CSS contain 限制 Layout 范围"

  tools:                                # 调试工具
    - name: "Chrome DevTools Performance 面板"
      usage: "录制滚动操作，分析火焰图中的 Long Task"
    - name: "Chrome DevTools Rendering 面板"
      usage: "勾选 Paint Flashing，观察重绘区域"

  tradeoffs:                            # 典型权衡
    - id: "A1-T1"
      dimension: "图层数 vs GPU 内存"
      option_a: "will-change 提升独立图层 → Paint 隔离，GPU 内存增加"
      option_b: "不提升 → Paint 整体重绘，GPU 内存节省"

  experiments:                          # 最小验证实验（deep 模式）
    - id: "A1-E1"
      description: "强制同步布局 vs 读写分离的帧率对比"
      code: |
        // 详见 experiment/src/index.html
      verification: "DevTools Performance → 对比 Layout 事件频率"

  references:                           # 参考资料
    - tier: T1
      url: "https://developer.chrome.com/docs/devtools/performance/"
      title: "Chrome DevTools Performance Analysis"
    - tier: T1
      url: "https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path"
      title: "MDN: Critical Rendering Path"
```

---

## 二、研究深度分级

| 深度 | mechanism | bottlenecks | tools | tradeoffs | experiments | references |
|------|-----------|-------------|-------|-----------|-------------|------------|
| shallow | ✅ 必填 | ✅ P0 必覆盖 | ✅ 1-2 个 | ⬜ 可选 | ⬜ 跳过 | ✅ T1 |
| normal | ✅ 必填 | ✅ P0+P1 必覆盖 | ✅ 2-3 个 | ✅ 2 个 | ⬜ 可选 | ✅ T1+T2 |
| deep | ✅ 必填 | ✅ P0+P1+P2 必覆盖 | ✅ 3+ 个 | ✅ 3 个 | ✅ 必填 | ✅ T1+T2+T3 |

### 深度选择规则

- `--depth=shallow`：面试向速查，只填核心机制和常见坑
- `--depth=normal`（默认）：工程实践向，覆盖机制+坑点+权衡
- `--depth=deep`：源码级分析，包含可运行实验

---

## 三、实验模板

当深度为 deep 时，每个能力材料块的 experiments 字段必须包含一个可运行实验。

### experiment/README.md 强制模板

```markdown
# MVE: <能力名称>

## 环境基线
- 运行时版本：如 Node v20.x / Chrome v121+
- 包管理器：如 pnpm@8.x（如适用）
- 操作系统约束（如有）

## 一键启动
<单条命令完成安装+启动>

## 验证检查点
1. [预期现象] → 检查方式 → 验证的原子能力：A1/A2/...
2. [预期现象] → 检查方式 → 验证的原子能力：A1/A2/...
3. [预期现象] → 检查方式 → 验证的原子能力：A1/A2/...

## 故障排除
- **问题A** → 解决方法
- **问题B** → 解决方法
```

---

## 四、材料块质量校验

产出材料块后，必须通过以下校验：

| 检查项 | 规则 |
|--------|------|
| mechanism 不为空 | 必须包含该能力的核心机制描述 |
| bottlenecks 覆盖 P0/P1 | shallow: P0 必覆盖; normal: P0+P1 必覆盖; deep: P0+P1+P2 必覆盖 |
| 版本强相关瓶颈已验证 | version_sensitive=strong 的瓶颈必须有 affected_tool/affected_versions/fixed_version/fixed_source |
| 每个 bottleneck 有 detection | 必须可检测，不能只描述症状 |
| tradeoffs 有 dimension | 必须标注两个对立维度 |
| references 至少 1 个 T1 | 必须有权威来源 |
| experiments 可运行（deep） | 代码可直接执行，无手动配置 |

---

## 五、可替换性

本 plugin 定义的是"正常研究模式"。可替换为：

| 模式 | 场景 | 差异 |
|------|------|------|
| **快速模式** | 面试前速查 | 只填 mechanism + bottlenecks，跳过 experiments |
| **教学模式** | 技术培训 | 增加"常见误区"和"渐进式示例"字段 |
| **审计模式** | 技术选型 | 增加"性能基准数据"和"兼容性矩阵"字段 |

替换方式：在编排文件（pre-process.md / post-process.md）中修改对本 plugin 的引用。
