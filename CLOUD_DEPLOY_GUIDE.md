# 🚀 阿里云 (Alibaba Cloud Linux 3) 后端自动化部署指南

针对您的操作系统 **Alibaba Cloud Linux 3.2104 LTS**，公网 IP **182.92.97.3**，域名 **dxtbass.top**。
项目路径：`/root/heipai-main`

---

## 🛠️ 这里修改完后，如何同步到服务器？ (小白必看)

由于我们不能直接“一键推送”，您需要手动同步文件。因为您使用的是移动端同步，文件不多，建议：

1. **导出项目**：点击左侧侧边栏下方的 **“设置 (Settings)”** -> **“导出到 ZIP (Export to ZIP)”**。
2. **仅上传差异文件** (推荐)：如果您已经部署过，只需要替换以下几个我改动过的文件：
   - `/src/services/apiService.ts` (修改了服务器连接地址)
   - `/Dockerfile` (更换了阿里云 PyPI 镜像)
   - `/CLOUD_DEPLOY_GUIDE.md` (本说明档)
3. **上传方法**：
   - **WinSCP / FileZilla**: 图形化界面拖拽（最简单）。
   - **终端命令**: `scp -r ./dist root@182.92.97.3:/root/heipai-main`

---

## 第一步：环境初始化 (SSH 登录)
```bash
ssh root@182.92.97.3
```

### 1. 安装与优化 Docker
Alibaba Cloud Linux 3 已预装优化源，但我们需要配置 **镜像加速器** 来加速拉取 MySQL 等镜像：
```bash
# 安装 Docker
dnf install -y docker-ce docker-ce-cli containerd.io

# 配置阿里云 Docker 镜像加速 (极其重要，否则拉取缓慢)
mkdir -p /etc/docker
tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://mirrors.aliyun.com/docker-ce/"]
}
EOF

# 启动并设置开机自启
systemctl daemon-reload
systemctl start docker
systemctl enable docker
```

### 2. 安装 Docker Compose
```bash
# 下载二进制文件
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

---

## 第二步：代码部署与启动
1. 在 `/root/heipai-main` 目录下放置解压后的项目代码。
2. 运行：
```bash
cd /root/heipai-main
docker-compose up -d --build
```
> **注意**：`--build` 参数确保它使用我为您优化过的阿里云镜像源重新构建。

---

## 第三步：⚠️ 核心步骤：启用 HTTPS (解决“正在加载乐谱”拦截)
**非常重要**：App 目前在 HTTPS 环境下运行，如果后端是 HTTP，浏览器会直接拦截乐谱。

### 1. 安装 Nginx
```bash
dnf install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2. 配置 SSL (域名: dxtbass.top)
**当前状态：证书申请中**。证书下来后，将 `.pem` 和 `.key` 文件上传。
配置示例 (`/etc/nginx/conf.d/nocturne.conf`):
```nginx
server {
    listen 443 ssl;
    server_name dxtbass.top;

    # 请将阿里云下载的证书上传至此路径 (需先创建目录)
    ssl_certificate /etc/nginx/certs/dxtbass.top.pem;
    ssl_certificate_key /etc/nginx/certs/dxtbass.top.key;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 第四步：检查
1. **安全组**：确认阿里云安全组放行了 **443** 端口。
2. **连接**：App 的“服务器地址”设置为 `https://dxtbass.top`（我已在代码中为您设为默认）。

