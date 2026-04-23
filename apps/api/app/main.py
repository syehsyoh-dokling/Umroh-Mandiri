from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.assistant import router as assistant_router
from app.routers.auth import router as auth_router
from app.routers.content import router as content_router
from app.routers.health import router as health_router
from app.routers.legacy_pricing import router as legacy_pricing_router
from app.routers.master_wilayah import router as master_wilayah_router
from app.routers.ticket_pricing import router as ticket_pricing_router
from app.routers.users import router as users_router
from app.routers.wilayah import router as wilayah_router

app = FastAPI(
    title="MUWAHID API",
    description="Core API for the Umroh platform, including a reusable Indonesian master wilayah service.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(assistant_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(content_router)
app.include_router(legacy_pricing_router)
app.include_router(ticket_pricing_router)
app.include_router(master_wilayah_router)
app.include_router(wilayah_router)


@app.get("/")
def read_root():
    return {"message": "API Umroh berjalan"}
