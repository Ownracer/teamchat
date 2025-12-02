from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import Dict, List
import os
from .routes import router
from .websocket import router as websocket_router
from .database import engine, Base
from .upload import router as upload_router, UPLOAD_DIR 
from .message import router as message_router

# Import websockets to ensure it's available
try:
    import websockets
    print(f"[OK] websockets {websockets.__version__} is available")
except ImportError:
    print("[WARN] websockets not found - WebSocket features will not work")

# Create database tables
Base.metadata.create_all(bind=engine)
PRODUCTION_ORIGIN = os.environ.get("CORS_ORIGINS", "")

# 2. Define local origins
LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173", # Good to include 127.0.0.1 as a fallback
]

# 3. Combine both lists, ensuring the production origin is included
#    Filtering removes any empty strings if the variable wasn't set.
ALLOWED_HOSTS = [host for host in (LOCAL_ORIGINS + [PRODUCTION_ORIGIN]) if host] 

app = FastAPI()

app = FastAPI(title="TeamChat API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============ FILE UPLOAD SETUP ============

# Set up uploads directory
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

print(f"✅ Uploads directory: {UPLOAD_DIR}")
print(f"✅ Files served at: http://localhost:8000/uploads/")

# ============ INCLUDE ROUTERS ============

# Main API router
app.include_router(router, prefix="/api/v1", tags=["main"])

# Optional extra routers (if you are using them separately)
app.include_router(upload_router, prefix="/api", tags=["upload"])
app.include_router(message_router, prefix="/api", tags=["messages"])

# WebSocket router
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])

# Store active WebSocket connections
active_connections: Dict[str, List[WebSocket]] = {}

# ============ HEALTH CHECK ROUTES ============


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "TeamChat API",
        "version": "2.0.0",
        "status": "running",
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "uploads": str(UPLOAD_DIR),
    }


@app.get("/ws/test")
def websocket_test():
    """Test WebSocket configuration."""
    return {
        "message": "WebSocket routes are registered",
        "path": "/ws/channel/{channel_id}",
        "status": "available",
    }


# ============ LOG REGISTERED ROUTES ============

print("\n=== Registered Routes ===")
for route in app.routes:
    if hasattr(route, "path"):
        methods = getattr(route, "methods", ["WEBSOCKET"])
        method = list(methods)[0] if methods else "GET"
        print(f"  {method:<10} {route.path}")
print("=========================\n")

print("[OK] TeamChat API started successfully!")
print(f"[OK] Uploads directory: {UPLOAD_DIR}")
print(f"[OK] File uploads available at: http://localhost:8000/uploads/")
print(f"[OK] API documentation: http://localhost:8000/docs")
