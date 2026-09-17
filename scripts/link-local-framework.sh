#!/usr/bin/env bash
# 本地开发：把框架包软链到本仓 node_modules（npm install 会覆盖，装完重跑本脚本）。
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf "node_modules/skillnomad"
ln -s "../../skillnomad" "node_modules/skillnomad"
echo "已软链：skillnomad → ../../skillnomad（单包单仓）"
