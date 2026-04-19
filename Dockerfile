# 使用 Node.js 20 作为基础镜像，因为它包含了构建前端所需的工具
FROM node:20-bookworm

# 设置工作目录
WORKDIR /app

# 安装 Python 和必要的系统构建工具
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json 和 lock 文件 (如果有)
COPY package*.json ./

# 预安装前端依赖 (使用 --legacy-peer-deps 解决兼容性问题)
RUN npm install --legacy-peer-deps

# 复制后端依赖
COPY requirements.txt ./

# 预安装 Python 依赖
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 复制项目所有文件
COPY . .

# 执行前端构建
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令 (直接启动 FastAPI 后端)
CMD ["python3", "main.py"]
