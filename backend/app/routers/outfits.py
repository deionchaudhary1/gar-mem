import io
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..storage import storage

router = APIRouter(prefix="/api/outfits", tags=["outfits"])

ITEMS_QUERY_OPTS = joinedload(models.Outfit.items).joinedload(models.OutfitItem.garment)


def _load_outfit(outfit_id: int, db: Session) -> models.Outfit | None:
    return (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS)
        .filter(models.Outfit.id == outfit_id)
        .first()
    )


def _get_owned_outfit(
    outfit_id: int, db: Session, current_user: models.User
) -> models.Outfit:
    # Other users' outfits 404 (not 403) so ids don't leak existence.
    outfit = (
        db.query(models.Outfit)
        .filter(
            models.Outfit.id == outfit_id,
            models.Outfit.user_id == current_user.id,
        )
        .first()
    )
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")
    return outfit


@router.post("/", response_model=schemas.Outfit, status_code=201)
def create_outfit(
    payload: schemas.OutfitCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="items must not be empty")

    garment_ids = [item.garment_id for item in payload.items]
    existing_count = (
        db.query(models.Garment)
        .filter(
            models.Garment.id.in_(garment_ids),
            models.Garment.user_id == current_user.id,
        )
        .count()
    )
    if existing_count != len(set(garment_ids)):
        raise HTTPException(status_code=400, detail="one or more garment_id not found")

    outfit = models.Outfit(
        user_id=current_user.id,
        date=payload.date,
        note=payload.note,
    )
    for item in payload.items:
        outfit.items.append(
            models.OutfitItem(
                user_id=current_user.id,
                garment_id=item.garment_id,
                position_x=item.position_x,
                position_y=item.position_y,
                scale=item.scale,
            )
        )
    db.add(outfit)
    db.commit()

    return _load_outfit(outfit.id, db)


@router.get("/", response_model=list[schemas.Outfit])
def list_outfits(
    date: date_type | None = None,
    month: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS)
        .filter(models.Outfit.user_id == current_user.id)
    )

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
def get_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _load_outfit(outfit_id, db)
    # Another user's outfit 404s (not 403) so ids don't leak existence.
    if outfit is None or outfit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="outfit not found")
    return outfit


@router.patch("/{outfit_id}", response_model=schemas.Outfit)
def update_outfit(
    outfit_id: int,
    payload: schemas.OutfitUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _get_owned_outfit(outfit_id, db, current_user)

    if "note" in payload.model_fields_set:
        outfit.note = payload.note

    db.add(outfit)
    db.commit()

    return _load_outfit(outfit_id, db)


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _get_owned_outfit(outfit_id, db, current_user)

    storage.delete(outfit.selfie_path)

    db.delete(outfit)
    db.commit()
    return None


@router.post("/{outfit_id}/selfie", response_model=schemas.Outfit)
async def upload_selfie(
    outfit_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _get_owned_outfit(outfit_id, db, current_user)

    contents = await file.read()

    orig_ext = ""
    if file.filename and "." in file.filename:
        orig_ext = file.filename.rsplit(".", 1)[-1].lower()

    allowed_exts = {"jpg", "jpeg", "png", "webp"}

    old_selfie_path = outfit.selfie_path

    filename_uuid = str(uuid.uuid4())

    if orig_ext in allowed_exts:
        ext = "jpg" if orig_ext == "jpeg" else orig_ext
        selfie_path = storage.save("outfits", f"{filename_uuid}.{ext}", contents)
    else:
        # convert to jpeg via Pillow
        image = Image.open(io.BytesIO(contents))
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
        buf = io.BytesIO()
        image.save(buf, format="JPEG")
        selfie_path = storage.save("outfits", f"{filename_uuid}.jpg", buf.getvalue())

    outfit.selfie_path = selfie_path
    db.add(outfit)
    db.commit()

    storage.delete(old_selfie_path)

    return _load_outfit(outfit_id, db)
