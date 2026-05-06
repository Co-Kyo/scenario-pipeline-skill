# P8 长任务拆分 — 实验：长任务检测 + Worker 卸载验证

## 实验目标

1. 通过 Long Tasks API 检测主线程阻塞任务
2. 将阻塞任务卸载到 Web Worker，验证主线程恢复流畅
3. 对比拆分前后 INP 指标变化

## 实验架构

```
index.html
├── 主线程：UI 交互 + Long Task 检测 + 指标展示
├── worker.js：计算密集型任务（斐波那契/排序/数据处理）
└── 三种模式切换：
    ├── 模式1：主线程阻塞（长任务）
    ├── 模式2：主线程分片（rIC/scheduler.yield）
    └── 模式3：Worker 卸载
```

## 如何运行

1. 在 `src/` 目录下启动本地服务器（需要 Worker 跨域支持）
2. 用 Chrome 打开 `index.html`
3. 点击不同模式按钮，观察 Performance 面板和页面指标

```bash
# 使用 npx 启动
npx serve src/

# 或使用 Python
cd src && python3 -m http.server 8080
```

## 预期结果

| 模式 | Long Task 数量 | INP | 页面响应 |
|------|---------------|-----|----------|
| 阻塞模式 | 多个 >50ms | 差 (>200ms) | 点击无响应 |
| 分片模式 | 少量 <10ms | 好 (<100ms) | 基本流畅 |
| Worker 模式 | 0 | 优 (<50ms) | 完全流畅 |
