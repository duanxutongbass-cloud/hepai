#!/bin/bash
# --- Nocturne Sync 自动更新脚本 ---

# 1. 进入项目目录
cd /volume1/docker/nocturne-sync

# 2. 从 GitHub 拉取最新代码
# 注意：如果您使用私有仓库，建议配置 SSH Key
git pull origin main

# 3. 彻底重启并重新构建镜像
docker-compose down
docker-compose up -d --build

echo "🚀 应用已根据最新代码完成自动重构！"
