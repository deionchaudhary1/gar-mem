# CLAUDE.md — gar-mem (Garment Memory)

Multi-user wardrobe + outfit social app. FastAPI backend, React (Vite) frontend. Upload
clothing (background auto-removed), build outfits by drag-and-drop, browse a calendar, and
share to a social feed with follows/likes/comments.

## Stack & layout

- **Backend** (`backend/app/`) — FastAPI + SQLAlchemy + Alembic. SQLite by default, Postgres via
  `DATABASE_URL`. JWT session cookies (PyJWT + bcrypt). `withoutbg` for background removal.
- **Frontend** (`frontend/`) — React + Vite, `@dnd-kit/core` for the outfit canvas.

```
backend/app/
  main.py         FastAPI app, CORS, static /uploads mount, startup migrations
  database.py     engine/session; SQLALCHEMY_DATABASE_URL from env (sqlite|postgres)
  models.py       User, Garment, Outfit, OutfitItem, Follow, Like, Comment
  auth.py         bcrypt + JWT-in-HttpOnly-cookie; get_current_user dependency
  storage.py      LocalStorage seam (save/delete) — swap for S3/R2 by adding one class
  migrations.py   programmatic Alembic runner (stamps pre-Alembic DBs, then upgrades)
  bg_remover.py   withoutbg wrapper (lazy-loads model on first use)
  routers/        auth, garments, outfits, calendar, social   (29 endpoints)
```

## Commands

```bash
# backend (:8010)
cd backend && python3 -m uvicorn app.main:app --reload --port 8010
# frontend (:5173, proxies /api and /uploads to :8010)
cd frontend && npm install && npm run dev
# claim a pre-multiuser legacy DB:
cd backend && python3 -m app.claim_legacy <username> <email> <password>
```

Migrations run automatically at startup. First garment upload lazily loads the bg-removal
model (~1–2 min); later uploads are fast.

## Conventions & gotchas (important — these encode real design decisions)

- **Privacy is enforced in SQL, not Python**: queries filter `is_public == True` with the owner
  exception as an explicit OR (`_visible_outfit_or_404`). Keep new endpoints doing this — a
  forgotten `if` must not be able to leak private data.
- **404, not 403, on ownership failures** — so resource ids don't leak existence. Consistent
  across garments/outfits/comments.
- **All file I/O goes through `storage.py`** — never write to disk directly in a router. This is
  what makes the S3/R2 move a one-class change (see `plans/DEPLOY.md`).
- **Pagination**: page+1 fetch for `has_more`, ordered with an id tiebreaker.

## Known issues — see `REVIEW.md`

Read `REVIEW.md` before extending. Notable: **#1** username casing (signup keeps case, login
lowercases → username login can fail), **#2** files deleted before DB commit in garments/outfits
routers, and the security gates (**#4** wildcard CORS + credentials, **#5** no upload caps,
**#6** dev SECRET_KEY) that `plans/DEPLOY.md` requires closing before any public deploy.

## Active work

`plans/DEPLOY.md` — plan to ship this to a free-tier live URL (Docker, CI, Neon Postgres, R2).
**Deion executes this himself — advise, don't implement.**
