# Garment Memory

A multi-user wardrobe & outfit social app. Upload clothing photos (backgrounds
removed automatically), organize them by category, build daily outfits by
drag-and-drop, browse your outfit history on a calendar — and share fits to a
feed, follow friends, like and comment.

## Stack

- **Backend** — FastAPI + SQLAlchemy + Alembic; SQLite by default, Postgres via
  `DATABASE_URL`; `withoutbg` for background removal; JWT session cookies
  (PyJWT + bcrypt)
- **Frontend** — React + Vite, `@dnd-kit/core` for the outfit canvas

## Running

Backend (port 8010):

```sh
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8010
```

Migrations run automatically at startup (pre-existing single-user databases are
stamped and upgraded in place; their old rows are owned by a locked `legacy`
user). To make that pre-migration data yours, claim the account once:

```sh
cd backend
python3 -m app.claim_legacy <username> <email> <password>
```

Frontend (port 5173, proxies `/api` and `/uploads` to `localhost:8010`):

```sh
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 and sign up.

Note: the first garment upload lazily loads the background-removal model and can
take a minute or two; subsequent uploads are fast.

## Configuration (env vars)

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///backend/gardrobe.db` | For Postgres: `pip install "psycopg[binary]"` and use `postgresql+psycopg://user:pass@host/db` |
| `SECRET_KEY` | dev value | Set a real secret in production (signs session JWTs) |
| `GM_COOKIE_SECURE` | off | Set `1` behind HTTPS so session cookies are Secure |

Uploads are stored on local disk (`backend/uploads/`, served at `/uploads`).
All file writes go through `app/storage.py`, so moving to S3/R2 later means
adding a second storage class there — no router changes.

## Privacy model

- Garments and calendars are always private to their owner.
- Outfits are private by default; the "Share to feed" toggle makes one public.
- Public outfits appear on your profile (`/u/username`), in followers' feeds,
  and in Discover; they carry their garment images with them.
- Cross-user access to private resources returns 404 (existence is not leaked).

## Layout

- `backend/app/` — FastAPI app: `models.py` (User / Garment / Outfit /
  OutfitItem / Follow / Like / Comment), `routers/` (auth, garments, outfits,
  calendar, social), `auth.py` (sessions), `storage.py` (upload seam),
  `bg_remover.py` (lazy model singleton)
- `backend/alembic/` — migrations (`0001` baseline, `0002` multi-user)
- `backend/uploads/` — stored images (gitignored)
- `frontend/src/pages/` — Closet (`/`), Upload (`/upload`), outfit builder
  (`/ootd`), Calendar (`/calendar`), Feed (`/feed`), profiles (`/u/:username`),
  plus `/login` and `/signup`
