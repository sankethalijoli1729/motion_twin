from fastapi import APIRouter
from app.schemas.sensor import SimulatedMotionCommand
from app.websocket.connection_manager import connection_manager
from app.services.simulation import simulation_engine

router = APIRouter()

@router.get("/diagnostics")
def get_diagnostics():
    return connection_manager.get_diagnostics()

@router.post("/simulation/control")
def update_simulation_control(cmd: SimulatedMotionCommand):
    simulation_engine.set_pattern(cmd)
    connection_manager.add_log(
        "INFO",
        f"Simulation mode set to '{cmd.pattern}' (frequency: {simulation_engine.hz} Hz)."
    )
    return {
        "status": "success",
        "pattern": simulation_engine.pattern,
        "hz": simulation_engine.hz,
        "is_running": simulation_engine.is_running
    }

@router.post("/simulation/start")
def start_simulation():
    simulation_engine.start()
    return {"status": "started", "pattern": simulation_engine.pattern}

@router.post("/simulation/stop")
def stop_simulation():
    simulation_engine.stop()
    return {"status": "stopped"}

@router.post("/diagnostics/clear-logs")
def clear_logs():
    connection_manager.recent_logs = []
    return {"status": "cleared"}
