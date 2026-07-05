# capability-research 产出格式

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
  "references": []
}
```
