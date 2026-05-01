from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the various business modules that have been split up
from routers import auth, admin, fundraiser, donee

app = FastAPI(title="CSIT314 Backend - Fully Refactored")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(fundraiser.router)
app.include_router(donee.router)

@app.get("/")
def root():
    return {"message": "Backend System is running smoothly with Refactored Architecture!"}
