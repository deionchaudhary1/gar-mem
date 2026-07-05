import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import (
    clear_session_cookie,
    get_current_user,
    hash_password,
    set_session_cookie,
    verify_password,
)
from ..database import get_db
from ..storage import storage

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_SIZE = 256


@router.post("/signup", response_model=schemas.User, status_code=201)
def signup(payload: schemas.SignupIn, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="invalid email")

    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="username taken")
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=409, detail="email taken")

    user = models.User(
        email=email,
        username=payload.username,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=schemas.User)
def login(payload: schemas.LoginIn, response: Response, db: Session = Depends(get_db)):
    identifier = payload.identifier.strip().lower()
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == identifier) | (models.User.email == identifier)
        )
        .first()
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")

    set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    clear_session_cookie(response)
    return None


@router.get("/me", response_model=schemas.User)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=schemas.User)
def update_me(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if "bio" in payload.model_fields_set:
        current_user.bio = payload.bio
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=schemas.User)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="invalid image")

    if image.mode in ("RGBA", "P", "LA"):
        image = image.convert("RGB")

    # Center-crop to square, then downscale.
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((AVATAR_SIZE, AVATAR_SIZE))

    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=88)

    old_avatar = current_user.avatar_path
    current_user.avatar_path = storage.save(
        "avatars", f"{uuid.uuid4()}.jpg", buf.getvalue()
    )
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    storage.delete(old_avatar)
    return current_user
