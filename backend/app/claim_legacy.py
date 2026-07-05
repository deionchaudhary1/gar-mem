"""Claim the seeded `legacy` account (owner of pre-multiuser data).

The 0002 migration assigns all pre-existing garments/outfits to a locked user
with id 1. Run this once to make that account yours:

    cd backend
    python3 -m app.claim_legacy <username> <email> <password>
"""

import sys

from .auth import hash_password
from .database import SessionLocal
from .migrations import run_migrations
from . import models


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: python3 -m app.claim_legacy <username> <email> <password>")
        raise SystemExit(1)
    username, email, password = sys.argv[1], sys.argv[2].lower(), sys.argv[3]

    run_migrations()
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == 1).first()
        if user is None:
            print("no legacy user (id 1) exists — nothing to claim")
            raise SystemExit(1)

        taken = (
            db.query(models.User)
            .filter(
                models.User.id != 1,
                (models.User.username == username) | (models.User.email == email),
            )
            .first()
        )
        if taken:
            print("username or email already in use by another account")
            raise SystemExit(1)

        user.username = username
        user.email = email
        user.password_hash = hash_password(password)
        db.commit()
        print(f"done — log in as '{username}' to access the pre-migration data")
    finally:
        db.close()


if __name__ == "__main__":
    main()
