from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pathlib import Path
import uuid
import shutil

from .auth import get_current_user
from .models import User

router = APIRouter()

# ======== SINGLE canonical uploads folder ========
# This file is backend/app/upload.py
# parent = app, parent.parent = backend
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
print(f"[upload.py] UPLOAD_DIR = {UPLOAD_DIR}")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a file and return:
      - file_url: /uploads/<uuid>.<ext>
      - file_name: original filename
      - file_size: size in bytes
    """
    try:
        # Validate size using file.file (same as your old code)
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size = 10000000 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size must be less than 50MB",
            )

        # Generate stored name with same extension
        file_ext = Path(file.filename).suffix
        stored_name = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / stored_name

        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_url = f"/uploads/{stored_name}"

        print(f"✅ Upload: {file.filename} -> {file_path}")

        return {
            "file_url": file_url,        # used in Message.file_url
            "file_name": file.filename,  # original name (for display / download)
            "file_size": file_size,
        }

    except HTTPException:
        # re-raise so FastAPI returns correct status
        raise
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")
