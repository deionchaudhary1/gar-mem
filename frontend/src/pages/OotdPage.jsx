import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import client from '../api/client.js'
import DraggableGarment from '../components/DraggableGarment.jsx'
import OutfitCanvas from '../components/OutfitCanvas.jsx'
import { CATEGORIES, CATEGORY_LABELS } from '../constants.js'
import { todayISO } from '../utils/date.js'
import { useToast } from '../context/ToastContext.jsx'

const clamp01 = (v) => Math.min(1, Math.max(0, v))

let keyCounter = 0
const nextKey = () => `item-${++keyCounter}`

export default function OotdPage() {
  const [garments, setGarments] = useState([])
  const [items, setItems] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef(null)
  const showToast = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  useEffect(() => {
    client
      .get('/garments/')
      .then((res) => setGarments(res.data))
      .catch(() => showToast('Could not load your closet'))
  }, [showToast])

  const grouped = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        category: cat,
        items: garments.filter((g) => g.category === cat),
      })),
    [garments],
  )

  const handleDragEnd = (event) => {
    const { active, over, delta } = event
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const type = active.data.current?.type

    if (type === 'sidebar') {
      if (over?.id !== 'canvas') return
      const translated = active.rect.current.translated
      const cx = translated.left + translated.width / 2
      const cy = translated.top + translated.height / 2
      const x = clamp01((cx - rect.left) / rect.width)
      const y = clamp01((cy - rect.top) / rect.height)
      const key = nextKey()
      setItems((prev) => [
        ...prev,
        {
          key,
          garment: active.data.current.garment,
          position_x: x,
          position_y: y,
          scale: 1,
        },
      ])
      setSelectedKey(key)
    } else if (type === 'canvas-item') {
      const key = active.data.current.key
      setItems((prev) =>
        prev.map((it) =>
          it.key === key
            ? {
                ...it,
                position_x: clamp01(it.position_x + delta.x / rect.width),
                position_y: clamp01(it.position_y + delta.y / rect.height),
              }
            : it,
        ),
      )
    }
  }

  const scaleItem = (key, d) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, scale: Math.min(2.5, Math.max(0.3, +(it.scale + d).toFixed(2))) }
          : it,
      ),
    )

  const setItemScale = (key, scale) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, scale: Math.min(2.5, Math.max(0.3, +scale.toFixed(2))) }
          : it,
      ),
    )

  const removeItem = (key) => {
    setItems((prev) => prev.filter((it) => it.key !== key))
    setSelectedKey((k) => (k === key ? null : k))
  }

  const pickSelfie = (f) => {
    if (!f) return
    setSelfie(f)
    setSelfiePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }

  const clearAll = () => {
    setItems([])
    setSelectedKey(null)
    setNote('')
    setSelfie(null)
    setIsPublic(false)
    setSelfiePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const save = async () => {
    if (items.length === 0 || saving) return
    setSaving(true)
    try {
      const body = {
        date,
        note: note.trim() ? note.trim() : null,
        items: items.map((it) => ({
          garment_id: it.garment.id,
          position_x: it.position_x,
          position_y: it.position_y,
          scale: it.scale,
        })),
        is_public: isPublic,
      }
      const res = await client.post('/outfits/', body)
      if (selfie) {
        const form = new FormData()
        form.append('file', selfie)
        await client.post(`/outfits/${res.data.id}/selfie`, form)
      }
      showToast('Outfit saved')
      clearAll()
    } catch {
      showToast('Could not save outfit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">Build a Look</h1>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="ootd">
          <aside className="ootd__sidebar">
            {grouped.map((group) => (
              <div key={group.category} className="ootd__group">
                <h2 className="section-label">{CATEGORY_LABELS[group.category]}</h2>
                {group.items.length === 0 ? (
                  <p className="ootd__group-empty">—</p>
                ) : (
                  <div className="ootd__group-grid">
                    {group.items.map((g) => (
                      <DraggableGarment key={g.id} garment={g} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          <div className="ootd__stage">
            <OutfitCanvas
              items={items}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onScale={scaleItem}
              onSetScale={setItemScale}
              onRemove={removeItem}
              canvasRef={canvasRef}
            />

            <div className="ootd__meta">
              <div className="field">
                <label className="section-label" htmlFor="date">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  className="text-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="section-label" htmlFor="note">
                  What&apos;s the story?
                </label>
                <textarea
                  id="note"
                  className="text-input textarea"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="field">
                <span className="section-label">Selfie (optional)</span>
                <label className="file-line">
                  <input
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={(e) => pickSelfie(e.target.files?.[0])}
                  />
                  <span className="btn btn--secondary">Choose photo</span>
                  {selfiePreview && (
                    <img className="selfie-thumb" src={selfiePreview} alt="Selfie preview" />
                  )}
                </label>
              </div>

              <label className="share-toggle">
                <input
                  type="checkbox"
                  className="visually-hidden"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span
                  className={`share-toggle__pill${isPublic ? ' share-toggle__pill--active' : ''}`}
                >
                  {isPublic ? 'Shared to feed' : 'Share to feed'}
                </span>
              </label>

              <button
                type="button"
                className="btn btn--primary"
                onClick={save}
                disabled={items.length === 0 || saving}
              >
                {saving ? 'Saving…' : 'Save outfit'}
              </button>
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  )
}
