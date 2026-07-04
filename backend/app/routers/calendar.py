from calendar import monthrange
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/", response_model=schemas.CalendarResponse)
def get_calendar(year: int, month: int, db: Session = Depends(get_db)):
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")

    start = date_type(year, month, 1)
    end = date_type(year, month, monthrange(year, month)[1])

    outfits = (
        db.query(models.Outfit)
        .options(joinedload(models.Outfit.items).joinedload(models.OutfitItem.garment))
        .filter(models.Outfit.date >= start, models.Outfit.date <= end)
        .order_by(models.Outfit.created_at.desc(), models.Outfit.id.desc())
        .all()
    )

    by_day = {}
    for outfit in outfits:
        if outfit.date not in by_day:
            by_day[outfit.date] = outfit

    days = []
    for day_date, outfit in sorted(by_day.items()):
        preview_paths = [item.garment.image_path for item in outfit.items[:4]]
        days.append(
            schemas.CalendarDay(
                date=day_date,
                outfit_id=outfit.id,
                has_selfie=bool(outfit.selfie_path),
                preview_paths=preview_paths,
            )
        )

    return schemas.CalendarResponse(year=year, month=month, days=days)
