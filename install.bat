@echo off
setlocal enabledelayedexpansion

echo === Scenario Pipeline MCP Server 安装 ===

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未找到 Node.js
    echo 请安装 Node.js 18 或更高版本：https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_VERSION=%%a"
set "NODE_VERSION=%NODE_VERSION:v=%"
if %NODE_VERSION% lss 18 (
    echo 错误：Node.js 版本过低
    echo 请安装 Node.js 18 或更高版本
    pause
    exit /b 1
)

echo Node.js 版本：
node -v

REM 检查 mcp-server 目录
if not exist "mcp-server" (
    echo 错误：未找到 mcp-server 目录
    echo 请确保已正确克隆仓库（包含 submodule）
    echo.
    echo 如果使用 git clone，请添加 --recurse-submodules 参数：
    echo   git clone --recurse-submodules ^<仓库地址^>
    echo.
    echo 如果已克隆但未初始化 submodule，请运行：
    echo   git submodule update --init --recursive
    pause
    exit /b 1
)

REM 构建 MCP 服务器
echo.
echo 正在构建 MCP 服务器...
cd mcp-server

REM 安装依赖
echo 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误：安装依赖失败
    pause
    exit /b 1
)

REM 构建
echo 构建...
call npm run build
if %errorlevel% neq 0 (
    echo 错误：构建失败
    pause
    exit /b 1
)

echo.
echo 构建完成！

REM 获取绝对路径
set "MCP_SERVER_PATH=%CD%\dist\index.js"
echo MCP 服务器路径：%MCP_SERVER_PATH%

REM 检查 OpenClaw 配置
set "OPENCLAW_CONFIG=%USERPROFILE%\.openclaw\openclaw.json"
echo.
echo === OpenClaw 配置 ===
echo 请在 OpenClaw 配置文件中添加以下内容：
echo.
echo 配置文件路径：%OPENCLAW_CONFIG%
echo.
echo 添加内容：
echo {
echo   "tools": {
echo     "mcp": [
echo       {
echo         "type": "stdio",
echo         "command": "node",
echo         "args": ["%MCP_SERVER_PATH%"]
echo       }
echo     ]
echo   }
echo }
echo.

REM 检查是否已配置
if exist "%OPENCLAW_CONFIG%" (
    findstr /C:"scenario-pipeline" "%OPENCLAW_CONFIG%" >nul
    if %errorlevel% equ 0 (
        echo 检测到 OpenClaw 已配置 scenario-pipeline MCP
        echo 如果需要更新配置，请手动编辑 %OPENCLAW_CONFIG%
    ) else (
        echo 提示：OpenClaw 配置文件已存在，请手动添加上述配置
    )
) else (
    echo 提示：OpenClaw 配置文件不存在，请创建后添加上述配置
)

echo.
echo === 安装完成 ===
echo.
echo 下一步：
echo 1. 配置 OpenClaw（见上方说明）
echo 2. 重启 OpenClaw Gateway：openclaw gateway restart
echo 3. 验证安装：在 OpenClaw 中输入 'ping' 测试连接
echo.
pause
