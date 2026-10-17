from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db
import time

router = APIRouter()
start_time = time.time()

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "uptime_seconds": round(time.time() - start_time, 1),
        "version": "1.0.0",
        "service": "MotionTwin Ingestion & Visualization Gateway"
    }
