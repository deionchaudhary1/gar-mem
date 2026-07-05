Here's the plan I'd propose to turn it into a multi-user OOTD/closet social site:

1. Auth & identity
- Add a User model (email/username, hashed password, avatar, bio) and real auth — JWT session cookies or hand-rolled with passlib/python-jose.
- Replace the hardcoded `user_id=1` default on Garment/Outfit/OutfitItem with the authenticated user's real id, and add a `get_current_user` dependency to all routers.
- Frontend: login/signup pages, auth context, protected routes.

2. Privacy & ownership model
- Add `is_public` (or a visibility enum: private/followers/public) to Garment and Outfit.
- Enforce ownership checks on every read and write endpoint (garments, outfits, calendar) — currently there's no auth at all, so any client can read/edit/delete any record.

3. Social graph
- Follow table (follower_id, followee_id).
- New endpoints: follow/unfollow, followers/following lists, a per-user public profile (`/u/:username`).

4. Feed
- A Feed/timeline endpoint aggregating public outfits from followed users (or global public feed), paginated, sorted by created_at.
- Likes/comments as lightweight additions if you want engagement (Like, Comment tables tied to Outfit).

5. Storage & infra
- Move image uploads off local disk to object storage (S3/R2) once multiple users are uploading — local `uploads/` won't scale or survive redeploys.
- Migrate SQLite → Postgres for concurrent multi-user writes (SQLite's single-writer lock becomes a bottleneck).
- Add Alembic for migrations since schema will now evolve with real user data in it.

6. Frontend additions
- Profile pages, a public feed/discovery page, follow buttons, an explicit "share to feed" toggle when posting an outfit.

I'd suggest doing this in stages: (1) auth + ownership enforcement first since that's the security-critical piece everything else builds on, (2) Postgres migration, then (3) social graph + feed last since that's purely additive.
