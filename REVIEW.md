# Code Review — gar-mem (Garment Memory)

Senior-engineer-style review of `backend/app/` (auth, storage, migrations, all five routers,
models), July 2026. Ordered by severity. Security findings first — this is the project where
interviewers will probe auth hardest.

> **Note (August 2026, `simple` branch):** the social layer was removed — `routers/social.py`,
> `serializers.py`, the `Follow`/`Like`/`Comment` models, and the `is_public` columns are gone
> from the code. That makes **#9** (follow/like insert races) moot, resolves the dead
> `Garment.is_public` column noted in **#8**, and drops the comment/bio length caps from
> **#11**. Everything else below still applies, including all of #1–#7.

---

## Bugs

### 1. Mixed-case usernames can never log in by username (routers/auth.py:26–30 vs 50–54)

Signup stores `payload.username` **as given**; login lowercases the identifier
(`identifier = payload.identifier.strip().lower()`) and compares it to `username` with an
exact match. A user who signs up as `Deion` can log in by email but never by username —
`deion` won't match the stored `Deion`. It also means `Deion` and `deion` can register as two
distinct accounts. Fix: normalize username to lowercase at signup (and add a uniqueness check
on the normalized form); keep display casing in a separate column if you want it.

### 2. Files are deleted from storage *before* the DB commit (routers/garments.py:128–131, outfits.py:166–169)

```python
storage.delete(garment.image_path)
db.delete(garment)
db.commit()
```

If the commit fails (locked SQLite, constraint error), the image is already gone but the row
survives — a permanently broken garment. The avatar route (routers/auth.py:115–123) gets the
order right: commit first, delete the old file after. Make garments/outfits match it.
(Interview term: you can't have atomicity across a DB and a filesystem, so you order
operations so the failure mode is an orphaned *file*, never an orphaned *row*.)

### 3. Selfie upload trusts the file extension and skips validation entirely (routers/outfits.py:194–196)

If the filename ends in `.jpg/.png/.webp`, the raw bytes are written to disk unexamined — any
payload gets stored and served from `/uploads` with an image extension. And in the fallback
branch, `Image.open` is uncaught, so a corrupt file 500s instead of 400ing (the avatar route
catches this correctly). Fix: always decode with Pillow and re-encode (like the avatar route),
which both validates and strips EXIF (GPS!) from selfies — a privacy win worth mentioning.

## Security hardening (do before any deployment)

### 4. CORS: wildcard origin with credentials (main.py:18–24)

`allow_origins=["*"]` + `allow_credentials=True` makes Starlette reflect any request Origin on
credentialed requests. Today `SameSite=Lax` on the session cookie limits the damage, but this
config plus any future `SameSite=None` (a common "fix" for cross-site cookie issues) would let
any website read authenticated responses. Before deploying: set an explicit origin allowlist
from an env var. One line, and it's the first thing a security reviewer greps for.

### 5. No upload size limits anywhere (routers/auth.py:96, garments.py:49, outfits.py:182)

`await file.read()` slurps the whole upload into memory with no cap — a multi-GB POST is an
easy memory-DoS. Enforce a max (e.g. 10 MB) by checking `Content-Length` and/or reading in
chunks; also set `Image.MAX_IMAGE_PIXELS` awareness for decompression bombs (Pillow's default
guard raises at ~178 MP — decide explicitly rather than inherit it).

### 6. Dev SECRET_KEY works silently in production (auth.py:14)

`os.environ.get("SECRET_KEY", "dev-secret-change-me")` — anyone who reads the repo can forge a
session JWT for any user id if the env var is unset in a deployment. Fail loudly instead:
refuse to start (or at minimum log a screaming warning) when the default key is used outside
dev. Same pattern for `GM_COOKIE_SECURE`.

### 7. Login timing leaks whether a username exists (routers/auth.py:58)

`user is None or not verify_password(...)` short-circuits: unknown users return in
microseconds, known users after a full bcrypt check (~100 ms). Classic username-enumeration
timing oracle. Fix: when the user is missing, verify against a static dummy bcrypt hash so
both paths cost the same. Three lines, and a great interview story.

### 8. Uploaded images are served with no authorization (main.py:38)

Everything under `/uploads` is public to anyone with the URL; privacy rests on UUID
unguessability. That's a defensible tradeoff (Instagram does the same for CDN URLs) — but it
should be a *stated* tradeoff in the README, and it slightly undercuts the "private outfits"
model since a once-shared selfie URL works forever. Related: `Garment.is_public`
(models.py:41) is written nowhere and read nowhere — dead column; drop it or wire it up.

## Design & robustness

### 9. Follow/like check-then-insert races produce 500s (routers/social.py:97–108, 286–297)

Two concurrent double-clicked requests both pass the `existing is None` check; the second
INSERT violates the composite PK and bubbles up as an unhandled `IntegrityError` → 500. The
data stays correct (the constraint holds — good schema design), but the API contract doesn't.
Catch `IntegrityError` and treat it as the idempotent no-op it is.

### 10. Logout doesn't invalidate the token (auth.py:54, routers/auth.py:65–68)

Clearing the cookie leaves the JWT valid for its remaining 30 days — anyone who captured it
keeps a session "logout" can't kill. Standard stateless-JWT tradeoff; fine for this app, but
know the mitigations for interviews (short-lived tokens + refresh, a token-version column
checked in `get_current_user`, or server-side sessions).

### 11. Deprecated patterns that will bite on upgrade

- `@app.on_event("startup")` (main.py:27) → FastAPI lifespan context.
- `datetime.utcnow` (models.py, 7 uses) → `datetime.now(timezone.utc)`; naive UTC timestamps
  are a known source of TZ bugs, and Python has deprecated `utcnow`.
- Comment/bio/note text fields have no length caps in the schemas — a 10 MB comment is
  currently accepted. Add `max_length` to the Pydantic fields.

## What's genuinely good (keep, and say in interviews)

- The **404-not-403 anti-enumeration discipline** — applied consistently across garments,
  outfits, and comments, with comments explaining *why* — is real security thinking, not
  cargo-culting.
- **Privacy enforced in SQL, not Python** (`is_public == True` in the query itself, owner
  exception as an explicit OR in `_visible_outfit_or_404`) means a forgotten `if` can't leak a
  private outfit. This is the strongest design decision in the codebase.
- The **page+1 fetch for `has_more`** and deterministic ordering with an id tiebreaker are
  correct pagination mechanics most CRUD apps get wrong.
- **Composite primary keys on follows/likes** make duplicate relationships impossible at the
  schema level (finding #9 is only an error-handling gap, not a data-integrity one).
- The **legacy-DB stamping** in migrations.py (detect pre-Alembic DB → stamp baseline →
  upgrade) is a genuinely production-grade migration pattern; so is the eager-loading
  (`joinedload`) discipline against N+1 queries in the feed.
- The two-method **storage seam** is exactly the right size for the abstraction it claims.

## Suggested fix order

1. #1 (username casing) — user-visible login failure.
2. #3 (selfie validation) + #5 (size caps) — same code paths, fix together.
3. #2 (delete ordering) — three-line change in two routers.
4. #4 + #6 (CORS, SECRET_KEY) — mandatory before the planned deployment; trivial now.
5. #7, #9 — small, high interview value.
6. #8, #10, #11 — document the tradeoffs; clean up on next touch.
