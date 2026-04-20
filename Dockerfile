# --- 阶段 1: 构建前端 ---
FROM node:20-bookworm AS frontend-builder
WORKDIR /app
COPY package*.json ./
# 使用淘宝镜像加速并忽略 peer 依赖冲突
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps
COPY . .
RUN npm run build

# --- 阶段 2: 运行环境 ---
FROM node:20-bookworm
WORKDIR /app

# 安装 Python 环境
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖项
COPY requirements.txt ./
# 使用清华镜像加速安装 Python 依赖
RUN pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt --break-system-packages

# 从构建阶段复制前端产物
COPY --from=frontend-builder /app/dist ./dist
# 复制后端代码
COPY main.py .env* ./

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 3000

# 启动 (FastAPI 会提供 dist 目录的服务)
CMD ["python3", "main.py"]
