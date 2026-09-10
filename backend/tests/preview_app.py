"""Isolated browser-test app. No migrations or reads/writes of the user's database.

Run from backend: python3 -m uvicorn tests.preview_app:app --port 8011
Synthetic database and uploads exist only for the lifetime of this process.
"""
import tempfile
import os
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, storage as storage_module
from app.auth import hash_password
from app.database import Base, get_db
from app.routers import auth, garments, outfits, calendar

temporary = tempfile.TemporaryDirectory(prefix='wardrobe-preview-')
root = Path(temporary.name)
uploads = root / 'uploads'
(uploads / 'garments').mkdir(parents=True)
(uploads / 'outfits').mkdir()
storage_module.BACKEND_DIR = str(root)
storage_module.UPLOADS_DIR = str(uploads)
engine = create_engine(f'sqlite:///{root / "preview.db"}', connect_args={'check_same_thread': False})
Base.metadata.create_all(engine)
factory = sessionmaker(bind=engine)

for category in ['headwear', 'tops', 'pants', 'shoes']:
    image = Image.new('RGBA', (400, 500))
    draw = ImageDraw.Draw(image)
    if category == 'tops':
        draw.polygon([(110,70),(155,55),(245,55),(290,70),(350,140),(290,175),(270,135),(270,420),(130,420),(130,135),(110,175),(50,140)], fill='#7499bd')
        draw.arc((155,25,245,100), 0, 180, fill='#e4edf5', width=10)
    elif category == 'pants':
        draw.polygon([(95,40),(305,40),(300,460),(220,460),(200,180),(180,460),(100,460)], fill='#486989')
        draw.line((100,70,300,70), fill='#c1cfda', width=5)
    elif category == 'headwear':
        draw.ellipse((90,120,290,310), fill='#8195aa')
        draw.ellipse((130,260,350,325), fill='#4e6983')
    else:
        draw.rounded_rectangle((50,190,350,300), radius=30, fill='#d9c6aa')
        draw.rectangle((55,280,345,305), fill='#f2eee7')
    image.save(uploads / 'garments' / f'{category}.png')

fixture_files = {
    'headwear': 'shopping.webp',
    'tops': 'goods_481004_sub14_3x4.avif',
    'pants': 'goods_487742_sub14_3x4.avif',
    'shoes': 's-l1200.jpg',
}
real_photos = os.environ.get('WARDROBE_REAL_PHOTOS') == '1'
if real_photos:
    for filename in fixture_files.values():
        shutil.copyfile(Path(__file__).parent / 'fixtures' / 'garments' / filename, uploads / 'garments' / filename)

with factory() as db:
    db.add(models.User(id=1, username='preview', email='preview@example.com', password_hash=hash_password('preview-pass')))
    for category in ['headwear', 'tops', 'pants', 'shoes']:
        for i in range(101):
            filename = fixture_files[category] if real_photos else f'{category}.png'
            db.add(models.Garment(user_id=1, name=f'Blue {category} {i + 1:03}', category=category, image_path=f'/uploads/garments/{filename}'))
    db.commit()

def test_db():
    with factory() as db:
        yield db

app = FastAPI()
app.dependency_overrides[get_db] = test_db
for router in (auth.router, garments.router, outfits.router, calendar.router):
    app.include_router(router)
app.mount('/uploads', StaticFiles(directory=str(uploads)), name='uploads')
