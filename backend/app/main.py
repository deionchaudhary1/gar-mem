import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .migrations import run_migrations
from .routers import auth, calendar, garments, outfits, social
from .storage import UPLOADS_DIR

# StaticFiles requires the directory to exist at mount time, so ensure it's
# there before the app object (and its mount below) is constructed.
for subdir in ("garments", "outfits", "avatars"):
    os.makedirs(os.path.join(UPLOADS_DIR, subdir), exist_ok=True)

app = FastAPI(title="Garment Memory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    run_migrations()


app.include_router(auth.router)
app.include_router(garments.router)
app.include_router(outfits.router)
app.include_router(calendar.router)
app.include_router(social.router)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
