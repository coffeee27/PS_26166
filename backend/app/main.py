import os
from fastapi import FastAPI, UploadFile, File
from PIL import Image
from io import BytesIO
import cv2
import numpy as np

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
        
        source_image = cv2.imread(source_path)
        reference_image = cv2.imread(reference_path)
        
        if source_image is None or reference_image is None:
            return {
                "status": "error",
                "message": "Could not load one or both images with OpenCV"
            }
            
        print(source_image.shape)
        print(reference_image.shape)
        
        source_gray = cv2.cvtColor(source_image, cv2.COLOR_BGR2GRAY)
        reference_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)
        
        sift = cv2.SIFT_create()
        source_keypoints, source_descriptors = sift.detectAndCompute(source_gray, None)
        reference_keypoints, reference_descriptors = sift.detectAndCompute(reference_gray, None)
        
        bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=True)

        matches = bf.match(source_descriptors, reference_descriptors)
        matches = sorted(matches, key=lambda x: x.distance)
        good_matches = matches[:100]
        
        source_points = np.float32(
            [source_keypoints[m.queryIdx].pt for m in good_matches]
        ).reshape(-1, 1, 2)

        reference_points = np.float32(
            [reference_keypoints[m.trainIdx].pt for m in good_matches]
        ).reshape(-1, 1, 2)
        
        H, mask = cv2.findHomography(
            source_points,
            reference_points,
            cv2.RANSAC,
            5.0
        )
        
        if H is None or mask is None:
            return {
                "status": "error",
                "message": "Could not estimate transformation"
            }
            
        inlier_matches = [
            match for match, inlier in zip(good_matches, mask.ravel())
            if inlier
        ]
        
        inlier_count = len(inlier_matches)
        inlier_ratio = inlier_count / len(good_matches) if good_matches else 0
        
        inlier_mask = mask.ravel().astype(bool)

        src_inliers = source_points[inlier_mask]
        ref_inliers = reference_points[inlier_mask]

        projected = cv2.perspectiveTransform(src_inliers, H)

        rmse = float(
            np.sqrt(
                np.mean(
                    np.sum((projected - ref_inliers) ** 2, axis=2)
                )
            )
        )
        
        registered_image = cv2.warpPerspective(
            source_image,
            H,
            (reference_image.shape[1], reference_image.shape[0])
        )
        
        registered_path = os.path.join(upload_dir, "registered.jpg")

        cv2.imwrite(registered_path, registered_image)
        
    
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
        "matches": [
            {
                "source": source_keypoints[m.queryIdx].pt,
                "reference": reference_keypoints[m.trainIdx].pt,
                "distance": float(m.distance)
            }
            for m in inlier_matches
        ],
        "transformation": H.tolist(),
        "metrics": {
            "rmse": rmse,
            "inlier_count": inlier_count,
            "inlier_ratio": inlier_ratio
        },
        "registered_image": "data/uploads/registered.jpg",
    }
}