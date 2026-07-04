import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import calendar, garments, outfits

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads")

# StaticFiles requires the directory to exist at mount time, so ensure it's
# there before the app object (and its mount below) is constructed.
os.makedirs(os.path.join(UPLOADS_DIR, "garments"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "outfits"), exist_ok=True)

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
    os.makedirs(os.path.join(UPLOADS_DIR, "garments"), exist_ok=True)
    os.makedirs(os.path.join(UPLOADS_DIR, "outfits"), exist_ok=True)
    Base.metadata.create_all(bind=engine)


app.include_router(garments.router)
app.include_router(outfits.router)
app.include_router(calendar.router)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
