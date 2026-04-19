# 🚀 Nocturne Sync 部署指南 (群晖 NAS 专用)

您的应用已经配置为全链路 4000 端口（外部访问 4000，内部运行 3000）。

## 1. 运行环境要求
- **Docker / Container Manager**
- **MariaDB 10** (已创建数据库 `nocturne_sync`)

## 2. 必须配置的环境变量
在部署时，请确保 `docker-compose.yaml` 或环境变量设置中包含以下内容：

| 变量名 | 说明 | 示例值 |
| :--- | :--- | :--- |
| **DB_HOST** | NAS 的内网 IP | `192.168.31.250` |
| **DB_PORT** | 数据库端口 | `3306` |
| **DB_USER** | 数据库用户名 | `root` |
| **DB_PASSWORD** | 数据库密码 | `您的密码` |
| **DB_NAME** | 数据库名 | `nocturne_sync` |
| **JWT_SECRET** | 登录安全密钥 | `随便填的一串长字符` |
| **GEMINI_API_KEY**| AI 功能密钥 | `从 ai.google.dev 获取` |

## 3. 部署步骤
1. 将所有文件上传至 NAS 文件夹（例如 `/docker/nocturne-sync`）。
2. 使用 Container Manager 打开 `docker-compose.yaml`。
3. 点击 **生成/项目启动**。
4. 访问地址：`http://[NAS_IP]:4000` 或您的自定义域名。

---
*提示：目前的 `docker-compose.yaml` 已经为您预填了大部分参数，您只需要根据实际情况微调密码即可。*
