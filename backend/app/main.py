import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from app.registration.service import analyze_pair

BACKEND = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024

app = FastAPI(
    title="Lunar Image Matching API",
    description="Backend for lunar image registration and matching",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


def _error(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"status": "error", "message": message})


async def _save_upload(upload: UploadFile, directory: Path, stem: str) -> Path:
    # The client's filename is only used for its extension, never as a path.
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type '{extension}'; use one of {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    content = await upload.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError("File is larger than 200 MB")
    path = directory / f"{stem}{extension}"
    path.write_bytes(content)
    return path


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Lunar Image Matching backend is running"
    }


@app.post("/api/registration/analyze")
async def analyze_images(
    source: UploadFile = File(...),
    reference: UploadFile = File(...),
    source_gsd: float | None = Form(None, gt=0, description="Source ground sample distance, metres/pixel"),
    reference_gsd: float | None = Form(None, gt=0, description="Reference ground sample distance, metres/pixel"),
):
    job_id = uuid.uuid4().hex
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True)

    try:
        source_path = await _save_upload(source, job_dir, "source")
        reference_path = await _save_upload(reference, job_dir, "reference")
    except ValueError as error:
        return _error(400, str(error))

    try:
        result = await run_in_threadpool(
            analyze_pair,
            reference_path,
            source_path,
            job_dir,
            f"/data/uploads/{job_id}",
            reference_gsd,
            source_gsd,
        )
    except ValueError as error:
        # Unreadable images, or too few matches / tie points to register the pair.
        return _error(422, str(error))
    except Exception as error:
        print("ERROR:", repr(error))
        return _error(500, "Registration failed")

    return {
        "status": "success",
        "job_id": job_id,
        "source_filename": source.filename,
        "reference_filename": reference.filename,
        "result": result,
    }
