from datetime import date as date_type
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- User ----------


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    local_testing: bool = False
    avatar_path: Optional[str] = None
    email: str
    created_at: datetime


class SignupIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    username: str = Field(pattern=r"^[a-z0-9_]{3,20}$")
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    identifier: str
    password: str = Field(max_length=72)


# ---------- Garment ----------


class GarmentBase(BaseModel):
    name: str
    category: str


class Garment(GarmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    image_path: str
    created_at: datetime


class GarmentPreview(Garment):
    thumbnail_path: str


class GarmentPage(BaseModel):
    items: List[GarmentPreview]
    total: int
    page: int
    page_size: int
    pages: int
    counts: dict[str, int]


# ---------- OutfitItem ----------


class OutfitItemCreate(BaseModel):
    garment_id: int
    position_x: float = 0.5
    position_y: float = 0.5
    scale: float = 1.0


class OutfitItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    garment_id: int
    position_x: float
    position_y: float
    scale: float
    garment: Garment


# ---------- Outfit ----------


class OutfitCreate(BaseModel):
    date: date_type
    note: Optional[str] = None
    items: List[OutfitItemCreate]


class OutfitUpdate(BaseModel):
    note: Optional[str] = None


class Outfit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date_type
    note: Optional[str] = None
    selfie_path: Optional[str] = None
    created_at: datetime
    items: List[OutfitItem]


# ---------- Calendar ----------

class OutfitPage(BaseModel):
    items: List[Outfit]
    total: int
    page: int
    pages: int



class CalendarDay(BaseModel):
    date: date_type
    outfit_id: int
    has_selfie: bool
    preview_paths: List[str]


class CalendarResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDay]
