#!/usr/bin/env bash
# 本地开发：把三个框架包软链到本仓 node_modules（npm install 会覆盖，装完重跑本脚本）。
set -euo pipefail
cd "$(dirname "$0")/.."
for p in skillnomad skillnomad-common skillnomad-types; do
    rm -rf "node_modules/$p"
    ln -s "../../skillnomad/packages/$p" "node_modules/$p"
done
echo "已软链：skillnomad / -common / -types → ../../skillnomad/packages/*"
