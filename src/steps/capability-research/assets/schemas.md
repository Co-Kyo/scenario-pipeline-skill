# capability-research 产出格式

## 研究计划：`{workDir}/.meta/research-plan.json`

```json
{
  "generated_at": "ISO时间",
  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "materials": [
        {
          "material_id": "B1-M1",
          "file_path": "B1-M1-browser-render.md",
          "usage": "primary",
          "selection_reason": "该素材直接解释关键渲染路径"
        }
      ]
    }
  ],
  "coverage": {
    "ok_total": 66,
    "assigned_unique": 66,
    "optional_count": 5,
    "assigned_pct": 100
  }
}
```

约束：

- `usage` 只能是 `primary` / `supporting` / `optional`。
- 每个 `fetch_status=ok` 素材必须出现在至少一个能力下，不能静默丢弃。
- 无法按能力边界分配的素材必须标记 `optional` 并写 `selection_reason`。

## 主文件：`{workDir}/capabilities/{id}-{name}.md`

```markdown
# 浏览器渲染管线

> 从 HTML/CSS/JS 到像素上屏的完整渲染流程，包含关键渲染路径、重排重绘、合成层。

## 核心机制
（详细描述该能力的技术原理，≥500 字）

## 工程瓶颈
### 瓶颈 1：强制同步布局（Layout Thrashing）
- **触发条件**：在 JS 中交替读写布局属性（offsetTop → style.left → offsetTop）
- **表现症状**：帧率骤降至 10-20fps，DevTools Performance 面板可见大量紫色 Layout 块
- **解决方案**：读写分离、requestAnimationFrame 批量处理、FastDOM 库

## 调试工具
## 典型权衡
## 最小验证实验
## 参考资料
```

## 摘要：`{workDir}/.meta/summaries/{id}-{name}.json`

```json
{
  "id": "A1",
  "name": "浏览器渲染管线",
  "tech_layer": "浏览器层",
  "mechanism_summary": "浏览器将 HTML/CSS/JS 转化为像素的完整流水线",
  "bottlenecks": [],
  "tradeoffs": [],
  "experiment_code": null,
  "references": [],
  "material_usage": [
    {
      "material_id": "B1-M1",
      "file_path": "B1-M1-browser-render.md",
      "usage": "primary",
      "selection_reason": "该素材直接解释关键渲染路径"
    }
  ]
}
```

`material_usage` 必须与研究计划中该能力的 `materials` 一一对应，不能遗漏已分配的素材。
