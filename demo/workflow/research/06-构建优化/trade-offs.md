# 构建优化：Trade-offs 分析

## 核心权衡总览

| 权衡维度 | 正向收益 | 代价 | 涉及素材 |
|----------|---------|------|----------|
| 模块格式 | ESM Tree Shaking 彻底消除死代码 | 放弃 CJS 生态兼容性 | A28 |
| 拆分粒度 | 细粒度 chunk 减少单次传输量 | HTTP 请求数增加，延迟叠加 | A10 |
| 副作用标记 | `sideEffects: false` 跳过整模块分析 | 误标导致运行时缺失 | A11 |
| 缓存策略 | runtimeChunk 分离提升缓存命中率 | 额外 HTTP 请求 + 运行时胶水代码 | A29 |
| 工具选型 | Webpack 生态成熟、插件丰富 | 构建速度慢、配置复杂度高 | W1 |
| 转译引擎 | esbuild 构建速度极快（10-100x） | 不支持完整 TS 类型检查、某些高级转译缺失 | VI1 |
| 架构模式 | Module Federation 运行时共享、独立部署 | 运行时复杂度高、版本协调成本大 | W2 |

---

## 四种构建方案对比

### 方案一：Webpack 全量优化

**适用场景**：大型存量项目、强依赖 Webpack 生态插件、需要极致产物控制

**核心策略**：
- `splitChunks` 配合 `sideEffects` / `usedExports` 做 Tree Shaking
- Terser 多线程压缩 + CSS Nano
- runtimeChunk 分离 + contenthash 长缓存
- `sideEffects` 标记跳过无副作用模块（A11），`usedExports` 做更细粒度的导出级裁剪

**权衡分析**：

| 维度 | 收益 | 代价 |
|------|------|------|
| 产物体积 | Tree Shaking + 压缩 + 细粒度拆分，体积可控 | 配置调优成本高，错误配置反而膨胀 |
| 加载速度 | 长缓存命中后二次加载极快 | 首次构建慢（30s+），HMR 慢（A28、W1） |
| 生态兼容 | 几乎所有 npm 包开箱可用 | CJS 依赖难 Tree Shaking（A28 负向） |
| 缓存策略 | runtimeChunk 分离 → 应用代码变更不破坏 vendor 缓存（A29） | runtime chunk 额外请求 + 胶水代码增加 |

**关键决策点**：
- `sideEffects` vs `usedExports`：前者粗粒度跳过整个模块，后者精确到导出级别但分析开销更大。推荐组合使用：`sideEffects` 做第一层过滤，`usedExports` 做第二层精裁（A11）
- `minSize` / `maxSize` 阈值调优：太小导致请求爆炸，太大失去拆分意义（A10）

---

### 方案二：Vite + Rollup 生产构建

**适用场景**：新项目、追求开发体验、ESM 优先的技术栈

**核心策略**：
- 开发阶段：原生 ESM + esbuild 预构建依赖，HMR 毫秒级（VI1）
- 生产阶段：Rollup 打包，天然 ESM Tree Shaking（A28 正向）
- `build.rollupOptions.output.manualChunks` 控制拆分

**权衡分析**：

| 维度 | 收益 | 代价 |
|------|------|------|
| 开发速度 | esbuild 预构建 + 原生 ESM，启动 <1s（VI1） | esbuild 不做类型检查，需额外 `tsc --noEmit` |
| 产物质量 | Rollup 的 ESM Tree Shaking 能力强于 Webpack（A28） | 某些 CJS-only 库需要 `@rollup/plugin-commonjs`，Tree Shaking 失效 |
| 配置复杂度 | 约定优于配置，开箱即用 | 自定义拆分策略不如 Webpack 灵活 |
| 生态成熟度 | 核心场景覆盖完善 | 部分 Webpack loader/plugin 无直接替代（W1 负向） |

**关键决策点**：
- esbuild 速度 vs 功能完整性（VI1）：开发阶段用 esbuild 快速转译，生产阶段用 Rollup 确保产物质量，本质是「速度换功能」的分层策略
- `manualChunks` 策略：按包名拆分 vendor 还是按路由拆分 page-level chunk？前者缓存稳定但首次加载可能拉入不需要的代码，后者按需加载但缓存命中率下降（A10）

