# Garment Memory

A multi-user wardrobe & outfit journal. Upload clothing photos (backgrounds
removed automatically), organize them by category, build daily outfits by
clicking pieces (or rolling a die) into a head-to-toe canvas, and browse your
outfit history on a calendar.
Every account is private: there is no feed, no following, and no sharing.

## Stack

- **Backend** — FastAPI + SQLAlchemy + Alembic; SQLite by default, Postgres via
  `DATABASE_URL`; `withoutbg` for background removal; JWT session cookies
  (PyJWT + bcrypt)
- **Frontend** — React + Vite, one hand-written stylesheet, no CSS framework.
  The outfit display is divided into four parts — headwear, shirts, pants,
  shoes — and holds one piece per part; `@dnd-kit/core` nudges a worn piece
  within its own part. Every screen is sized to the viewport, so the page
  itself never scrolls; a crowded category scrolls sideways instead

## Running

### No-login testing branch

On `codex/no-auth-testing`, run the actual app locally without authentication:

```sh
cd backend
python3 -m uvicorn app.local_testing:app --host 127.0.0.1 --port 8011
```

In another terminal:

```sh
cd frontend
API_PROXY_TARGET=http://127.0.0.1:8011 npm run dev -- --host 127.0.0.1 --port 5174
```

Open http://127.0.0.1:5174 — no login or signup needed. The navbar says
“Local testing.” The four supplied photo fixtures are added on first startup;
uploads, edits, and saved outfits persist across restarts in the gitignored
`backend/.local-testing/` directory. Deleting a sample does not recreate it.
This is a separate testing closet, not your existing account's data.

**Local use only:** anyone who can reach this entry point can read and modify
the testing closet. Do not deploy it, tunnel it, or bind it to `0.0.0.0`.
The normal `app.main:app` entry point below still requires authentication.

### Authenticated application

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

- Garments, outfits, and calendars are private to their owner. Nothing is ever
  published to other users.
- Every query filters on `user_id` in SQL, not with a Python `if`.
- Cross-user access returns 404, not 403 (existence is not leaked).
- Caveat: files under `/uploads` are served without authorization, so privacy
  there rests on UUID filenames being unguessable.

## Layout

- `backend/app/` — FastAPI app: `models.py` (User / Garment / Outfit /
  OutfitItem), `routers/` (auth, garments, outfits, calendar), `auth.py`
  (sessions), `storage.py` (upload seam), `bg_remover.py` (lazy model singleton)
- `backend/alembic/` — migrations (`0001` baseline, `0002` multi-user). `0002`
  still creates the `follows`/`likes`/`comments` tables and the `is_public`
  columns; the app no longer reads or writes them.
- `backend/uploads/` — stored images (gitignored)
- `frontend/src/pages/` — Closet (`/`), Upload (`/upload`), outfit builder
  (`/ootd`), Calendar (`/calendar`), plus `/login` and `/signup`
