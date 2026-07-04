import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client.js'
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js'
import { useToast } from '../context/ToastContext.jsx'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [category, setCategory] = useState('tops')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const showToast = useToast()

  const pickFile = (f) => {
    if (!f) return
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
        <h1 className="page-title">Add a Piece</h1>
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
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="dropzone__preview" />
          ) : (
            <div className="dropzone__hint">
              <span className="dropzone__title">Drop an image here</span>
              <span className="dropzone__sub">or click to browse</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

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
            placeholder="White tee"
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
      </form>
    </div>
  )
}
