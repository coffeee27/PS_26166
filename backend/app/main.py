import asyncio
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from app.registration import samples
from app.registration.service import analyze_pair

BACKEND = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024
# A 2000 x 2000 registration peaks near 400 MB, so small servers (512 MB) run one job at a time.
REGISTRATION_SLOTS = asyncio.Semaphore(int(os.environ.get("MAX_CONCURRENT_JOBS", "1")))

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


def _new_job() -> tuple[str, Path]:
    job_id = uuid.uuid4().hex
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True)
    return job_id, job_dir


async def _run_job(job_id, job_dir, reference_path, source_path, reference_name, source_name, reference_gsd=None, source_gsd=None):
    try:
        async with REGISTRATION_SLOTS:
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
        "source_filename": source_name,
        "reference_filename": reference_name,
        "result": result,
    }


@app.post("/api/registration/analyze")
async def analyze_images(
    source: UploadFile = File(...),
    reference: UploadFile = File(...),
    source_gsd: float | None = Form(None, gt=0, description="Source ground sample distance, metres/pixel"),
    reference_gsd: float | None = Form(None, gt=0, description="Reference ground sample distance, metres/pixel"),
):
    job_id, job_dir = _new_job()
    try:
        source_path = await _save_upload(source, job_dir, "source")
        reference_path = await _save_upload(reference, job_dir, "reference")
    except ValueError as error:
        return _error(400, str(error))

    return await _run_job(
        job_id, job_dir, reference_path, source_path, reference.filename, source.filename, reference_gsd, source_gsd
    )


@app.get("/api/samples")
async def list_samples():
    """Real image pairs present on this machine, with browser previews."""
    available = [sample for sample in samples.SAMPLES if samples.is_available(sample, DATA_DIR)]
    described = [await run_in_threadpool(samples.describe, sample, DATA_DIR, "/data") for sample in available]
    return {"samples": described}


@app.post("/api/registration/analyze-sample")
async def analyze_sample(sample_id: str = Form(...)):
    sample = samples.get_sample(sample_id)
    if sample is None or not samples.is_available(sample, DATA_DIR):
        return _error(404, f"Sample '{sample_id}' is not available on this server")

    job_id, job_dir = _new_job()
    return await _run_job(
        job_id,
        job_dir,
        DATA_DIR / sample.reference,
        DATA_DIR / sample.source,
        Path(sample.reference).name,
        Path(sample.source).name,
    )
