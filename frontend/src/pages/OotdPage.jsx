import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import client from '../api/client.js'
import { useSearchParams } from 'react-router-dom'
import CategoryRail from '../components/CategoryRail.jsx'
import OutfitCanvas from '../components/OutfitCanvas.jsx'
import {
  CATEGORIES,
  CATEGORY_ZONES,
  MAX_SCALE,
  MIN_SCALE,
  zoneBounds,
} from '../constants.js'
import { todayISO } from '../utils/date.js'
import { useToast } from '../context/ToastContext.jsx'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Clamp a piece's centre so its top and bottom edges stay inside its part.
const clampToZone = (category, y, scale) => clamp(y, ...zoneBounds(category, scale))

const emptySlots = () => ({ headwear: null, tops: null, pants: null, shoes: null })

const slotFor = (garment) => ({
  garment,
  position_x: 0.5,
  position_y: CATEGORY_ZONES[garment.category].y,
  scale: 1,
})

export default function OotdPage() {
  const [searchParams] = useSearchParams()
  const initialGarment = searchParams.get('garment')
  const [garments, setGarments] = useState([])
  const [slots, setSlots] = useState(emptySlots)
  const [selected, setSelected] = useState(null)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef(null)
  const showToast = useToast()

  useEffect(() => {
    if (!initialGarment) return
    const controller = new AbortController()
    client.get(`/garments/${initialGarment}`, { signal: controller.signal }).then(({ data }) => {
      if (!CATEGORIES.includes(data.category)) return
      setSlots(prev => ({ ...prev, [data.category]: slotFor(data) }))
      setSelected(data.category)
    }).catch(() => { if (!controller.signal.aborted) showToast('That piece is no longer available') })
    return () => controller.abort()
  }, [initialGarment, showToast])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  useEffect(() => {
    client
      .get('/garments/')
      .then((res) => setGarments(res.data))
      .catch(() => showToast('Could not load your closet'))
  }, [showToast])

  const byCategory = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((cat) => [cat, garments.filter((g) => g.category === cat)]),
      ),
    [garments],
  )

  // One piece per slot: clicking the piece already worn takes it off again.
  const pickGarment = (garment) => {
    const category = garment.category
    const isWorn = slots[category]?.garment.id === garment.id
    setSlots((prev) => ({ ...prev, [category]: isWorn ? null : slotFor(garment) }))
    setSelected(isWorn ? null : category)
  }

  const rollCategory = (category) => {
    const pool = byCategory[category] ?? []
    if (pool.length === 0) return
    // With more than one option, never roll the piece already in the slot.
    const wornId = slots[category]?.garment.id
    const choices = pool.length > 1 ? pool.filter((g) => g.id !== wornId) : pool
    const pick = choices[Math.floor(Math.random() * choices.length)]
    setSlots((prev) => ({ ...prev, [category]: slotFor(pick) }))
    setSelected(category)
  }

  const rollAll = () => {
    const next = emptySlots()
    let any = false
    for (const category of CATEGORIES) {
      const pool = byCategory[category] ?? []
      if (pool.length === 0) continue
      next[category] = slotFor(pool[Math.floor(Math.random() * pool.length)])
      any = true
    }
    if (!any) {
      showToast('Add some pieces to your closet first')
      return
    }
    setSlots(next)
    setSelected(null)
  }

  const handleDragEnd = ({ active, delta }) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const category = active.data.current?.category
    if (!category) return
    setSlots((prev) => {
      const slot = prev[category]
      if (!slot) return prev
      return {
        ...prev,
        [category]: {
          ...slot,
          position_x: clamp(slot.position_x + delta.x / rect.width, 0, 1),
          position_y: clampToZone(
            category,
            slot.position_y + delta.y / rect.height,
            slot.scale,
          ),
        },
      }
    })
  }

  const resize = (category, nextScale) =>
    setSlots((prev) => {
      const slot = prev[category]
      if (!slot) return prev
      const scale = clamp(+nextScale.toFixed(2), MIN_SCALE, MAX_SCALE)
      return {
        ...prev,
        // Growing a piece can push it past its part's edge, so re-clamp.
        [category]: { ...slot, scale, position_y: clampToZone(category, slot.position_y, scale) },
      }
    })

  const scaleSlot = (category, d) =>
    setSlots((prev) => {
      const slot = prev[category]
      if (!slot) return prev
      const scale = clamp(+(slot.scale + d).toFixed(2), MIN_SCALE, MAX_SCALE)
      return {
        ...prev,
        [category]: { ...slot, scale, position_y: clampToZone(category, slot.position_y, scale) },
      }
    })

  const setSlotScale = (category, scale) => resize(category, scale)

  const removeSlot = (category) => {
    setSlots((prev) => ({ ...prev, [category]: null }))
    setSelected((s) => (s === category ? null : s))
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
    setSlots(emptySlots())
    setSelected(null)
    setNote('')
    setSelfie(null)
    setSelfiePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const worn = CATEGORIES.map((c) => slots[c]).filter(Boolean)

  const save = async () => {
    if (worn.length === 0 || saving) return
    setSaving(true)
    try {
      const body = {
        date,
        note: note.trim() ? note.trim() : null,
        items: worn.map((slot) => ({
          garment_id: slot.garment.id,
          position_x: slot.position_x,
          position_y: slot.position_y,
          scale: slot.scale,
        })),
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
      <header className="page-head page-head--split">
        <div><h1 className="page-title">Put a look together</h1><p className="page-description">Pick from your closet. One piece, one place.</p></div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={rollAll}
          disabled={garments.length === 0}
        >
          Shuffle everything
        </button>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="ootd">
          <div className="ootd__rails">
            {CATEGORIES.map((category) => (
              <CategoryRail
                key={category}
                category={category}
                garments={byCategory[category] ?? []}
                activeId={slots[category]?.garment.id}
                onPick={pickGarment}
                onRoll={rollCategory}
              />
            ))}
          </div>

          <div className="ootd__stage">
            <OutfitCanvas
              slots={slots}
              selected={selected}
              onSelect={setSelected}
              onScale={scaleSlot}
              onSetScale={setSlotScale}
              onRemove={removeSlot}
              canvasRef={canvasRef}
            />

            <div className="ootd__meta">
              <div className="field field--grow">
                <label className="section-label" htmlFor="note">
                  Note
                </label>
                <input
                  id="note"
                  type="text"
                  className="text-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

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

              <label className="file-line">
                <input
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  onChange={(e) => pickSelfie(e.target.files?.[0])}
                />
                <span className="btn btn--secondary">
                  {selfie ? 'Photo added' : 'Photo'}
                </span>
                {selfiePreview && (
                  <img className="selfie-thumb" src={selfiePreview} alt="Selfie preview" />
                )}
              </label>

              <button
                type="button"
                className="btn btn--primary"
                onClick={save}
                disabled={worn.length === 0 || saving}
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
