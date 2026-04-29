# -*- coding: utf-8 -*-
import os
import aiomysql
import asyncio
import logging
from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import dotenv
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from contextlib import asynccontextmanager
import hashlib
import hmac
import time
from collections import defaultdict

# --- 登录限流配置 ---
LOGIN_ATTEMPTS = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCK_TIME = 300 # 5分钟内超过5次失败则锁定

# 加载 .env 环境变量文件
dotenv.load_dotenv()

# --- 日志配置 (输出到文件以便 NAS 调试) ---
log_file = "app_production.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("nocturne")

# --- 配置加载 (从环境变量中读取，如果没有则使用默认值) ---
DB_HOST = os.getenv("DB_HOST", "192.168.31.250")  # 数据库地址
DB_PORT = int(os.getenv("DB_PORT", 3306))         # 数据库端口
DB_USER = os.getenv("DB_USER", "root")            # 数据库用户名
DB_PASSWORD = os.getenv("DB_PASSWORD", "")        # 数据库密码
DB_NAME = os.getenv("DB_NAME", "nocturne_sync")   # 数据库名称

# 检查配置中是否存在可能的编码问题 (如中文标点)
def check_config_encoding():
    for name, val in [("DB_USER", DB_USER), ("DB_PASSWORD", DB_PASSWORD), ("DB_NAME", DB_NAME)]:
        try:
            val.encode('latin-1')
        except UnicodeEncodeError:
            logger.warning(f"⚠️ 警告: 环境变量 {name} 中包含非标准字符 (可能是中文标点)，这可能导致数据库连接失败。")

check_config_encoding()

UPLOAD_DIR = "uploads"                            # 乐谱 PDF 存放目录
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    logger.error("🛑 错误: 未配置 JWT_SECRET 环境变量！为了安全，系统拒绝启动。")
    # 如果是本地开发环境，提供一个显式的弱密钥提示，但在生产环境必须报错
    if os.getenv("NODE_ENV") != "production":
         SECRET_KEY = "dev_secret_only_for_local_test"
    else:
         raise RuntimeError("JWT_SECRET environment variable is missing")

ALGORITHM = "HS256"                               # 加密签名算法
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7        # 登录有效期：7天

# 确保上传目录存在
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# --- 核心安全函数 (手动实现 SHA256 加密，解决群晖 NAS 驱动兼容问题) ---

HASH_ITERATIONS = 310000

def hash_password(password: str):
    """【加密函数】将明文密码转换为 盐值+哈希 的形式"""
    salt = os.urandom(16) # 生成随机盐，防止彩虹表攻击
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, HASH_ITERATIONS)
    return salt.hex() + ":" + hash_obj.hex()

def verify_password(plain_password: str, hashed_password: str):
    """【验证函数】对比用户输入的密码和数据库中的加密结果"""
    try:
        salt_hex, hash_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt, HASH_ITERATIONS)
        return hmac.compare_digest(expected_hash.hex(), hash_hex)
    except:
        return False # 格式不正确或对比失败

db_pool = None # 数据库连接池占位符

@asynccontextmanager
async def lifespan(app: FastAPI):
    """【生命周期管理】在服务器启动时连接数据库，在关闭时断开"""
    global db_pool
    logger.info(f"📡 正在尝试连接数据库服务器: {DB_HOST}:{DB_PORT}")
    
    # 第一步：连接到 MySQL 控制台，确保数据库存在
    try:
        temp_conn = await aiomysql.connect(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            autocommit=True, charset='utf8mb4'
        )
        async with temp_conn.cursor() as cur:
            await cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4")
        temp_conn.close()
    except Exception as e:
        logger.error(f"❌ 数据库预连接失败: {e}")

    # 第二步：初始化异步连接池（提升高并发性能）
    try:
        db_pool = await aiomysql.create_pool(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            db=DB_NAME, autocommit=True, charset='utf8mb4'
        )
        await init_db() # 启动时同步表结构
        logger.info("✅ 数据库服务已就绪")
    except Exception as e:
        logger.error(f"❌ 连接池初始化失败: {e}")
    
    yield # 代码运行期间在此等待
    
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
        logger.info("🔌 数据库连接已断开")

app = FastAPI(title="合拍 (Nocturne Sync) 后端服务", lifespan=lifespan, version="1.3.0")

