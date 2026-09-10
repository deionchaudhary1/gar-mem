# Real-photo closet fixtures

These four original, unmodified files were supplied by the repository owner for
layout testing. They are test inputs, not production seed data or app artwork.
No license or redistribution rights beyond that permission are asserted here.

| File | Category | Layout case |
| --- | --- | --- |
| goods_481004_sub14_3x4.avif | Shirts | Portrait product photo with substantial margins |
| goods_487742_sub14_3x4.avif | Pants | Tall garment, photo background and embedded text |
| shopping.webp | Headwear | Wide close-cropped product photo |
| s-l1200.jpg | Shoes | Landscape photo with white margins |

From `backend`, run:

```sh
WARDROBE_REAL_PHOTOS=1 python3 -m uvicorn tests.preview_app:app --port 8011
```

From `frontend`, run:

```sh
API_PROXY_TARGET=http://127.0.0.1:8011 npm run dev -- --port 5174
node tests/wardrobe-photos.mjs
```

The browser test requires Playwright (or `PLAYWRIGHT_MODULE` pointing to an
existing installation) and its browser (`CHROMIUM_PATH` can override it).
Preview login: `preview` / `preview-pass`. Each category repeats its photo 101
times to exercise paging. This mode deliberately skips background removal so
the layout is tested with untouched photos. Omitting `WARDROBE_REAL_PHOTOS`
keeps the transparent synthetic fixtures. Neither mode touches the real closet.
