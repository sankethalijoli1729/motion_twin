from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "MotionTwin"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Real-Time Inertial Human Motion Digital Twin Backend"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./motiontwin.db")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Simulation & Stream
    DEFAULT_SIMULATION_HZ: int = 30
    BATCH_FLUSH_INTERVAL_SEC: float = 0.5
    BATCH_MAX_SIZE: int = 150
    
    # Stale sensor threshold (ms)
    SENSOR_STALE_THRESHOLD_MS: int = 2500
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
