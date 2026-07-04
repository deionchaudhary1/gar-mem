# Garment Memory

A minimal wardrobe & outfit tracker. Upload clothing photos (backgrounds removed
automatically), organize them by category, build daily outfits by drag-and-drop,
and browse your outfit history on a calendar.

## Stack

- **Backend** — FastAPI + SQLAlchemy + SQLite, `withoutbg` for background removal
- **Frontend** — React + Vite, `@dnd-kit/core` for the outfit canvas

## Running

Backend (port 8000):

```sh
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
```

Frontend (port 5173, proxies `/api` and `/uploads` to the backend):

```sh
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

Note: the first garment upload lazily loads the background-removal model and can
take a minute or two; subsequent uploads are fast.

## Layout

- `backend/app/` — FastAPI app: `models.py` (Garment / Outfit / OutfitItem),
  `routers/` (garments, outfits, calendar), `bg_remover.py` (lazy model singleton)
- `backend/uploads/` — stored images (gitignored)
- `frontend/src/pages/` — Closet (`/`), Upload (`/upload`), outfit builder
  (`/ootd`), Calendar (`/calendar`)
