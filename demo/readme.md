# Demo: 前端性能场景面试题管线演示

> 本目录是 Scenario Pipeline Skill 的演示实验产物。

## 演示目标

使用 scenario-pipeline skill，对 **3-5 年前端 Web 开发经验**的候选人可能在面试场景中遇到的**性能优化类场景分析题**，执行完整的前处理和批量后处理流程。

## 演示输入

```
扫描：前端性能优化面试题 --year=L2
研究：--batch=pending
```

## 演示范围

覆盖典型的前端性能场景，包括但不限于：
- 长列表渲染与滚动性能
- 首屏加载与白屏优化
- 网络请求与资源加载策略
- 渲染管线与重排重绘治理

## 产物结构

```
demo/
├── readme.md              ← 本文件
└── workflow/research/     ← 管线产出
    ├── README.md          ← 总览导航
    ├── 01-xxx/            ← 命题研究
    ├── 02-xxx/
    ├── capabilities/      ← 原子能力知识库
    └── .meta/             ← 内部数据
```