# --- 跨域策略 (允许前端与后端通讯) ---
allowed_origins = [
    "https://dxtbass.top",
    "https://www.dxtbass.top",
    "https://www.dxthepai.top",
    "https://dxthepai.top",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ais-pre-b56ecwsw35s26kpt6bsgul-194206035772.us-east5.run.app", # 允许 AI Studio 预览
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def init_db():
    """【数据库同步】如果表不存在则自动创建，并自动修复旧版数据库字段"""
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 1. 创建用户表
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'member',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 自动迁移：为旧版数据库补齐 role 字段
            try:
                await cur.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'member'")
                print("✨ 检查完毕：users 表结构已同步")
            except:
                pass 

            # 2. 创建乐谱主表
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS scores (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    composer VARCHAR(255),
                    category VARCHAR(100),
                    file_path VARCHAR(500) NOT NULL,
                    uploader_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
            
            # 3. 创建元数据表 (存储用户标记/标注)
            await cur.execute("""
                CREATE TABLE IF NOT EXISTS app_metadata (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    meta_key VARCHAR(100),
                    meta_value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (user_id, meta_key)
                )
            """)
            print("🚀 数据库初始化完成")


# --- 工具函数：生成 JWT Token ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- 认证中间件：验证 Token 是否合法 ---
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未授权，请重新登录")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="登录已过期")

# --- 数据模型定义 (用于校验前端传来的 JSON) ---
class LoginItem(BaseModel):
    email: str
    password: str

class RegisterItem(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

# --- 接口：用户登录 ---
@app.post("/api/auth/login")
async def login(item: LoginItem, request: Request):
    if not db_pool:
        raise HTTPException(status_code=503, detail="服务器数据库连接失败")
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            try:
                await cur.execute("SELECT * FROM users WHERE email = %s", (item.email,))
                user = await cur.fetchone()
                
                # 限流检查 (基于 IP)
                ip = request.client.host
                now = time.time()
                # 清理旧记录
                LOGIN_ATTEMPTS[ip] = [t for t in LOGIN_ATTEMPTS[ip] if now - t < LOCK_TIME]
                if len(LOGIN_ATTEMPTS[ip]) >= MAX_LOGIN_ATTEMPTS:
                    logger.warning(f"🚫 登录拦截: IP {ip} 尝试频率过高")
                    raise HTTPException(status_code=429, detail="登录尝试次数过多，请5分钟后再试")

                # 检查用户是否存在，并验证手动生成的哈希密码
                if not user or not verify_password(item.password, user.get('password')):
                    LOGIN_ATTEMPTS[ip].append(now)
                    raise HTTPException(status_code=401, detail="邮箱或密码错误")
                
                # 登录成功，清除该 IP 的失败记录
                if ip in LOGIN_ATTEMPTS:
                    del LOGIN_ATTEMPTS[ip]
                
                # 生成登录凭证
                token = create_access_token({"sub": user.get('email'), "id": user.get('id')})
                return {
                    "token": token, 
                    "user": {
                        "id": user.get('id'), 
                        "email": user.get('email'), 
                        "name": user.get('name'), 
                        "role": user.get('role', 'member')
                    }
                }
            except Exception as e:
                err_str = str(e)
                print(f"Login DB error: {err_str}")
                raise HTTPException(status_code=500, detail=f"数据库查询失败: {err_str}")

# --- 接口：用户注册 ---
@app.post("/api/auth/register")
async def register(item: RegisterItem):
    if not db_pool:
        raise HTTPException(status_code=503, detail="数据库未就绪")
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                # 使用手动 SHA256 加密保存密码
                hashed = hash_password(item.password)
                await cur.execute(
                    "INSERT INTO users (email, password, name) VALUES (%s, %s, %s)",
                    (item.email, hashed, item.name)
                )
                return {"status": "success"}
            except Exception as e:
                err_str = str(e)
                if "Duplicate entry" in err_str:
                    raise HTTPException(status_code=400, detail="该邮箱已被注册")
                raise HTTPException(status_code=500, detail=f"注册失败: {err_str}")

# --- 接口：获取乐谱列表 ---
@app.get("/api/scores")
async def list_scores():
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM scores ORDER BY created_at DESC")
            return await cur.fetchall()

# --- 接口：上传乐谱 ---
ALLOWED_EXTENSIONS = {".pdf"}

@app.post("/api/scores")
async def upload_score(title: str = Form(...), category: str = Form(""), file: UploadFile = File(...)):
    # 1. 验证文件后缀
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="只允许上传 PDF 格式的乐谱")
    
    # 2. 读取并保存文件 (无大小限制)
    content = await file.read()
    
    file_path = f"uploads/{file.filename}"
    abs_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # 将上传的文件保存到硬盘
    with open(abs_path, "wb") as buffer:
        buffer.write(content)
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO scores (title, file_path, category) VALUES (%s, %s, %s)",
                (title, file_path, category)
            )
            return {"status": "success", "file_path": file_path, "title": title}

# --- 接口：保存/获取自定义标注数据 ---
@app.get("/api/metadata/{key}")
async def get_meta(key: str, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT meta_value FROM app_metadata WHERE user_id = %s AND meta_key = %s", 
                (user_id, key)
            )
            row = await cur.fetchone()
            return row['meta_value'] if row else None

@app.post("/api/metadata")
async def save_meta(request_data: dict, user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    key = request_data.get("key")
    value = request_data.get("value")
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            val_str = str(value)
            await cur.execute(
                """INSERT INTO app_metadata (user_id, meta_key, meta_value) 
                   VALUES (%s, %s, %s) 
                   ON DUPLICATE KEY UPDATE meta_value = %s""",
                (user_id, key, val_str, val_str)
            )
            return {"status": "success"}

# --- 维护接口：健康检查 ---
@app.get("/api/db-test")
async def db_test():
    if not db_pool:
        raise HTTPException(status_code=503, detail="数据库未连接")
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                return {"status": "success", "message": "数据库可访问"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 静态资源托管 ---
# 1. 托管 uploads 文件夹中的乐谱 PDF
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

dist_path = os.path.join(os.getcwd(), "dist")
if os.path.exists(dist_path):
    # 2. 托管已经编译好的 React 前端代码
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    # 3. React 路由捕获：让前端控制页面跳转
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads"):
             raise HTTPException(status_code=404, detail="接口未找到")
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    async def root_fallback():
        return {"message": "前端未构建，请运行 npm run build"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
