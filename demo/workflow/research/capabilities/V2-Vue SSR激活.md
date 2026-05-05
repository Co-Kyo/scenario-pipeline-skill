# V2 - Vue SSR 激活

## 核心机制

### Vue 3 SSR Hydration 流程
Vue 3 的 SSR Hydration 是将服务端生成的 HTML 在客户端"激活"为可交互 Vue 应用的过程：

1. **服务端**：执行组件渲染 → 生成 HTML 字符串 → 发送响应
2. **客户端**：接收 HTML → 创建 App → Vue 遍历已有 DOM 树 → 匹配 VNode → 绑定事件和响应式数据
3. **Hydration 成功**：复用已有 DOM，不重建
4. **Hydration 失败（mismatch）**：回退到客户端重建 DOM

```javascript
// 服务端
import { renderToString } from 'vue/server-renderer';
const html = await renderToString(app);

// 客户端
import { createSSRApp } from 'vue';
const app = createSSRApp(App);
app.mount('#app'); // 自动执行 hydration
```

### 编译时 Hydration 优化
Vue 3.1+ 引入了编译时 hydration 优化，减少客户端 hydration 的工作量：

1. **静态内容跳过**：编译器标记的静态节点（`HOISTED`）在 hydration 时直接跳过，不创建 VNode
2. **事件注水优化**：通过 `HYDRATE_EVENTS` flag，只对有事件绑定的节点执行事件附加
3. **PatchFlag 引导 hydration**：利用编译时生成的 PatchFlag，hydration 只关注动态部分

```javascript
// 编译产物示例
const _hoisted_1 = /*#__PURE__*/_createStaticVNode("<div>static content</div>", 1)

export function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1, // hydration 时直接跳过
    _createElementVNode("span", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
  ]))
}
```

### Vue 3.5 Lazy Hydration
Vue 3.5 引入了 Lazy Hydration（延迟注水）：

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

// 异步组件不会阻塞 hydration
const HeavyComponent = defineAsyncComponent(() => import('./Heavy.vue'));
</script>

<template>
  <HeavyComponent />
</template>
```

### Async Setup 与 SSR
`<script setup>` 中的顶层 await 在 SSR 中的行为：
- 服务端：await 完成后才渲染 HTML
- 客户端：hydration 时也需要 await 完成
- 如果 async setup 的结果不一致，会导致 mismatch

```vue
<script setup>
// 这个 await 在服务端和客户端都会执行
const data = await fetch('/api/data').then(r => r.json());
</script>
```

## 工程瓶颈

1. **Hydration Mismatch 根本原因**：同一份代码在 Node 和 Browser 两个环境执行，时间、环境、状态天然不一致
2. **全量 Hydration 开销**：即使大部分内容静态，传统 SSR 仍需遍历整棵 DOM 树
3. **异步数据一致性**：async setup 在服务端和客户端可能获取到不同数据
4. **第三方库兼容性**：部分库在 SSR 环境下行为不同（如 window/document 依赖）
5. **Hydration 性能瓶颈**：大量组件的 hydration 是 CPU 密集操作，低端设备体验差

## 调试工具

- **Vue DevTools**：查看组件 hydration 状态和 VNode 树
- **`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`**：生产环境 mismatch 详情（Vue 3.5+）
- **Vue Template Explorer**：查看编译产物中的 hydration 相关 flag
- **Lighthouse / Web Vitals**：测量 TTFB、FCP、TTI
- **Nuxt DevTools**：Nuxt 项目的 SSR/hydration 调试

## 典型权衡

### 权衡 1：Hydration 范围 vs 交互延迟
- 全量 hydration：完整但慢
- Lazy Hydration（Vue 3.5）：快但需要管理组件加载状态
- Islands 架构：最小化 hydration 但增加架构复杂度

### 权衡 2：数据一致性 vs 性能
- 服务端预取数据注入 `window.__INITIAL_DATA__`：保证一致性但增加 HTML 体积
- 客户端重新获取：可能不一致但 HTML 更轻
- 使用 `useAsyncData` + key 缓存：平衡方案

### 权衡 3：编译优化 vs 运行时灵活性
- 编译时标记静态节点减少 hydration 工作量
- 但动态模板（v-html、render function）无法被编译器优化

## 最小验证实验

```vue
<!-- 实验：观察 Vue 3 Hydration Mismatch 行为 -->
<!-- 创建 Nuxt 3 项目，添加以下页面 -->

<!-- pages/hydration-test.vue -->
<template>
  <div>
    <h1>Hydration Test</h1>
    <!-- 这会产生 mismatch：服务端和客户端时间不同 -->
    <p>当前时间: {{ currentTime }}</p>
    
    <!-- 正确做法：客户端才更新 -->
    <p>安全时间: <ClientOnly>{{ safeTime }}</ClientOnly></p>
  </div>
</template>

<script setup>
const currentTime = new Date().toISOString(); // SSR mismatch!
const safeTime = ref('');

onMounted(() => {
  safeTime.value = new Date().toISOString();
});
</script>

<!-- 打开浏览器控制台，观察 hydration mismatch 警告 -->
```

**预期结果**：控制台出现 `Hydration attribute mismatch` 警告，`currentTime` 在服务端和客户端值不同。使用 `<ClientOnly>` 包裹后 mismatch 消失。

## 参考资料

1. [Vue 3 SSR 官方文档](https://vuejs.org/guide/scaling-up/ssr.html)
2. [Vue 3.5 SSR 渲染优化与 Lazy Hydration - CSDN](https://m.blog.csdn.net/qq_27434061/article/details/144882854)
3. [Hydration 与 SSR 的关系 - CSDN](https://blog.csdn.net/lalala8866/article/details/142207077)
4. [Vue SSR Hydration Mismatch 原理 - 博客园](https://www.cnblogs.com/zxlh1529/p/19370364)
5. [Nuxt 3 SSR 实践指南 - CSDN](https://fruge365.blog.csdn.net/article/details/153964482)
