from datetime import datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Garment(Base):
    __tablename__ = "garments"

    id = Column(Integer, primary_key=True, index=True)
    # NOTE: user_id FKs on the three legacy tables are app-enforced only; the
    # pre-multiuser sqlite schema has no DB-level constraint there.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    image_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    outfit_items = relationship(
        "OutfitItem", back_populates="garment", cascade="all, delete-orphan"
    )


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    note = Column(String, nullable=True)
    selfie_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
    items = relationship(
        "OutfitItem",
        back_populates="outfit",
        cascade="all, delete-orphan",
        order_by="OutfitItem.id",
    )


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    outfit_id = Column(Integer, ForeignKey("outfits.id"), nullable=False)
    garment_id = Column(Integer, ForeignKey("garments.id"), nullable=False)
    position_x = Column(Float, default=0.5, nullable=False)
    position_y = Column(Float, default=0.5, nullable=False)
    scale = Column(Float, default=1.0, nullable=False)

    outfit = relationship("Outfit", back_populates="items")
    garment = relationship("Garment", back_populates="outfit_items")
