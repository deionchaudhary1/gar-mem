"""No-login, single-user local app. Never expose this entry point publicly."""
from contextlib import asynccontextmanager
from pathlib import Path
import shutil

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from . import models, schemas, storage as storage_module
from .auth import get_current_user
from .database import Base, get_db

# Isolate both database and uploaded media from the authenticated application.
root = Path(__file__).resolve().parents[1] / '.local-testing'
uploads = root / 'uploads'
for category in ('garments', 'outfits'):
    (uploads / category).mkdir(parents=True, exist_ok=True)
storage_module.BACKEND_DIR = str(root)
storage_module.UPLOADS_DIR = str(uploads)

from .routers import garments, outfits, calendar

engine = create_engine(f'sqlite:///{root / "closet.db"}', connect_args={'check_same_thread': False})
factory = sessionmaker(bind=engine)


def testing_db():
    with factory() as db:
        yield db


def testing_user(db: Session = Depends(get_db)):
    user = db.get(models.User, 1)
    user.local_testing = True
    return user


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with factory() as db:
        if db.get(models.User, 1) is None:
            db.add(models.User(id=1, username='local_testing', email='local@testing.invalid', password_hash='!'))
            fixtures = Path(__file__).resolve().parents[1] / 'tests' / 'fixtures' / 'garments'
            for category, name, filename in [
                ('headwear', 'Brown cap', 'shopping.webp'),
                ('tops', 'Pink T-shirt', 'goods_481004_sub14_3x4.avif'),
                ('pants', 'Light blue jeans', 'goods_487742_sub14_3x4.avif'),
                ('shoes', 'Cream sneakers', 's-l1200.jpg'),
            ]:
                if (fixtures / filename).exists():
                    shutil.copyfile(fixtures / filename, uploads / 'garments' / filename)
                    db.add(models.Garment(user_id=1, name=name, category=category, image_path=f'/uploads/garments/{filename}'))
            db.commit()
    yield


app = FastAPI(title='Garment Memory — local testing (no authentication)', lifespan=lifespan)
app.dependency_overrides[get_db] = testing_db
app.dependency_overrides[get_current_user] = testing_user


@app.get('/api/auth/me', response_model=schemas.User)
def me(user=Depends(get_current_user)):
    return user


for router in (garments.router, outfits.router, calendar.router):
    app.include_router(router)
app.mount('/uploads', StaticFiles(directory=str(uploads)), name='uploads')
