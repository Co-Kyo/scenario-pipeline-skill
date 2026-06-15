---
description: "跨文件一致性检查。扫描指定模式在多个文件中的引用，报告不一致项。用于修复路径引用、步骤编号、术语统一等场景。"
---

# Consistency Check

## 用途

扫描代码库中指定模式的引用，找出不一致的地方。

## 使用方式

```
consistency-check <pattern> [file_pattern]
```

## 示例

```bash
# 检查旧路径引用
consistency-check "skills/scenario-pipeline" "*.md"

# 检查步骤编号
consistency-check "Step 0[0-9]" "processes/*.md"

# 检查术语一致性
consistency-check "workDir" "core/*.md"
```

## 执行步骤

### 1. 搜索模式

```bash
grep -rn "<pattern>" <file_pattern>
```

### 2. 分类结果

| 类型 | 说明 | 处理 |
|------|------|------|
| 正确引用 | 符合当前约定 | 保留 |
| 过时引用 | 旧约定，需更新 | 修复 |
| 错误引用 | 不应存在 | 删除 |

### 3. 生成报告

```markdown
## 一致性检查报告

### 搜索模式
`<pattern>`

### 结果统计
- 总计：N 处引用
- 正确：X 处
- 过时：Y 处
- 错误：Z 处

### 需要修复
| 文件 | 行号 | 当前内容 | 建议修改 |
|------|------|----------|----------|
| ... | ... | ... | ... |
```

### 4. 修复（可选）

如果用户确认，逐个修复过时/错误的引用。

## 输出

- 一致性检查报告
- 修复后的文件（如果执行修复）
