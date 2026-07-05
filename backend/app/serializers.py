"""Builders for outfit payloads that carry social counts.

Kept central so every surface (outfit detail, feed, profiles) computes
like/comment counts and `liked_by_me` the same way, in batched queries.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def feed_outfits(
    outfits: list[models.Outfit], viewer_id: int, db: Session
) -> list[schemas.FeedOutfit]:
    """Serialize outfits (items+garments+user already loaded) as FeedOutfit."""
    if not outfits:
        return []
    ids = [o.id for o in outfits]

    like_counts = dict(
        db.query(models.Like.outfit_id, func.count())
        .filter(models.Like.outfit_id.in_(ids))
        .group_by(models.Like.outfit_id)
        .all()
    )
    comment_counts = dict(
        db.query(models.Comment.outfit_id, func.count())
        .filter(models.Comment.outfit_id.in_(ids))
        .group_by(models.Comment.outfit_id)
        .all()
    )
    liked = {
        outfit_id
        for (outfit_id,) in db.query(models.Like.outfit_id).filter(
            models.Like.outfit_id.in_(ids), models.Like.user_id == viewer_id
        )
    }

    return [
        schemas.FeedOutfit(
            **schemas.Outfit.model_validate(o).model_dump(),
            user=schemas.UserBrief.model_validate(o.user),
            like_count=like_counts.get(o.id, 0),
            comment_count=comment_counts.get(o.id, 0),
            liked_by_me=o.id in liked,
        )
        for o in outfits
    ]


def feed_outfit(
    outfit: models.Outfit, viewer_id: int, db: Session
) -> schemas.FeedOutfit:
    return feed_outfits([outfit], viewer_id, db)[0]
