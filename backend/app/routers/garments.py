import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..bg_remover import remove_background
from ..database import get_db
from ..storage import storage

router = APIRouter(prefix="/api/garments", tags=["garments"])

VALID_CATEGORIES = {"headwear", "tops", "pants", "shoes"}


def _get_owned_garment(
    garment_id: int, db: Session, current_user: models.User
) -> models.Garment:
    # Other users' garments 404 (not 403) so ids don't leak existence.
    garment = (
        db.query(models.Garment)
        .filter(
            models.Garment.id == garment_id,
            models.Garment.user_id == current_user.id,
        )
        .first()
    )
    if garment is None:
        raise HTTPException(status_code=404, detail="garment not found")
    return garment


@router.post("/", response_model=schemas.Garment, status_code=201)
async def create_garment(
    file: UploadFile = File(...),
    category: str = Form(...),
    name: str = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
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

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    image_path = storage.save("garments", f"{uuid.uuid4()}.png", buf.getvalue())

    garment = models.Garment(
        user_id=current_user.id,
        name=name,
        category=category,
        image_path=image_path,
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


@router.get("/", response_model=list[schemas.Garment])
def list_garments(
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"invalid category: {category}")

    query = db.query(models.Garment).filter(
        models.Garment.user_id == current_user.id
    )
    if category is not None:
        query = query.filter(models.Garment.category == category)
    query = query.order_by(models.Garment.created_at.desc(), models.Garment.id.desc())
    return query.all()


@router.get("/browse", response_model=schemas.GarmentPage)
def browse_garments(
    category: str | None = None,
    q: str = Query(default="", max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if category is not None and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="invalid category")
    query = db.query(models.Garment).filter(models.Garment.user_id == current_user.id)
    aliases = {"shirt": "tops", "shirts": "tops", "top": "tops", "hat": "headwear",
               "hats": "headwear", "cap": "headwear", "shoe": "shoes", "trousers": "pants"}
    for token in q.lower().split():
        category_token = aliases.get(token, token)
        query = query.filter(or_(
            func.lower(models.Garment.name).contains(token, autoescape=True),
            models.Garment.category == category_token,
        ))
    counts = dict(query.with_entities(models.Garment.category, func.count(models.Garment.id))
                  .group_by(models.Garment.category).all())
    if category is not None:
        query = query.filter(models.Garment.category == category)
    total = query.count()
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    rows = (query.order_by(models.Garment.created_at.desc(), models.Garment.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    return {
        "items": [schemas.GarmentPreview(
            **schemas.Garment.model_validate(row).model_dump(),
            thumbnail_path=f"/api/garments/{row.id}/thumbnail",
        ) for row in rows],
        "total": total, "pages": pages, "page": page, "page_size": page_size,
        "counts": {cat: counts.get(cat, 0) for cat in sorted(VALID_CATEGORIES)},
    }


@router.get("/{garment_id}/thumbnail")
def garment_thumbnail(
    garment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    garment = _get_owned_garment(garment_id, db, current_user)
    try:
        data = storage.thumbnail(garment.image_path)
    except (OSError, ValueError):
        raise HTTPException(status_code=404, detail="image not found")
    # Revalidate ownership on every request; no shared/proxy caching of private media.
    return Response(data, media_type="image/webp", headers={"Cache-Control": "private, no-cache"})


@router.get("/{garment_id}", response_model=schemas.Garment)
def get_garment(
    garment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_owned_garment(garment_id, db, current_user)


@router.delete("/{garment_id}", status_code=204)
def delete_garment(
    garment_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    garment = _get_owned_garment(garment_id, db, current_user)

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

    db.query(models.OutfitItem).filter(
        models.OutfitItem.garment_id == garment_id
    ).delete()

    storage.delete(garment.image_path)

    db.delete(garment)
    db.commit()
    return None
