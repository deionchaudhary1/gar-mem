"""multi-user: users/follows/likes/comments + visibility columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-05

Also seeds a locked "legacy" user (id 1, unusable password hash) when the
database already holds pre-multiuser rows, which were all written with
user_id=1. Log in is impossible for it until a password reset flow exists;
its data stays reachable by updating the row manually if ever needed.

The three legacy tables keep app-enforced (not DB-level) user_id FKs — adding
FKs to populated sqlite tables needs a full table rebuild for little gain.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("avatar_path", sa.String(), nullable=True),
        sa.Column("bio", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "follows",
        sa.Column("follower_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("followee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("follower_id", "followee_id"),
    )
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])

    op.create_table(
        "likes",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("outfit_id", sa.Integer(), sa.ForeignKey("outfits.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "outfit_id"),
    )
    op.create_index("ix_likes_outfit_id", "likes", ["outfit_id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("outfit_id", sa.Integer(), sa.ForeignKey("outfits.id"), nullable=False),
        sa.Column("text", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_comments_id", "comments", ["id"])
    op.create_index("ix_comments_outfit_id", "comments", ["outfit_id"])

    with op.batch_alter_table("garments") as batch_op:
        batch_op.add_column(
            sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    with op.batch_alter_table("outfits") as batch_op:
        batch_op.add_column(
            sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    op.create_index("ix_outfits_is_public", "outfits", ["is_public"])
    op.create_index("ix_garments_user_id", "garments", ["user_id"])
    op.create_index("ix_outfits_user_id", "outfits", ["user_id"])

    # Seed an owner for pre-multiuser rows (all written with user_id=1).
    conn = op.get_bind()
    legacy_rows = conn.execute(
        sa.text("SELECT (SELECT COUNT(*) FROM garments) + (SELECT COUNT(*) FROM outfits)")
    ).scalar()
    if legacy_rows:
        conn.execute(
            sa.text(
                "INSERT INTO users (id, email, username, password_hash, created_at) "
                "VALUES (1, 'legacy@local', 'legacy', '!', CURRENT_TIMESTAMP)"
            )
        )


def downgrade() -> None:
    op.drop_index("ix_outfits_user_id", table_name="outfits")
    op.drop_index("ix_garments_user_id", table_name="garments")
    op.drop_index("ix_outfits_is_public", table_name="outfits")
    with op.batch_alter_table("outfits") as batch_op:
        batch_op.drop_column("is_public")
    with op.batch_alter_table("garments") as batch_op:
        batch_op.drop_column("is_public")
    op.drop_table("comments")
    op.drop_table("likes")
    op.drop_table("follows")
    op.drop_table("users")
