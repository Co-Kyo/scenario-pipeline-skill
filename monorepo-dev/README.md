# skillpack

LLM 可执行 Markdown Skill 管线的打包工具。

## 结构

```
monorepo-dev/
├── packages/              # skillpack 框架库
│   ├── skillpack-types/   #   类型系统 + agent/batch/mapWork 构建函数
│   ├── skillpack-common/  #   校验、拓扑排序、图遍历
│   ├── skillpack-build/   #   打包器：buildPipeline → SKILL.md + processes/
│   └── skillpack-validate/#   管线完整性校验 CLI
├── demos/                 # 开发模拟台
│   ├── skillpack.config.ts 配置（declareConfig → skill: './skill.ts'）
│   ├── skill.ts            前端技术调研 skill 定义
│   ├── package.json
│   └── tsconfig.json
├── dist/                  # 构建产物（gitignored）
│   ├── SKILL.md
│   └── processes/
├── docs/                  # 文档
│   └── skillpack-build-flow.svg
```

## 使用

```bash
# 构建框架库
npm run build

# 类型检查
npm run typecheck

# 运行 demo（打包 demo skill）
npm run demo

# 清理构建产物
npm run clean
```

## 快速体验

```bash
npm run build   # 构建 skillpack 框架
npm run demo    # 打包 → dist/SKILL.md + processes/
```
