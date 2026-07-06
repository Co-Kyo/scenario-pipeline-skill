# 管线参数配置

> 所有可调参数集中管理。process 文件引用 `{{pipeline-params}}` 读取本表，按参数名取值。

## 调度参数

| 参数名 | 值 | 说明 | 使用步骤 |
|--------|-----|------|---------|
| `w` | 5 | 并发上限（W） | 03/07/08/09 |
| `poll-interval` | 15s | 轮询间隔 | 01/03 |
| `retry-max` | 1 | 补发/重试次数上限 | 01/03/06/07/08/09 |

## 超时参数

| 参数名 | 值 | 说明 | 使用步骤 |
|--------|-----|------|---------|
| `dim-timeout` | 3min | 维度 Agent 超时 | 01 |
| `converge-timeout` | 5min | 收敛者 Agent 超时 | 01 |
| `search-timeout` | 5min | Phase A 搜索 Agent 超时 | 03 |
| `extract-timeout` | 10min | Phase B 提取 Agent 超时 | 03 |
| `research-timeout` | 15min | 能力研究 Agent 超时 | 06 |
| `briefing-timeout` | 5min | Briefing 组装 Agent 超时 | 07 |
| `assemble-timeout` | 8min | 命题组装 Agent 超时 | 08 |
| `ladder-timeout` | 5min | 学习阶梯 Agent 超时 | 09 |

## 业务参数

| 参数名 | 值 | 说明 | 使用步骤 |
|--------|-----|------|---------|
| `cap-group-cap` | 5 | 能力分组每组上限 | 06 |
| `min-content-length` | 2000 | 能力主文件最少字数 | 06 |
| `community-threshold` | 8 | 社区检测触发节点数 | 02 |
| `url-batch-size` | 30-50 | URL 分批每批条数 | 03 |
| `fanout-threshold` | 30% | 扇出度筛选阈值 | 06 |
