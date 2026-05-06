# P6-构建产物 — 学习阶梯

## 阶梯总览

```
Level 1 → Level 2 → Level 3 → Level 4 → Level 5
 入门       进阶       实战       专家       架构
```

---

## Level 1：入门 — 理解构建产物是什么

### 学习目标
- 理解为什么需要构建工具（浏览器不直接支持 ESM 的 import/export）
- 理解 bundle 是什么，为什么需要拆分
- 能看懂 Webpack/Vite 的基本构建输出

### 核心知识点
1. **ES Module 基础**：`import`/`export` 语法，模块作用域，模块间依赖关系
2. **构建产物结构**：entry chunk、vendor chunk、async chunk 的概念
3. **为什么需要 Code Splitting**：单一 bundle 体积大 → 首屏加载慢 → 需要按需加载

### 实践练习
- 创建一个 3 文件的小项目（main.js + math.js + utils.js）
- 用 Vite 构建，观察 `dist/` 目录产物
- 打开 Network 面板，观察资源加载顺序

### 里程碑
- [ ] 能解释 "bundle" 和 "chunk" 的区别
- [ ] 能用 `npm run build` 生成构建产物
- [ ] 能在浏览器 Network 面板中识别 JS 资源

---

## Level 2：进阶 — 掌握 Tree Shaking 和 Code Splitting

### 学习目标
- 理解 Tree Shaking 的工作原理和前提条件
- 掌握动态 `import()` 的用法
- 能配置基本的代码分割

### 核心知识点
1. **Tree Shaking 机制**：ESM 静态分析 → usedExports 标记 → 压缩器删除
2. **sideEffects 声明**：`"sideEffects": false` 的含义和风险
3. **动态 import()**：返回 Promise，构建工具识别为 split point
4. **Webpack splitChunks 基础配置**：`chunks: 'all'`、`minSize`、`cacheGroups`

### 实践练习
- 完成本命题的实验（experiment/ 目录）
- 用 webpack-bundle-analyzer 对比 Tree Shaking 前后的 bundle
- 实现一个路由级 Code Splitting（React.lazy 或 defineAsyncComponent）

### 里程碑
- [ ] 能解释为什么 CJS 模块无法 Tree Shaking
- [ ] 能用 `import()` 实现路由级代码分割
- [ ] 能用 bundle analyzer 识别重复依赖

---

## Level 3：实战 — 工程化配置与问题排查

### 学习目标
- 能针对项目特点配置 splitChunks 策略
- 能排查 Tree Shaking 失效的常见原因
- 掌握资源加载策略（preload/prefetch）与构建产物的联动

### 核心知识点
1. **splitChunks 高级配置**：`maxSize`（进一步拆分）、`priority`（优先级）、`name`（命名策略）
2. **Tree Shaking 排查清单**：Babel modules 配置、CJS 混入检测、副作用审计
3. **Runtime Chunk**：`runtimeChunk: 'single'` 的缓存稳定性收益
4. **contenthash 稳定性**：`moduleIds: 'deterministic'` + `chunkIds: 'deterministic'`
5. **资源加载联动**：preload 当前路由 chunk、prefetch 其他路由 chunk

### 实践练习
- 为一个真实项目配置 splitChunks，将初始 bundle 从 >500KB 优化到 <200KB
- 排查并修复一个 Tree Shaking 失效的案例（如引入 lodash 而非 lodash-es）
- 配置 Webpack 持久化缓存（filesystem cache），对比构建速度

### 里程碑
- [ ] 能将初始 JS 体积控制在 200KB (gzip) 以内
- [ ] 能在 10 分钟内定位 Tree Shaking 失效的原因
- [ ] 能配置 contenthash 长期缓存策略

---

## Level 4：专家 — 性能分析与深度优化

### 学习目标
- 能用 Lighthouse + webpack-bundle-analyzer 做全链路分析
- 掌握 Webpack 和 Vite 的高级优化技巧
- 能设计大型项目的构建架构

### 核心知识点
1. **Bundle 分析方法论**：source-map-explorer 代码覆盖率分析 + 按需加载路径规划
2. **Webpack Module Federation**：微前端场景的运行时模块共享
3. **Vite 库模式**：`build.lib` 配置，外部化依赖，ESM/CJS 双格式输出
4. **构建性能优化**：持久化缓存、thread-loader、DllPlugin（Webpack）、esbuild 优化器（Vite）
5. **Polyfill 策略**：`@babel/preset-env` + `useBuiltIns: 'usage'` 按需注入

### 实践练习
- 设计一个微前端项目的构建架构（Module Federation 或 qiankun）
- 将一个大型项目的构建时间从 >60s 优化到 <15s
- 实现一个 npm 库的 ESM + CJS 双格式发布

### 里程碑
- [ ] 能设计大型项目的构建分割策略
- [ ] 能将构建时间优化 50% 以上
- [ ] 能发布 ESM + CJS 双格式的 npm 包

---

## Level 5：架构 — 构建体系设计与团队规范

### 学习目标
- 能设计团队级构建规范和最佳实践
- 能评估和选型构建工具（Webpack vs Vite vs Turbopack）
- 能建立构建产物的监控和告警体系

### 核心知识点
1. **构建工具选型**：Webpack（大型存量）、Vite（新项目）、Turbopack（Next.js 生态）、Rspack（Webpack 兼容高性能）
2. **构建规范设计**：chunk 命名规范、splitChunks 策略模板、CI/CD 中的 bundle 大小检查
3. **构建产物监控**：bundle 大小趋势跟踪、Lighthouse CI 集成、回归检测
4. **Monorepo 构建策略**：Turborepo/Nx 的构建缓存、增量构建、任务编排
5. **前沿趋势**：Rust 构建工具（Rspack/Oxc）、Module Federation 2.0、Vite Environment API

### 实践练习
- 为团队制定构建规范文档（splitChunks 策略、命名规范、缓存策略）
- 搭建 Lighthouse CI + bundle 大小监控的流水线
- 评估从 Webpack 迁移到 Vite 的可行性和收益

### 里程碑
- [ ] 能输出团队级构建最佳实践文档
- [ ] 能建立构建产物的自动化监控
- [ ] 能主导构建工具的选型和迁移决策

---

## 跨命题连接

| 关联命题 | 连接点 |
|----------|--------|
| P2-首屏白屏 | Code Splitting 减少 initial bundle 体积，preload 加速首屏资源 |
| P4-Core Web Vitals | Tree Shaking 减少 JS 解析时间，影响 LCP/TBT |
| P5-缓存策略 | contenthash 长期缓存 + CDN 部署策略 |
| P8-长任务拆分 | 按需加载避免首屏解析大量 JS 导致长任务 |
