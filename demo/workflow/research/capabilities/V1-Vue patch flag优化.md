# V1 - Vue Patch Flag 优化

## 核心机制

### 编译时优化概述
Vue 3 的核心性能突破在于**将 diff 的优化从运行时转移到编译时**。通过编译器分析模板，标记动态节点和属性，实现靶向更新。

### PatchFlag（补丁标志）
编译器为每个 VNode 打上 PatchFlag，标识其动态内容类型：

```typescript
export const enum PatchFlags {
  TEXT = 1,           // 动态文本节点
  CLASS = 1 << 1,     // 动态 class
  STYLE = 1 << 2,     // 动态 style
  PROPS = 1 << 3,     // 除 class/style 外的动态属性
  FULL_PROPS = 1 << 4, // 有 key，需要完整 diff
  HYDRATE_EVENTS = 1 << 5, // 需挂载事件
  STABLE_FRAGMENT = 1 << 6, // 稳定序列 fragment
  KEYED_FRAGMENT = 1 << 7,  // 有 key 的 fragment
  UNKEYED_FRAGMENT = 1 << 8, // 无 key 的 fragment
  NEED_PATCH = 1 << 9,      // 需要非 props 比较（ref 等）
  DYNAMIC_SLOTS = 1 << 10,  // 动态插槽
  HOISTED = -1,       // 静态节点，不比较子节点
  BAIL = -2           // 结束 diff
}
```

### Block Tree（块树）
Vue 3 引入 Block 概念，将模板按动态节点指令切割为嵌套区块：
- 每个 Block 用一个 `dynamicChildren` 数组收集其内部的动态节点
- 更新时只遍历 `dynamicChildren`，跳过所有静态节点

```javascript
// 编译器生成的 render 函数
export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("span", null, "static text", -1), // HOISTED
    _createElementVNode("span", null, _toDisplayString(_ctx.message), 1 /* TEXT */),
    _createElementVNode("span", null, "static text", -1),
  ]))
}

// 运行时：Block VNode 的 dynamicChildren 只包含动态 span
// patch 时直接遍历 dynamicChildren，跳过静态节点
```

### 靶向更新机制
```javascript
const patchElement = (n1, n2) => {
  let el = n2.el = n1.el;
  let { patchFlag, dynamicChildren } = n2;
  
  if (n2.dynamicChildren) {
    // 只比较动态子节点（线性遍历）
    patchBlockChildren(n1, n2);
  } else {
    // 全量 diff
    patchChildren(n1, n2, el);
  }
  
  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.CLASS) {
      // 只更新 class
    }
    if (patchFlag & PatchFlags.TEXT) {
      // 只更新文本
    }
    // ...按 flag 靶向更新
  }
}
```

### 其他编译优化
1. **静态提升（Hoist Static）**：静态 VNode 提升为模块级常量，避免每次 render 重建
2. **预字符串化（Pre-stringify）**：连续 10+ 静态节点序列化为字符串，减少 VNode 创建
3. **函数缓存（Cache Handlers）**：内联事件处理函数缓存，避免每次创建新函数

## 工程瓶颈

1. **模板外动态内容无法优化**：`v-for` + render function 混用时，编译器无法分析动态节点
2. **动态组件开销**：`<component :is="xxx">` 导致 FULL_PROPS，需要完整 diff
3. **Slot 动态化**：动态插槽（DYNAMIC_SLOTS）会降低 Block Tree 优化效果
4. **SSR 场景下编译优化受限**：服务端渲染不走客户端 diff，PatchFlag 在 SSR 阶段无作用
5. **大型列表的 Block Tree 深度**：嵌套过深的 Block 结构会增加内存和遍历开销

## 调试工具

- **Vue DevTools**：查看组件 VNode 树和 PatchFlag
- **Vue Template Explorer**：在线查看模板编译结果（https://template-explorer.vuejs.org）
- **`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`**：生产环境 hydration mismatch 详情
- **Vue Macros**：查看编译产物中的 PatchFlag 和 Block Tree

## 典型权衡

### 权衡 1：编译时 vs 运行时优化
- 编译时优化（Vue 3）：零运行时开销，但受限于模板语法
- 运行时优化（Vue 2）：灵活性高，但 diff 开销与模板大小正相关

### 权衡 2：静态提升 vs 内存占用
- 静态提升减少 VNode 创建开销，但增加模块级常量的内存占用
- 对于大量静态内容的页面，提升效果显著；动态页面收益有限

### 权衡 3：Block Tree 粒度
- 粗粒度 Block：减少 Block 数量，但单个 Block 的 dynamicChildren 较大
- 细粒度 Block：dynamicChildren 更小，但 Block 管理开销增加

## 最小验证实验

```vue
<!-- 实验：观察编译产物中 PatchFlag 和 Block Tree 的差异 -->
<!-- 保存为 TestComp.vue，在 Vue Template Explorer 中查看编译结果 -->

<template>
  <div>
    <!-- 静态节点：编译后标记 HOISTED(-1)，提升为常量 -->
    <p>static text 1</p>
    <p>static text 2</p>
    
    <!-- 动态文本：编译后标记 TEXT(1) -->
    <p>{{ message }}</p>
    
    <!-- 动态 class + 动态文本：编译后标记 CLASS|TEXT(3) -->
    <p :class="dynamicClass">{{ dynamicText }}</p>
    
    <!-- 动态属性：编译后标记 PROPS(8) + dynamicProps -->
    <a :href="dynamicHref">link</a>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const message = ref('hello');
const dynamicClass = ref('active');
const dynamicText = ref('world');
const dynamicHref = ref('/page');
</script>
```

**预期结果**：在 Vue Template Explorer 中可以看到：
- 静态 `<p>` 节点被标记为 `HOISTED` 并提升
- 动态节点带有具体 PatchFlag
- 整个模板生成一个 Block，`dynamicChildren` 只收集动态节点

## 参考资料

1. [Vue 3 编译优化详解 - WEB开发网](http://www.cncms.com.cn/internet/20221219/121945559.html)
2. [Vue 3 PatchFlag 超详细讲解 - 掘金](https://juejin.cn/post/6858955776992968712)
3. [Vue 3 静态节点提升 - SegmentFault](https://segmentfault.com/a/1190000024520877)
4. [Vue 3 编译优化内容 - PHP中文网](https://m.php.cn/faq/542455.html)
5. [Vue Template Explorer](https://template-explorer.vuejs.org)
