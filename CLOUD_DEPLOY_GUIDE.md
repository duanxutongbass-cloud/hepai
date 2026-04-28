# 🚀 阿里云 (Alibaba Cloud Linux 3) 后端自动化部署指南

针对您的操作系统 **Alibaba Cloud Linux 3.2104 LTS**，公网 IP **182.92.97.3**，域名 **dxtbass.top**。

## 第一步：环境初始化 (SSH 登录)
```bash
ssh root@182.92.97.3
```

### 1. 安装 Docker
Alibaba Cloud Linux 3 自带了经过优化的容器源：
```bash
# 安装 Docker
dnf install -y docker-ce docker-ce-cli containerd.io

# 启动并设置开机自启
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
1. 在 `/root/nocturne-sync` 目录下放置解压后的项目代码。
2. 运行：
```bash
cd /root/nocturne-sync
docker-compose up -d
```
> **注意**：由于您的 `docker-compose.yaml` 已配置好 MySQL，启动后数据库也会自动上线。

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
您需要在阿里云控制台申请免费 SSL 证书，并上传至服务器。
配置示例 (`/etc/nginx/conf.d/nocturne.conf`):
```nginx
server {
    listen 443 ssl;
    server_name dxtbass.top;

    # 请将阿里云下载的证书上传至此路径
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

