#!/bin/bash
set -e

echo "=== Scenario Pipeline MCP Server 安装 ==="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "错误：未找到 Node.js"
    echo "请安装 Node.js 18 或更高版本：https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误：Node.js 版本过低（当前：$(node -v)）"
    echo "请安装 Node.js 18 或更高版本"
    exit 1
fi

echo "Node.js 版本：$(node -v)"

# 检查 mcp-server 目录
if [ ! -d "mcp-server" ]; then
    echo "错误：未找到 mcp-server 目录"
    echo "请确保已正确克隆仓库（包含 submodule）"
    echo ""
    echo "如果使用 git clone，请添加 --recurse-submodules 参数："
    echo "  git clone --recurse-submodules <仓库地址>"
    echo ""
    echo "如果已克隆但未初始化 submodule，请运行："
    echo "  git submodule update --init --recursive"
    exit 1
fi

# 构建 MCP 服务器
echo ""
echo "正在构建 MCP 服务器..."
cd mcp-server

# 安装依赖
echo "安装依赖..."
npm install

# 构建
echo "构建..."
npm run build

echo ""
echo "构建完成！"

# 获取绝对路径
MCP_SERVER_PATH="$(pwd)/dist/index.js"
echo "MCP 服务器路径：$MCP_SERVER_PATH"

# 检查 OpenClaw 配置
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"
echo ""
echo "=== OpenClaw 配置 ==="
echo "请在 OpenClaw 配置文件中添加以下内容："
echo ""
echo "配置文件路径：$OPENCLAW_CONFIG"
echo ""
echo "添加内容："
echo '{
  "tools": {
    "mcp": [
      {
        "type": "stdio",
        "command": "node",
        "args": ["'"$MCP_SERVER_PATH"'"]
      }
    ]
  }
}'
echo ""

# 检查是否已配置
if [ -f "$OPENCLAW_CONFIG" ]; then
    if grep -q "scenario-pipeline" "$OPENCLAW_CONFIG"; then
        echo "检测到 OpenClaw 已配置 scenario-pipeline MCP"
        echo "如果需要更新配置，请手动编辑 $OPENCLAW_CONFIG"
    else
        echo "提示：OpenClaw 配置文件已存在，请手动添加上述配置"
    fi
else
    echo "提示：OpenClaw 配置文件不存在，请创建后添加上述配置"
fi

echo ""
echo "=== 安装完成 ==="
echo ""
echo "下一步："
echo "1. 配置 OpenClaw（见上方说明）"
echo "2. 重启 OpenClaw Gateway：openclaw gateway restart"
echo "3. 验证安装：在 OpenClaw 中输入 'ping' 测试连接"
