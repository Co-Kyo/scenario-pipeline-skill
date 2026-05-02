# Process: 架构分词 (decompose)

> 对技术命题执行架构分词，识别通用内核与特化层。

## 输入

- `proposition`：命题文本（如"Vue3 虚拟列表：万级数据渲染"）
- `qualifier_context`：限定词上下文（可选，如框架/平台/架构模式）

## 执行步骤

### Step 1：识别限定词与技术栈关键词

从命题中区分：
- **限定词**：指定框架/平台/工具的词（Vue、React、小程序、Webpack...）
- **技术栈关键词**：指向底层工程机制的词（虚拟列表、缓存、沙箱、diff...）

### Step 2：向上展开依赖链

问：技术栈关键词**依赖**什么底层能力？

### Step 3：向下展开被依赖链

问：技术栈关键词**被**哪些上层场景使用？

### Step 4：分层标注

标注 [通用内核] 和 [特化层]，**不拆分命题**。

### Step 5：确定内容权重

| 通用内核占比 | 条件 |
|------------|------|
| ≥ 80% | 通用层跨 3+ 技术栈层级，深度远超框架层 |
| 60-80% | 通用层跨 2-3 层，框架层有一定深度 |
| 40-60% | 通用层和框架层深度相当 |
| < 40% | 框架层深度为主 |

## 输出

```yaml
decomposition:
  proposition: "Vue3 虚拟列表：万级数据渲染"
  qualifier: "Vue3"
  tech_keyword: "虚拟列表"
  generic_core:
    - layer: "算法"
      capabilities: ["前缀和", "二分查找"]
    - layer: "浏览器"
      capabilities: ["渲染管线", "DOM 节点管理"]
  specialization:
    - layer: "框架"
      capabilities: ["Composition API", "响应式联动"]
  content_weight: "≥ 80%"
  weight_reasoning: "通用层跨算法+浏览器+内存+交互 4 层"
```

## 依赖

- 无（可独立执行）

## 参考

- core/architecture-decomposition.md（分词方法论）
- plugins/year-granularity.md（年限过滤，按需加载）