---

### 方案三：Module Federation 微前端

**适用场景**：多团队协作、独立部署、运行时共享依赖

**核心策略**：
- host 应用暴露共享作用域（React、Vue 等大依赖）
- remote 应用按需加载，运行时解析共享模块
- `shared` 配置控制版本协商策略（singleton / eager / version）

**权衡分析**：

| 维度 | 收益 | 代价 |
|------|------|------|
| 部署独立性 | 各 remote 独立构建、独立部署，互不影响 | 共享依赖版本冲突 → 运行时崩溃 |
| 依赖共享 | 避免重复加载 React/Lodash 等大库 | `shared` 配置复杂，版本协商失败导致多实例（W2 负向） |
| 产物体积 | 理论上全局最优：每个应用只加载增量代码 | 实际：shared 模块的 chunk 命名和缓存策略极难优化（A29 与 A10 冲突） |
| 开发复杂度 | 统一技术栈后体验尚可 | 跨应用类型共享、类型安全、错误边界都是额外工程（W2） |

**关键决策点**：
- 独立部署 vs 缓存命中率（A29）：remote 应用每次部署生成新 hash，host 的 remoteEntry 缓存失效。runtimeChunk 分离在 MF 场景下意义有限，因为 runtime 本身就承载了联邦逻辑
- 共享策略选择：`singleton: true` 避免多实例但强制版本对齐，`eager: true` 预加载但牺牲按需性。没有银弹，需根据团队版本管理能力选择（W2）

---

### 方案四：Monorepo 构建

**适用场景**：组件库、工具库、多包管理、代码复用

**核心策略**：
- Turborepo / Nx 做增量构建和任务编排
- 包间依赖用 `workspace:*` 协议
- 每个包独立 `package.json` + 构建配置，产物独立发布

**权衡分析**：

| 维度 | 收益 | 代价 |
|------|------|------|
| 代码复用 | 包间直接引用源码，改动即时可见 | 构建依赖图复杂，一个包变更可能触发级联重建 |
| 产物体积 | 消除重复依赖（hoist），包间共享公共模块 | 依赖提升可能导致幽灵依赖（phantom dependencies） |
| 构建速度 | Turborepo 远程缓存 + 增量构建，CI 极快 | 初始配置和缓存策略调优成本高 |
| 发布灵活性 | 每个包独立版本、独立发布 | 版本协调矩阵随包数量指数增长 |

**关键决策点**：
- ESM vs CJS 产物格式选择（A28）：Monorepo 包作为库发布时，ESM 现代格式 Tree Shaking 更好，但下游消费者可能仍需 CJS。双格式发布（`exports` 字段）增加构建复杂度
- 依赖提升粒度：提升到根 `node_modules` 减少重复安装，但引入幽灵依赖风险。Turborepo 的 `globalDependencies` 可部分缓解但不能根治（A10 的「传输量 vs 请求数」在此变为「磁盘空间 vs 安全性」）

---

## 方案选型决策矩阵

| 评估维度 | Webpack 全量优化 | Vite + Rollup | Module Federation | Monorepo 构建 |
|----------|:---:|:---:|:---:|:---:|
| 首次构建速度 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 二次构建/增量 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 产物体积优化 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 缓存命中率 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 生态成熟度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| 配置复杂度（低=好） | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 独立部署能力 | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 适用规模 | 大型单体 | 中小型 → 中大型 | 多团队大型 | 多包库/平台型 |

## 一句话总结

- **存量大项目要稳妥** → Webpack 全量优化，用成熟生态兜底
- **新项目要体验** → Vite + Rollup，开发速度和产物质量的最优平衡
- **多团队要自治** → Module Federation，接受复杂度换取独立性
- **多包要复用** → Monorepo 构建，用工程化手段消灭重复

所有方案都不是非此即异——Vite 生产可以用 Rollup，Monorepo 内部可以用 Vite，Module Federation 可以部署在任何构建工具之上。核心是理解每个 trade-off 的本质，然后根据团队能力和项目约束做选择。
