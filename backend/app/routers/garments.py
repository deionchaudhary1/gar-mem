import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..bg_remover import remove_background
from ..database import get_db

router = APIRouter(prefix="/api/garments", tags=["garments"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GARMENTS_DIR = os.path.join(BACKEND_DIR, "uploads", "garments")

VALID_CATEGORIES = {"headwear", "tops", "pants", "shoes"}


@router.post("/", response_model=schemas.Garment, status_code=201)
async def create_garment(
    file: UploadFile = File(...),
    category: str = Form(...),
    name: str = Form(None),
    db: Session = Depends(get_db),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"invalid category: {category}")

    contents = await file.read()

    if not name:
        stem = Path(file.filename or "garment").stem
        name = stem or "garment"

    try:
        image = remove_background(contents)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"background removal failed: {exc}")

    os.makedirs(GARMENTS_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}.png"
    file_path = os.path.join(GARMENTS_DIR, filename)
    image.save(file_path, format="PNG")

    garment = models.Garment(
        name=name,
        category=category,
        image_path=f"/uploads/garments/{filename}",
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


@router.get("/", response_model=list[schemas.Garment])
def list_garments(category: str | None = None, db: Session = Depends(get_db)):
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"invalid category: {category}")

    query = db.query(models.Garment)
    if category is not None:
        query = query.filter(models.Garment.category == category)
    query = query.order_by(models.Garment.created_at.desc(), models.Garment.id.desc())
    return query.all()


@router.get("/{garment_id}", response_model=schemas.Garment)
def get_garment(garment_id: int, db: Session = Depends(get_db)):
    garment = db.query(models.Garment).filter(models.Garment.id == garment_id).first()
    if garment is None:
        raise HTTPException(status_code=404, detail="garment not found")
    return garment


@router.delete("/{garment_id}", status_code=204)
def delete_garment(garment_id: int, force: bool = False, db: Session = Depends(get_db)):
    garment = db.query(models.Garment).filter(models.Garment.id == garment_id).first()
    if garment is None:
        raise HTTPException(status_code=404, detail="garment not found")

    outfit_count = (
        db.query(func.count(models.OutfitItem.id))
        .filter(models.OutfitItem.garment_id == garment_id)
        .scalar()
    )

    if outfit_count and not force:
        return JSONResponse(
            status_code=409,
            content={"detail": "in_use", "outfit_count": outfit_count},
        )

    db.query(models.OutfitItem).filter(models.OutfitItem.garment_id == garment_id).delete()

    image_path = os.path.join(BACKEND_DIR, garment.image_path.lstrip("/"))
    try:
        os.remove(image_path)
    except OSError:
        pass

    db.delete(garment)
    db.commit()
    return None
