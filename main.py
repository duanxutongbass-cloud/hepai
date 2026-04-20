# -*- coding: utf-8 -*-
import os
import aiomysql
import asyncio
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

dotenv.load_dotenv()

# --- 配置加载 (环境变量) ---
DB_HOST = os.getenv("DB_HOST", "192.168.31.250")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "nocturne_sync")
UPLOAD_DIR = "uploads"
SECRET_KEY = os.getenv("JWT_SECRET", "nocturne_reader_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动逻辑 ---
    global db_pool
    print(f"📡 正在尝试连接数据库服务器: {DB_HOST}:{DB_PORT} (用户: {DB_USER})")
    
    # 第一步：尝试连接到 MySQL/MariaDB 服务（确保库存在）
    try:
        temp_conn = await aiomysql.connect(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            autocommit=True, charset='utf8mb4'
        )
        async with temp_conn.cursor() as cur:
            print(f"✨ 成功接入数据库服务器，正在建立/确认数据库 '{DB_NAME}'...")
            await cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        temp_conn.close()
    except Exception as e:
        print(f"❌ 预连接尝试失败: {e}")
        if 'latin-1' in str(e):
            print("🚨 检测到编码错误！原因：您的数据库密码中包含中文感叹号或符号。请查看 DEPLOY_GUIDE.md 修正！")
        print("💡 建议检查: 1. DB_HOST 是否为 NAS 的真实 IP; 2. 数据库是否开启了远程 root 访问")

    # 第二步：初始化正式连接池
    try:
        db_pool = await aiomysql.create_pool(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            db=DB_NAME, autocommit=True,
            charset='utf8mb4'
        )
        print("✅ 异步连接池就绪，正在同步表结构...")
        await init_db()
    except Exception as e:
        print(f"❌ 最终连接池初始化失败: {e}")
    
    yield
    
    # --- 关闭逻辑 ---
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
        print("🛑 数据库连接已安全关闭")

app = FastAPI(title="Nocturne Sync API (FastAPI Edition)", lifespan=lifespan)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def init_db():
    """初始化数据库表结构，确保与 Node.js 后端完全一致"""
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            # 创建用户表
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
            # 创建乐谱表 (同步字段名)
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
            # 创建元数据表 (支持用户隔离)
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
            print("🚀 FastAPI 数据库表结构同步完成")


# --- 工具函数：Auth ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- 认证中间件 ---
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未授权")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token 无效")

# --- 业务逻辑：认证 ---
class LoginItem(BaseModel):
    email: str
    password: str

class RegisterItem(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

@app.post("/api/auth/login")
async def login(item: LoginItem):
    if not db_pool:
        raise HTTPException(status_code=503, detail="服务器数据库尚未连接，请检查环境配置")
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            try:
                await cur.execute("SELECT * FROM users WHERE email = %s", (item.email,))
                user = await cur.fetchone()
                if not user or not pwd_context.verify(item.password, user['password']):
                    raise HTTPException(status_code=401, detail="邮箱或密码错误")
                
                token = create_access_token({"sub": user['email'], "id": user['id']})
                return {
                    "token": token, 
                    "user": {"id": user['id'], "email": user['email'], "name": user['name'], "role": user['role']}
                }
            except Exception as e:
                print(f"Login DB error: {e}")
                raise HTTPException(status_code=500, detail="登录查询数据库出错")

@app.post("/api/auth/register")
async def register(item: RegisterItem):
    if not db_pool:
        raise HTTPException(status_code=503, detail="服务器数据库尚未连接，请确认 DEPLOY_GUIDE.md 中的配置")
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                # 尝试哈希密码 (某些环境 bcrypt 库可能有版本冲突，在这里捕获)
                hashed = pwd_context.hash(item.password)
                
                await cur.execute(
                    "INSERT INTO users (email, password, name) VALUES (%s, %s, %s)",
                    (item.email, hashed, item.name)
                )
                return {"status": "success"}
            except Exception as e:
                err_str = str(e)
                print(f"Register precise error: {err_str}")
                if "Duplicate entry" in err_str:
                    raise HTTPException(status_code=400, detail="该邮箱已被注册")
                if "bcrypt" in err_str or "__about__" in err_str:
                    raise HTTPException(status_code=500, detail=f"后端加密驱动异常，请重新构建容器: {err_str}")
                raise HTTPException(status_code=500, detail=f"数据库操作失败: {err_str}")

# --- 业务逻辑：乐谱管理 ---
@app.get("/api/scores")
async def list_scores():
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM scores ORDER BY created_at DESC")
            return await cur.fetchall()

@app.post("/api/scores")
async def upload_score(title: str = Form(...), category: str = Form(""), file: UploadFile = File(...)):
    file_path = f"uploads/{file.filename}"
    abs_path = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(abs_path, "wb") as buffer:
        buffer.write(await file.read())
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO scores (title, file_path, category) VALUES (%s, %s, %s)",
                (title, file_path, category)
            )
            # 返回新创建的对象或状态
            return {"status": "success", "file_path": file_path, "title": title}

# --- 业务逻辑：元数据 ---
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
            # 存储为 JSON 字符串
            val_str = str(value)
            await cur.execute(
                """INSERT INTO app_metadata (user_id, meta_key, meta_value) 
                   VALUES (%s, %s, %s) 
                   ON DUPLICATE KEY UPDATE meta_value = %s""",
                (user_id, key, val_str, val_str)
            )
            return {"status": "success"}

# --- 静态文件与资源服务 ---
@app.get("/api/health")
async def health():
    return {"status": "ok", "engine": "FastAPI", "db": "connected" if db_pool else "disconnected"}

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

# 挂载上传目录
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

dist_path = os.path.join(os.getcwd(), "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads"):
            return None
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    async def root_fallback():
        return {"message": "前端未构建，请运行 npm run build"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
