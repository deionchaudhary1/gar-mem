"""baseline: single-user schema (garments, outfits, outfit_items)

Revision ID: 0001
Revises:
Create Date: 2026-07-05

Matches the schema that Base.metadata.create_all produced before Alembic was
introduced. Pre-existing databases are stamped at this revision by
app.migrations.run_migrations instead of re-running it.
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "garments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("image_path", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_garments_id", "garments", ["id"])
    op.create_index("ix_garments_category", "garments", ["category"])

    op.create_table(
        "outfits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("selfie_path", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_outfits_id", "outfits", ["id"])
    op.create_index("ix_outfits_date", "outfits", ["date"])

    op.create_table(
        "outfit_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("outfit_id", sa.Integer(), sa.ForeignKey("outfits.id"), nullable=False),
        sa.Column("garment_id", sa.Integer(), sa.ForeignKey("garments.id"), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False),
        sa.Column("position_y", sa.Float(), nullable=False),
        sa.Column("scale", sa.Float(), nullable=False),
    )
    op.create_index("ix_outfit_items_id", "outfit_items", ["id"])


def downgrade() -> None:
    op.drop_table("outfit_items")
    op.drop_table("outfits")
    op.drop_table("garments")
