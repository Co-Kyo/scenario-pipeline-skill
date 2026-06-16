"""
Layer 3 语义验证的 fixtures
"""

import pytest


@pytest.fixture
def sample_capability_graph():
    """样本能力图谱数据"""
    return {
        "capabilities": [
            {
                "id": "A1",
                "name": "浏览器渲染管线",
                "layer": "浏览器层",
                "covers": ["RW-P1", "RW-P2"],
                "depends_on": []
            },
            {
                "id": "A2",
                "name": "事件循环与rAF调度",
                "layer": "运行时层",
                "covers": ["RW-P1", "RW-P3"],
                "depends_on": ["A1"]
            }
        ],
        "dependencies": {
            "A1": [],
            "A2": ["A1"]
        }
    }


@pytest.fixture
def sample_learning_ladder():
    """样本学习阶梯数据"""
    return """
# 学习阶梯：浏览器渲染管线

## 步骤 1：理解渲染流程

**做什么**：阅读浏览器渲染管线文档
**你会看到什么**：DOM → Layout → Paint → Composite 的流程图
**这说明了什么**：渲染是分阶段的，每阶段可独立优化
**接下来去哪**：步骤 2

验证标准：
- [ ] 能画出渲染流程图
- [ ] 能说出每个阶段的输入输出

失败指引：
- 如果画不出流程图 → 回到步骤 1 重新阅读
- 如果说不清输入输出 → 查看具体阶段的详细文档

## 步骤 2：实践性能优化

**做什么**：使用 Chrome DevTools 分析页面性能
**你会看到什么**：Performance 面板中的渲染时间线
**这说明了什么**：实际页面的渲染瓶颈在哪里
**接下来去哪**：步骤 3

验证标准：
- [ ] 能打开 Performance 面板
- [ ] 能识别出长任务和渲染瓶颈

失败指引：
- 如果不会使用 DevTools → 查看 DevTools 官方文档
- 如果识别不出瓶颈 → 对比正常页面的时间线
"""
