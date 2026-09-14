# PS-166 — Lunar Image Registration

**SIH Problem Statement 26166** — Multi-modal, sun angle and scale invariant image
correspondence using Chandrayaan-2 optical images (OHRC, TMC-2, IIRS).

Organization: ISRO / Department of Space · Category: Software · Theme: Space Technology

Registers a Chandrayaan-2 source image against a lunar reference frame (LRO NAC,
SELENE TC), producing a registered product, a match-point table, and accuracy metrics.

## Repository layout

```
PS_26166/
├── frontend/     React + TypeScript + Vite + Tailwind UI
└── backend/      FastAPI + OpenCV registration service
```

## Frontend

```bash
cd frontend && npm install && npm run dev
```

Runs on http://localhost:5173.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `npm run lint` | Oxlint |
| `npm run preview` | Serve the production build locally |

Routes:

| Route | Page |
| --- | --- |
| `/` | Public landing page (no workstation chrome) |
| `/overview` | Mission overview |
| `/matching` | Comparison workstation — load source + reference |
| `/heatmap` | Similarity heatmap |
| `/features` | Feature correspondence |
| `/geospatial` | Geospatial verification |
| `/results` | Analysis summary |

The UI is bilingual (English / Hindi) via `src/i18n`. Add every new string to
**both** `en.ts` and `hi.ts` — `t()` is typed against `en`, so a missing key in
`en.ts` is a compile error, while a missing key in `hi.ts` silently falls back
to English.

### Landing hero animation

The landing page hero plays an animation that scrubs with scroll. It is drawn frame by
frame on a canvas from WebP images in `frontend/public/hero/` (a 1920px set, and a 960px
set for small screens). To replace the video:

```bash
cd frontend && python scripts/extract_hero_frames.py "path/to/new-video.mp4"
```

If the frame count changes, update `HERO_FRAME_COUNT` in
`src/components/landing/ScrollVideoHero.tsx`. Caption timing lives in `CAPTIONS` in the
same file.

## Backend

```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
```

Runs on http://localhost:8000.

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness check |
| `POST /api/registration/analyze` | Accepts `source` + `reference` uploads (PNG/JPG/WebP/TIFF, optional `source_gsd` / `reference_gsd` in m/px), returns tie points, metrics, quality assessment and image URLs (registered, overlay, error heatmap, tie points) |

Tests: `cd backend && pip install -r requirements-dev.txt && pytest`

Accuracy on the real Vikram landing-site pair (needs the files in `backend/data/vikram_site/`):

```bash
cd backend && python scripts/evaluate_vikram_site.py --save
```

## Current status

The registration engine (`backend/app/registration/`) runs coarse to fine:

1. Load PNG/JPG/TIFF (8/16-bit, GeoTIFF georeferencing and no-data) or a PDS4 product from its XML label: one band of a spectral cube is memory-mapped, and pixel size, footprint corners and band wavelength come from the label
2. Resample the source to the reference ground resolution when both are known
3. SIFT on downsampled images (at most 3000 px on the long side), RootSIFT descriptors, FLANN matching with ratio and mutual checks, MAGSAC++ homography, grid-balanced refit
4. Overlap crop: a regular grid of tie points is kept only where the current mapping lands inside the source and the reference has data
5. Tie points refined to sub-pixel precision by normalised cross-correlation; outliers removed with a MAD test on the best global model
6. Geometric model chosen by **spatial-block hold-out RMSE**: homography, polynomials of degree 2-5, or polynomial-4 plus a local correction field (residuals on the tie-point grid, harmonic fill, cubic B-spline interpolation) for terrain relief. A second refinement pass runs through the chosen model
7. Outputs: registered float32 GeoTIFF on the reference grid (with its map projection), tie-point CSV with held-out errors and map coordinates, overlay, error heatmap and a JSON report

`metrics.rmse` is a held-out error: each tie point is predicted by a model that never saw
its 4 × 4 spatial block. On the Vikram landing-site OHRC / LROC NAC pair this is 0.50 px
(0.50 m) with the local model, against 0.61 px for the best global polynomial and 1.26 px
for the earlier SIFT + RANSAC baseline.

The PDS4 reader was checked on a real Chandrayaan-2 IIRS cube
(`ch2_iir_nri_20200607T1842566991_d_img_d18`): the band read correlates 0.88 with the
product's own browse image.

The web workstation (`/matching`, `/heatmap`, `/features`, `/geospatial`, `/results`) shows
results from the engine. Real sample pairs appear when their files are present under
`backend/data/`.

Built with OpenCV (SIFT, FLANN, USAC MAGSAC++), NumPy, SciPy and tifffile.

Not yet implemented:

- Illumination-invariant descriptors (phase congruency / RIFT) for strongly different sun angles
- Orthorectification against a DEM
- Benchmark on the ISRO SAC study's equatorial and polar OHRC-NAC pairs
