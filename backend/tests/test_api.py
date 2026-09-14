import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "UPLOAD_DIR", tmp_path)
    return TestClient(main.app)


def _png(image: np.ndarray) -> bytes:
    ok, encoded = cv2.imencode(".png", np.clip(image, 0, 255).astype(np.uint8))
    assert ok
    return encoded.tobytes()


def test_analyze_registers_pair_and_keeps_response_shape(client, tmp_path, lunar_texture, rng):
    reference = lunar_texture
    height, width = reference.shape
    truth = cv2.getRotationMatrix2D((width / 2, height / 2), 3.0, 1.0)
    truth[:, 2] += (5.0, -3.0)
    source = cv2.warpAffine(reference, truth, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    source = source * 0.85 + 10 + rng.normal(0, 2, source.shape)

    response = client.post(
        "/api/registration/analyze",
        files={"reference": ("nac.png", _png(reference), "image/png"), "source": ("ohrc.png", _png(source), "image/png")},
        data={"reference_gsd": "1.0"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "success"
    result = body["result"]
    for key in ("matches", "transformation", "metrics", "quality_assessment", "registered_image", "inlier_matches_image"):
        assert key in result
    for key in ("rmse", "max_error", "inlier_count", "inlier_ratio", "spatial_coverage", "occupied_cells", "uniformity_score"):
        assert key in result["metrics"]

    assert result["metrics"]["rmse"] < 0.5
    assert result["quality_assessment"]["subpixel_accuracy"] == "ACHIEVED"
    assert result["engine"]["holdout_rmse_m"] == pytest.approx(result["metrics"]["rmse"], abs=1e-3)
    assert len(result["engine"]["cells"]) == 64

    # Tie points agree with the true source position of each reference point.
    match = np.array([[m["reference"], m["source"]] for m in result["matches"]])
    expected = match[:, 0] @ truth[:, :2].T + truth[:, 2]
    assert np.median(np.hypot(*(match[:, 1] - expected).T)) < 0.2

    job_dir = tmp_path / body["job_id"]
    for name in ("registered.png", "overlay.jpg", "error_heatmap.jpg", "tie_points.jpg"):
        assert (job_dir / name).is_file()
        assert result[{"registered.png": "registered_image", "overlay.jpg": "overlay_image",
                       "error_heatmap.jpg": "error_heatmap_image", "tie_points.jpg": "inlier_matches_image"}[name]].endswith(name)


def test_rejects_unsupported_file_type_and_ignores_client_paths(client, tmp_path, lunar_texture):
    response = client.post(
        "/api/registration/analyze",
        files={
            "reference": ("../../evil.exe", b"MZ", "application/octet-stream"),
            "source": ("ok.png", _png(lunar_texture), "image/png"),
        },
    )
    assert response.status_code == 400
    assert response.json()["status"] == "error"
    assert not any(tmp_path.parent.glob("evil*"))


def test_unregistrable_pair_returns_422(client, rng):
    noise_a = rng.uniform(0, 255, (300, 300))
    flat = np.full((300, 300), 128.0)
    response = client.post(
        "/api/registration/analyze",
        files={"reference": ("a.png", _png(noise_a), "image/png"), "source": ("b.png", _png(flat), "image/png")},
    )
    assert response.status_code == 422
    assert response.json()["status"] == "error"


@pytest.fixture
def sample_data(tmp_path, monkeypatch, lunar_texture):
    from app.registration import samples

    data_dir = tmp_path / "data"
    sample = samples.SAMPLES[0]
    height, width = lunar_texture.shape
    shift = np.float32([[1, 0, 4.0], [0, 1, -2.5]])
    source = cv2.warpAffine(lunar_texture, shift, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    for relative, image in ((sample.reference, lunar_texture), (sample.source, source)):
        (data_dir / relative).parent.mkdir(parents=True, exist_ok=True)
        assert cv2.imwrite(str(data_dir / relative), np.clip(image, 0, 255).astype(np.uint8))
    monkeypatch.setattr(main, "DATA_DIR", data_dir)
    return data_dir, sample


def test_samples_list_only_pairs_present_on_disk(client, tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATA_DIR", tmp_path / "empty")
    assert client.get("/api/samples").json() == {"samples": []}
    response = client.post("/api/registration/analyze-sample", data={"sample_id": "vikram-landing-site"})
    assert response.status_code == 404


def test_sample_listing_and_analysis(client, sample_data):
    data_dir, sample = sample_data

    listed = client.get("/api/samples").json()["samples"]
    assert [s["id"] for s in listed] == [sample.id]
    assert listed[0]["reference"]["preview"] == f"/data/samples/{sample.id}/reference_preview.jpg"
    assert (data_dir / "samples" / sample.id / "source_preview.jpg").is_file()

    response = client.post("/api/registration/analyze-sample", data={"sample_id": sample.id})
    assert response.status_code == 200, response.text
    result = response.json()["result"]
    assert result["metrics"]["rmse"] < 0.5
    assert result["source_preview_image"].endswith("source_preview.jpg")
    assert len(result["matches"]) == result["metrics"]["inlier_count"]
