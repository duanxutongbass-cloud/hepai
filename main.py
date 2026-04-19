import os
import aiomysql
from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import dotenv

dotenv.load_dotenv()

app = FastAPI(title="Nocturne Sync API")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 外部化配置 (环境变量)
DB_HOST = os.getenv("DB_HOST", "192.168.31.250")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "nocturne_sync")
UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 异步数据库连接池
db_pool = None

@app.on_event("startup")
async def startup():
    global db_pool
    try:
        db_pool = await aiomysql.create_pool(
            host=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASSWORD,
            db=DB_NAME, autocommit=True
        )
        print("✅ 异步 MariaDB 连接池初始化成功")
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()

# --- 业务逻辑：乐谱管理 ---

@app.get("/api/scores")
async def list_scores():
    async with db_pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM scores ORDER BY createdAt DESC")
            return await cur.fetchall()

@app.post("/api/scores")
async def upload_score(title: str, file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    async with db_pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO scores (title, path) VALUES (%s, %s)",
                (title, file_path)
            )
            return {"status": "success", "path": file_path}

# --- 静态文件处理 (打包后使用) ---
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads"):
            return None
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    # 为了兼容 AI Studio 预览，内部端口保持 3000
    uvicorn.run(app, host="0.0.0.0", port=3000)
