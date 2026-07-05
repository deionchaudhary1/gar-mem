"""Social endpoints: follows, profiles, feed, likes, comments.

Implemented against .frugal-fable/social/contract-v2.md. All endpoints require
auth and must respect the privacy invariants in the contract (public-only in
SQL, 404 on ownership failures).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..serializers import feed_outfits

router = APIRouter(prefix="/api/social", tags=["social"])

# Match routers/outfits.py: eager-load items+garment and the outfit's user so
# serializers.feed_outfits has everything it needs without lazy loads.
ITEMS_QUERY_OPTS = joinedload(models.Outfit.items).joinedload(models.OutfitItem.garment)

MAX_PER_PAGE = 50
FOLLOW_LIST_CAP = 100


def _clamp_page(page: int) -> int:
    return page if page >= 1 else 1


def _clamp_per_page(per_page: int) -> int:
    if per_page < 1:
        return 1
    return min(per_page, MAX_PER_PAGE)


def _get_user_or_404(username: str, db: Session) -> models.User:
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return user


def _public_outfits_page(
    query, page: int, per_page: int, viewer_id: int, db: Session
) -> schemas.FeedPage:
    """Run a public-outfit query with page+1 fetch to compute has_more."""
    query = query.order_by(
        models.Outfit.created_at.desc(), models.Outfit.id.desc()
    )
    offset = (page - 1) * per_page
    rows = query.offset(offset).limit(per_page + 1).all()
    has_more = len(rows) > per_page
    rows = rows[:per_page]
    return schemas.FeedPage(
        items=feed_outfits(rows, viewer_id, db),
        page=page,
        has_more=has_more,
    )


def _visible_outfit_or_404(
    outfit_id: int, db: Session, current_user: models.User
) -> models.Outfit:
    """Outfit is visible for like/comment if public OR owned by viewer.

    is_public is enforced in SQL; the owner exception is an explicit OR. Anything
    else 404s so ids don't leak existence.
    """
    outfit = (
        db.query(models.Outfit)
        .filter(
            models.Outfit.id == outfit_id,
            (models.Outfit.is_public == True)  # noqa: E712
            | (models.Outfit.user_id == current_user.id),
        )
        .first()
    )
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")
    return outfit


# ---------- Follows ----------


@router.post("/follow/{username}", status_code=204)
def follow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = _get_user_or_404(username, db)
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="cannot follow yourself")

    existing = (
        db.query(models.Follow)
        .filter(
            models.Follow.follower_id == current_user.id,
            models.Follow.followee_id == target.id,
        )
        .first()
    )
    if existing is None:
        db.add(models.Follow(follower_id=current_user.id, followee_id=target.id))
        db.commit()
    return None


@router.delete("/follow/{username}", status_code=204)
def unfollow_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = _get_user_or_404(username, db)
    (
        db.query(models.Follow)
        .filter(
            models.Follow.follower_id == current_user.id,
            models.Follow.followee_id == target.id,
        )
        .delete()
    )
    db.commit()
    return None


# ---------- Profiles ----------


@router.get("/users/{username}", response_model=schemas.ProfileResponse)
def get_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)

    followers = (
        db.query(func.count())
        .select_from(models.Follow)
        .filter(models.Follow.followee_id == user.id)
        .scalar()
    )
    following = (
        db.query(func.count())
        .select_from(models.Follow)
        .filter(models.Follow.follower_id == user.id)
        .scalar()
    )
    outfit_count = (
        db.query(func.count())
        .select_from(models.Outfit)
        .filter(
            models.Outfit.user_id == user.id,
            models.Outfit.is_public == True,  # noqa: E712
        )
        .scalar()
    )
    is_me = user.id == current_user.id
    is_following = False
    if not is_me:
        is_following = (
            db.query(models.Follow)
            .filter(
                models.Follow.follower_id == current_user.id,
                models.Follow.followee_id == user.id,
            )
            .first()
            is not None
        )

    return schemas.ProfileResponse(
        user=schemas.UserBrief.model_validate(user),
        followers=followers,
        following=following,
        outfit_count=outfit_count,
        is_following=is_following,
        is_me=is_me,
    )


@router.get("/users/{username}/outfits", response_model=schemas.FeedPage)
def get_user_outfits(
    username: str,
    page: int = Query(1),
    per_page: int = Query(12),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    page = _clamp_page(page)
    per_page = _clamp_per_page(per_page)

    # Public-only in SQL, even for the owner viewing their own profile.
    query = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS, joinedload(models.Outfit.user))
        .filter(
            models.Outfit.user_id == user.id,
            models.Outfit.is_public == True,  # noqa: E712
        )
    )
    return _public_outfits_page(query, page, per_page, current_user.id, db)


@router.get("/users/{username}/followers", response_model=list[schemas.UserBrief])
def get_followers(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    rows = (
        db.query(models.User)
        .join(models.Follow, models.Follow.follower_id == models.User.id)
        .filter(models.Follow.followee_id == user.id)
        .order_by(models.Follow.created_at.desc())
        .limit(FOLLOW_LIST_CAP)
        .all()
    )
    return [schemas.UserBrief.model_validate(u) for u in rows]


@router.get("/users/{username}/following", response_model=list[schemas.UserBrief])
def get_following(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    rows = (
        db.query(models.User)
        .join(models.Follow, models.Follow.followee_id == models.User.id)
        .filter(models.Follow.follower_id == user.id)
        .order_by(models.Follow.created_at.desc())
        .limit(FOLLOW_LIST_CAP)
        .all()
    )
    return [schemas.UserBrief.model_validate(u) for u in rows]


# ---------- Feed ----------


@router.get("/feed", response_model=schemas.FeedPage)
def get_feed(
    scope: str = Query("following"),
    page: int = Query(1),
    per_page: int = Query(12),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if scope not in ("following", "global"):
        raise HTTPException(status_code=422, detail="invalid scope")

    page = _clamp_page(page)
    per_page = _clamp_per_page(per_page)

    query = (
        db.query(models.Outfit)
        .options(ITEMS_QUERY_OPTS, joinedload(models.Outfit.user))
        .filter(models.Outfit.is_public == True)  # noqa: E712
    )
    if scope == "following":
        followee_ids = db.query(models.Follow.followee_id).filter(
            models.Follow.follower_id == current_user.id
        )
        query = query.filter(models.Outfit.user_id.in_(followee_ids))

    return _public_outfits_page(query, page, per_page, current_user.id, db)


# ---------- Likes ----------


@router.post("/outfits/{outfit_id}/like", status_code=204)
def like_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _visible_outfit_or_404(outfit_id, db, current_user)
    existing = (
        db.query(models.Like)
        .filter(
            models.Like.user_id == current_user.id,
            models.Like.outfit_id == outfit.id,
        )
        .first()
    )
    if existing is None:
        db.add(models.Like(user_id=current_user.id, outfit_id=outfit.id))
        db.commit()
    return None


@router.delete("/outfits/{outfit_id}/like", status_code=204)
def unlike_outfit(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _visible_outfit_or_404(outfit_id, db, current_user)
    (
        db.query(models.Like)
        .filter(
            models.Like.user_id == current_user.id,
            models.Like.outfit_id == outfit.id,
        )
        .delete()
    )
    db.commit()
    return None


# ---------- Comments ----------


@router.get(
    "/outfits/{outfit_id}/comments", response_model=list[schemas.Comment]
)
def list_comments(
    outfit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _visible_outfit_or_404(outfit_id, db, current_user)
    rows = (
        db.query(models.Comment)
        .options(joinedload(models.Comment.user))
        .filter(models.Comment.outfit_id == outfit.id)
        .order_by(models.Comment.created_at.asc(), models.Comment.id.asc())
        .all()
    )
    return [schemas.Comment.model_validate(c) for c in rows]


@router.post(
    "/outfits/{outfit_id}/comments",
    response_model=schemas.Comment,
    status_code=201,
)
def create_comment(
    outfit_id: int,
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    outfit = _visible_outfit_or_404(outfit_id, db, current_user)
    comment = models.Comment(
        user_id=current_user.id,
        outfit_id=outfit.id,
        text=payload.text,
    )
    db.add(comment)
    db.commit()

    comment = (
        db.query(models.Comment)
        .options(joinedload(models.Comment.user))
        .filter(models.Comment.id == comment.id)
        .first()
    )
    return schemas.Comment.model_validate(comment)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    comment = (
        db.query(models.Comment)
        .filter(models.Comment.id == comment_id)
        .first()
    )
    if comment is None:
        raise HTTPException(status_code=404, detail="comment not found")

    # Allowed for comment author or the outfit's owner; anyone else 404s.
    if comment.user_id != current_user.id:
        outfit = (
            db.query(models.Outfit)
            .filter(models.Outfit.id == comment.outfit_id)
            .first()
        )
        if outfit is None or outfit.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="comment not found")

    db.delete(comment)
    db.commit()
    return None
