import os
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload
from PIL import Image

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/outfits", tags=["outfits"])

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTFITS_DIR = os.path.join(BACKEND_DIR, "uploads", "outfits")

ITEMS_QUERY_OPTS = joinedload(models.Outfit.items).joinedload(models.OutfitItem.garment)


@router.post("/", response_model=schemas.Outfit, status_code=201)
def create_outfit(payload: schemas.OutfitCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="items must not be empty")

    garment_ids = [item.garment_id for item in payload.items]
    existing_count = (
        db.query(models.Garment).filter(models.Garment.id.in_(garment_ids)).count()
    )
    if existing_count != len(set(garment_ids)):
        raise HTTPException(status_code=400, detail="one or more garment_id not found")

    outfit = models.Outfit(date=payload.date, note=payload.note)
    for item in payload.items:
        outfit.items.append(
            models.OutfitItem(
                garment_id=item.garment_id,
                position_x=item.position_x,
                position_y=item.position_y,
                scale=item.scale,
            )
        )
    db.add(outfit)
    db.commit()
    db.refresh(outfit)

    outfit = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS)
        .filter(models.Outfit.id == outfit.id)
        .first()
    )
    return outfit


@router.get("/", response_model=list[schemas.Outfit])
def list_outfits(
    date: date_type | None = None,
    month: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Outfit).options(ITEMS_QUERY_OPTS)

    if date is not None:
        query = query.filter(models.Outfit.date == date)

    if month is not None:
        try:
            year_s, month_s = month.split("-")
            year_i, month_i = int(year_s), int(month_s)
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="invalid month, expected YYYY-MM")
        if not (1 <= month_i <= 12):
            raise HTTPException(status_code=400, detail="invalid month, expected YYYY-MM")

        from calendar import monthrange

        start = date_type(year_i, month_i, 1)
        end = date_type(year_i, month_i, monthrange(year_i, month_i)[1])
        query = query.filter(models.Outfit.date >= start, models.Outfit.date <= end)

    query = query.order_by(models.Outfit.created_at.desc(), models.Outfit.id.desc())
    return query.all()


@router.get("/{outfit_id}", response_model=schemas.Outfit)
def get_outfit(outfit_id: int, db: Session = Depends(get_db)):
    outfit = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS)
        .filter(models.Outfit.id == outfit_id)
        .first()
    )
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")
    return outfit


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(outfit_id: int, db: Session = Depends(get_db)):
    outfit = db.query(models.Outfit).filter(models.Outfit.id == outfit_id).first()
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")

    if outfit.selfie_path:
        selfie_fs_path = os.path.join(BACKEND_DIR, outfit.selfie_path.lstrip("/"))
        try:
            os.remove(selfie_fs_path)
        except OSError:
            pass

    db.delete(outfit)
    db.commit()
    return None


@router.post("/{outfit_id}/selfie", response_model=schemas.Outfit)
async def upload_selfie(
    outfit_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    outfit = db.query(models.Outfit).filter(models.Outfit.id == outfit_id).first()
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")

    os.makedirs(OUTFITS_DIR, exist_ok=True)

    contents = await file.read()

    orig_ext = ""
    if file.filename and "." in file.filename:
        orig_ext = file.filename.rsplit(".", 1)[-1].lower()

    allowed_exts = {"jpg", "jpeg", "png", "webp"}

    old_selfie_path = outfit.selfie_path

    filename_uuid = str(uuid.uuid4())

    if orig_ext in allowed_exts:
        ext = "jpg" if orig_ext == "jpeg" else orig_ext
        filename = f"{filename_uuid}.{ext}"
        file_path = os.path.join(OUTFITS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
    else:
        # convert to jpeg via Pillow
        import io

        image = Image.open(io.BytesIO(contents))
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
        filename = f"{filename_uuid}.jpg"
        file_path = os.path.join(OUTFITS_DIR, filename)
        image.save(file_path, format="JPEG")

    outfit.selfie_path = f"/uploads/outfits/{filename}"
    db.add(outfit)
    db.commit()
    db.refresh(outfit)

    if old_selfie_path:
        old_fs_path = os.path.join(BACKEND_DIR, old_selfie_path.lstrip("/"))
        try:
            os.remove(old_fs_path)
        except OSError:
            pass

    outfit = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS)
        .filter(models.Outfit.id == outfit.id)
        .first()
    )
    return outfit
