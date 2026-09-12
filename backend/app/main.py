import os
from fastapi import FastAPI, UploadFile, File
from PIL import Image
from io import BytesIO

app = FastAPI(
    title="Lunar Image Matching API",
    description="Backend for lunar image registration and matching",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Lunar Image Matching backend is running"
    }


@app.post("/api/registration/analyze")
async def analyze_images(
    source: UploadFile = File(...),
    reference: UploadFile = File(...)
):
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    source_path = os.path.join(upload_dir, source.filename)
    reference_path = os.path.join(upload_dir, reference.filename)

    with open(source_path, "wb") as file:
        file.write(await source.read())

    with open(reference_path, "wb") as file:
        file.write(await reference.read())
        
    # Validate that both uploaded files are images
    try:
        Image.open(source_path).verify()
        Image.open(reference_path).verify()
    except Exception:
        return {
            "status": "error",
            "message": "One or both uploaded files are not valid images"
        }

    return {
    "status": "success",
    "source_filename": source.filename,
    "reference_filename": reference.filename,
    "result": {
        "matches": [],
        "transformation": None,
        "metrics": {
            "rmse": None,
            "inlier_count": None,
            "inlier_ratio": None
        }
    }
}