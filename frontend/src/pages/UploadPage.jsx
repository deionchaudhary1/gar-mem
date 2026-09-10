import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import client from '../api/client.js'
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js'
import { useToast } from '../context/ToastContext.jsx'

export default function UploadPage() {
  const [params] = useSearchParams()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [category, setCategory] = useState(() => CATEGORIES.includes(params.get('category')) ? params.get('category') : 'tops')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const showToast = useToast()

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pickFile = (f) => {
    if (!f || pending) return
    if (!f.type.startsWith('image/')) { showToast('Choose an image file'); return }
    setFile(f)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) pickFile(f)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!file || pending) return
    setPending(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      if (name.trim()) form.append('name', name.trim())
      await client.post('/garments/', form)
      showToast('Piece added to closet')
      navigate('/')
    } catch {
      showToast('Upload failed — try again')
      setPending(false)
    }
  }

  return (
    <div className="upload">
      <header className="page-head">
        <span className="eyebrow">02 / SOMETHING NEW</span>
        <h1 className="page-title">Meet your next staple.</h1>
        <p className="page-description">One photo is all you need. We’ll take care of the background.</p>
      </header>

      <form className="upload__form" onSubmit={onSubmit}>
        <div
          className={`dropzone${dragOver ? ' dropzone--over' : ''}${
            preview ? ' dropzone--has-image' : ''
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          aria-label="Choose a clothing photo"
          aria-disabled={pending}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!pending) inputRef.current?.click() }
          }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="dropzone__preview" />
          ) : (
            <div className="dropzone__hint">
              <span className="upload-symbol" aria-hidden="true">↥</span>
              <span className="dropzone__title">Drop an image here</span>
              <span className="dropzone__sub">or click to browse</span>
              <span className="upload-tip">A clear photo of one piece works best.</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            disabled={pending}
            className="visually-hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <div className="upload-details">
        <div><span className="eyebrow">MAKE IT AT HOME</span><h2 className="form-heading">A place in your closet.</h2></div>
        <div className="field">
          <span className="section-label">Category</span>
          <div className="radio-pills">
            {CATEGORIES.map((cat) => (
              <label
                key={cat}
                className={`radio-pill${category === cat ? ' radio-pill--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  disabled={pending}
                  onChange={() => setCategory(cat)}
                  className="visually-hidden"
                />
                {CATEGORY_LABELS[cat]}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="section-label" htmlFor="name">
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            className="text-input"
            disabled={pending}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {pending && (
          <p className="processing">
            Removing background… this can take a minute on the first upload.
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={!file || pending}
        >
          {pending ? 'Processing…' : 'Add to closet'}
        </button>
        <Link className="text-button" to="/">Back to closet</Link>
        </div>
      </form>
    </div>
  )
}
