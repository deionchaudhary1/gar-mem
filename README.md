# Garment Memory

A multi-user wardrobe & outfit journal. Upload clothing photos (backgrounds
removed automatically), organize them by category, build daily outfits by
clicking pieces (or rolling a die) into a head-to-toe canvas, and browse your
outfit history on a calendar.
Every account is private: there is no feed, no following, and no sharing.

![Outfit composition in Garment Memory](docs/studio.png)

This is the running application with four bundled sample garments in its isolated local demo. The sample closet needs no account, paid service, or background-removal model. [Today](docs/today.png) and [the saved outfit in Journal](docs/journal.png) show the completed save flow.

## The personal style studio

- **Today** (`/`): actual wardrobe totals, recent pieces, and the latest dated
  saved look, with shortcuts to build or repeat an outfit.
- **Wardrobe** (`/wardrobe`): scrolling shelves, category browsing and search.
- **Studio** (`/studio`): click-to-wear outfit composition; saving opens the
  new look in the Journal. “Wear it again” starts a new look using the same
  garments; the original is not edited.
- **Journal** (`/journal`): paginated saved-look gallery and calendar view.
- Adding a piece (`/upload`) is a contextual action from Today or Wardrobe.

Old `/ootd` and `/calendar` links still resolve; old root closet query links
are redirected to `/wardrobe` with their filters intact. Journal reads use the
owner-scoped `/api/outfits/browse` endpoint (maximum 24 looks per request).

## Technology

- **Backend** — FastAPI + SQLAlchemy + Alembic; SQLite by default, Postgres via
  `DATABASE_URL`; `withoutbg` for background removal; JWT session cookies
  (PyJWT + bcrypt)
- **Frontend** — React + Vite, one hand-written stylesheet, no CSS framework.
  The outfit display is divided into four parts — headwear, shirts, pants,
  shoes — and holds one piece per part; `@dnd-kit/core` nudges a worn piece
  within its own part. Every screen is sized to the viewport, so the page
  itself never scrolls; a crowded category scrolls sideways instead

## Architecture

```mermaid
flowchart LR
    UI[React wardrobe and studio] --> API[FastAPI routes]
    API --> Owner[Authenticated owner or isolated demo user]
    Owner --> DB[(SQLAlchemy and SQLite)]
    API --> Files[Local image storage]
    Files --> Model[Optional lazy background removal]
```

Garment and outfit reads are scoped to an owner in SQL. Outfit composition stays in React until Save submits the selected garment IDs and transforms; the journal then reads the persisted outfit. The no-login entry point replaces the database/session dependencies and uses separate demo storage. It exercises the actual route code without changing the authenticated account's closet.

The local demo and current browser screenshots verify composing four pieces, saving an outfit, viewing it after reload, and finding it on Today. Model-backed garment uploads and Postgres deployment were not exercised in that check.

## Running

Run the commands from the repository root in a POSIX shell. Use Node 20.19+ on
the 20.x line, or Node 22.12+.

### Local demo with sample garments

Create a virtual environment and install the backend dependencies for browsing
the sample garments and building outfits. The demo only needs `withoutbg` if
you want to upload a new garment.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install fastapi uvicorn sqlalchemy python-multipart Pillow PyJWT bcrypt
(cd backend && ../.venv/bin/python -m uvicorn app.local_testing:app --host 127.0.0.1 --port 8011)
```

In another terminal at the repository root, install and start the frontend.

```sh
npm --prefix frontend ci
API_PROXY_TARGET=http://127.0.0.1:8011 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174
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

Install the full backend requirements, including Alembic migrations and
`withoutbg` for new garment uploads. Start the backend on port 8010.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
(cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8010)
```

Migrations run automatically at startup (pre-existing single-user databases are
stamped and upgraded in place; their old rows are owned by a locked `legacy`
user). To make that pre-migration data yours, claim the account once:

```sh
(cd backend && ../.venv/bin/python -m app.claim_legacy USERNAME EMAIL PASSWORD)
```

In another terminal at the repository root, start the frontend. Vite proxies
`/api` and `/uploads` to the backend on port 8010.

```sh
npm --prefix frontend ci
API_PROXY_TARGET=http://127.0.0.1:8010 npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173
```

Then open http://127.0.0.1:5173 and sign up.

The first garment upload loads the background-removal model and can take a
minute or two.

### Verification

With the local demo dependencies installed, add `httpx` and run the backend
tests. They use a synthetic in-memory SQLite database and temporary image
storage. The frontend build can run independently.

```sh
.venv/bin/python -m pip install httpx
(cd backend && ../.venv/bin/python -m unittest discover -s tests -v)
npm --prefix frontend run build
```

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
- `frontend/src/pages/` — Today (`/`), Wardrobe (`/wardrobe`), Studio
  (`/studio`), Journal (`/journal`), Upload (`/upload`), Login (`/login`),
  and Signup (`/signup`)
