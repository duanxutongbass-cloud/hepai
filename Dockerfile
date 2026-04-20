# --- 第一阶段: 构建前端 (Builder) ---
# 使用较轻量的 node 镜像
FROM node:20-slim AS builder

# 设置内存限制，防止在低内存 NAS 上构建失败
ENV NODE_OPTIONS="--max-old-space-size=1024"

WORKDIR /app

# 先安装构建工具 (slim 镜像缺少构建所需的某些工具)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 利用 Docker 缓存，先安装依赖
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps

# 复制源码并构建
COPY . .
RUN npm run build

# --- 第二阶段: 运行环境 (Runtime) ---
# 再次使用 Node 镜像是因为我们环境需要 python3 + node (或直接用 node 镜像里的 python)
FROM node:20-slim

WORKDIR /app

# 安装运行所需的组件 (只有 python)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖并安装
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt --break-system-packages

# 从 builder 阶段复制构建好的静态文件
COPY --from=builder /app/dist ./dist
# 复制后端主程序
COPY main.py ./
# 准备上传目录
RUN mkdir -p uploads

# 暴露后端端口
EXPOSE 3000

# 运行 FastAPI
CMD ["python3", "main.py"]
