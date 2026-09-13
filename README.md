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
| `POST /api/registration/analyze` | Accepts `source` + `reference` uploads, returns match points, transform and metrics |

## Current status

The backend implements a **classical baseline**: SIFT feature detection, brute-force
matching, RANSAC homography estimation, and RMSE / inlier count / inlier ratio.
This is the benchmark that the illumination-invariant method is measured against —
not the final approach.

Not yet implemented:

- Metadata-driven coarse alignment (PDS4 label parsing, common projection and GSD)
- Illumination-invariant descriptors (phase congruency / RIFT)
- Sub-pixel refinement
- Uniform tie-point distribution enforcement
- Orthorectification against a DEM

The frontend is not yet wired to the backend — `src/services/matchingService.ts`
returns demo data.
