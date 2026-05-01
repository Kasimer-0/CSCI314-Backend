# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 导入我们拆分好的各个业务模块
from routers import auth, admin, fundraiser, donee

app = FastAPI(title="CSIT314 Backend - Fully Refactored")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载所有的 Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(fundraiser.router)
app.include_router(donee.router)

@app.get("/")
def root():
    return {"message": "Backend System is running smoothly with Refactored Architecture!"}