"""Run: cd backend && python3 -m unittest discover -s tests -v."""
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.auth import create_session_token
from app.database import Base, get_db
from app.routers import garments
from app.storage import LocalStorage


class WardrobeTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        factory = sessionmaker(bind=self.engine)
        with factory() as db:
            db.add_all([models.User(id=i, username=f"user{i}", email=f"u{i}@example.com", password_hash="!") for i in (1, 2)])
            db.add_all([models.Garment(user_id=1, name=f"Blue linen {i}", category="tops", image_path="/uploads/garments/test.png") for i in range(101)])
            db.add(models.Garment(user_id=1, name="100% cotton", category="pants", image_path="/uploads/garments/test.png"))
            db.add(models.Garment(id=500, user_id=2, name="Private piece", category="tops", image_path="/uploads/garments/private.png"))
            db.commit()
        def get_test_db():
            with factory() as db:
                yield db
        app = FastAPI()
        app.include_router(garments.router)
        app.dependency_overrides[get_db] = get_test_db
        self.client = TestClient(app)
        self.client.cookies.set("gm_session", create_session_token(1))

    def tearDown(self):
        self.client.close()
        self.engine.dispose()

    def test_pagination_complete_unique_stable(self):
        ids = []
        for page in range(1, 10):
            response = self.client.get(f"/api/garments/browse?category=tops&page={page}&page_size=12")
            self.assertEqual(response.status_code, 200)
            result = response.json()
            self.assertEqual(result["total"], 101)
            self.assertEqual(result["pages"], 9)
            self.assertLessEqual(len(result["items"]), 12)
            self.assertEqual(result["counts"]["pants"], 1)
            ids.extend(row["id"] for row in result["items"])
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 101)
        self.assertNotIn(500, ids)

    def test_search_name_category_alias_and_literal_wildcard(self):
        self.assertEqual(self.client.get('/api/garments/browse?q=BLUE%20shirts').json()["total"], 101)
        self.assertEqual(self.client.get('/api/garments/browse', params={"q": "%"}).json()["total"], 1)
        self.assertEqual(self.client.get('/api/garments/browse?q=private').json()["total"], 0)

    def test_empty_and_out_of_range(self):
        empty = self.client.get('/api/garments/browse?category=shoes&page=999').json()
        self.assertEqual((empty["page"], empty["pages"], empty["items"]), (1, 1, []))
        last = self.client.get('/api/garments/browse?category=tops&page=999').json()
        self.assertEqual((last["page"], len(last["items"])), (9, 5))

    def test_validation_and_auth(self):
        for query in ('page=0', 'page_size=25', 'page_size=-1'):
            self.assertEqual(self.client.get('/api/garments/browse?' + query).status_code, 422)
        self.assertEqual(self.client.get('/api/garments/browse?category=invalid').status_code, 400)
        self.client.cookies.clear()
        self.assertEqual(self.client.get('/api/garments/browse').status_code, 401)

    def test_thumbnail_is_owner_scoped(self):
        with patch.object(garments.storage, 'thumbnail', return_value=b'webp') as thumbnail:
            own = self.client.get('/api/garments/1/thumbnail')
            self.assertEqual(own.status_code, 200)
            self.assertEqual(own.headers['content-type'], 'image/webp')
            self.assertEqual(self.client.get('/api/garments/500/thumbnail').status_code, 404)
            thumbnail.assert_called_once()

    def test_thumbnail_resize_and_path_boundary(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'uploads').mkdir()
            Image.new('RGBA', (1200, 800), (20, 80, 150, 128)).save(root / 'uploads/test.png')
            with patch('app.storage.BACKEND_DIR', str(root)), patch('app.storage.UPLOADS_DIR', str(root / 'uploads')):
                result = Image.open(io.BytesIO(LocalStorage().thumbnail('/uploads/test.png')))
                self.assertLessEqual(max(result.size), 320)
                self.assertEqual(result.mode, 'RGBA')
                with self.assertRaises(FileNotFoundError):
                    LocalStorage().thumbnail('/uploads/../../outside.png')


if __name__ == '__main__':
    unittest.main()
