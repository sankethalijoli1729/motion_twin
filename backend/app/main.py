from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base
from app.database.seed import seed_demo_data_if_needed
from app.api.routes_health import router as health_router
from app.api.routes_devices import router as devices_router
from app.api.routes_sessions import router as sessions_router
from app.api.routes_diagnostics import router as diagnostics_router
from app.websocket.router import router as ws_router
from app.services.simulation import simulation_engine
from app.services.session_manager import session_manager
from app.database.session import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables created
    Base.metadata.create_all(bind=engine)
    # Seed sample sessions if clean db
    seed_demo_data_if_needed()
    # Start simulation engine automatically so telemetry is immediate
    simulation_engine.start()
    yield
    # Shutdown: Stop simulation and flush any remaining buffer
    simulation_engine.stop()
    db = SessionLocal()
    try:
        await session_manager.stop_session(db)
    finally:
        db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routes
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(devices_router, prefix="/api", tags=["devices"])
app.include_router(sessions_router, prefix="/api", tags=["sessions"])
app.include_router(diagnostics_router, prefix="/api", tags=["diagnostics"])
app.include_router(ws_router, tags=["websockets"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
