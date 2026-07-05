from datetime import date as date_type
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- User ----------


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    avatar_path: Optional[str] = None
    bio: Optional[str] = None


class User(UserBrief):
    email: str
    created_at: datetime


class SignupIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    username: str = Field(pattern=r"^[a-z0-9_]{3,20}$")
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    identifier: str
    password: str = Field(max_length=72)


class ProfileUpdate(BaseModel):
    bio: Optional[str] = Field(default=None, max_length=280)


# ---------- Garment ----------


class GarmentBase(BaseModel):
    name: str
    category: str


class Garment(GarmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    image_path: str
    is_public: bool
    created_at: datetime


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
    is_public: bool = False
    items: List[OutfitItemCreate]


class OutfitUpdate(BaseModel):
    note: Optional[str] = None
    is_public: Optional[bool] = None


class Outfit(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    date: date_type
    note: Optional[str] = None
    selfie_path: Optional[str] = None
    is_public: bool
    created_at: datetime
    items: List[OutfitItem]


class FeedOutfit(Outfit):
    user: UserBrief
    like_count: int
    comment_count: int
    liked_by_me: bool


class FeedPage(BaseModel):
    items: List[FeedOutfit]
    page: int
    has_more: bool


# ---------- Social ----------


class ProfileResponse(BaseModel):
    user: UserBrief
    followers: int
    following: int
    outfit_count: int
    is_following: bool
    is_me: bool


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class Comment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    outfit_id: int
    text: str
    created_at: datetime
    user: UserBrief


# ---------- Calendar ----------


class CalendarDay(BaseModel):
    date: date_type
    outfit_id: int
    has_selfie: bool
    preview_paths: List[str]


class CalendarResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDay]
