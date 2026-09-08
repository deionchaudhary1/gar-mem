import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORIES, CATEGORY_ZONES, MAX_SCALE, MIN_SCALE } from '../constants.js'
import OutfitZones from './OutfitZones.jsx'

function CanvasItem({ slot, category, selected, onSelect, onScale, onSetScale, onRemove, canvasRef }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `slot-${category}`,
    data: { category },
  })

  const handleResizeStart = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = canvasRef?.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + slot.position_x * rect.width
    const centerY = rect.top + slot.position_y * rect.height
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1
    const startScale = slot.scale

    const onMove = (moveEvent) => {
      const dist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY)
      const next = (startScale * dist) / startDist
      onSetScale(category, Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const style = {
    left: `${slot.position_x * 100}%`,
    top: `${slot.position_y * 100}%`,
    height: `${CATEGORY_ZONES[category].base * 100}%`,
    transform: `translate(-50%, -50%) ${
      transform ? CSS.Translate.toString(transform) : ''
    } scale(${slot.scale})`,
    zIndex: selected ? 20 : isDragging ? 15 : 10,
  }

  return (
    <div
      ref={setNodeRef}
      className={`canvas-item${selected ? ' canvas-item--selected' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(category)
      }}
      {...listeners}
      {...attributes}
    >
      <img src={slot.garment.image_path} alt={slot.garment.name} draggable={false} />
      {selected && (
        <div className="canvas-item__controls" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onScale(category, -0.1)} aria-label="Smaller">
            −
          </button>
          <button type="button" onClick={() => onScale(category, 0.1)} aria-label="Larger">
            +
          </button>
          <button
            type="button"
            className="canvas-item__remove"
            onClick={() => onRemove(category)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      )}
      {selected && (
        <div
          className="canvas-item__resize-handle"
          onPointerDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
          aria-label="Resize"
        />
      )}
    </div>
  )
}

export default function OutfitCanvas({
  slots,
  selected,
  onSelect,
  onScale,
  onSetScale,
  onRemove,
  canvasRef,
}) {
  const isEmpty = CATEGORIES.every((c) => !slots[c])

  return (
    <div className="outfit-stage">
      <div ref={canvasRef} className="outfit-display" onClick={() => onSelect(null)}>
        <OutfitZones filled={slots} />

        {CATEGORIES.map((category) =>
          slots[category] ? (
            <CanvasItem
              key={category}
              category={category}
              slot={slots[category]}
              selected={category === selected}
              onSelect={onSelect}
              onScale={onScale}
              onSetScale={onSetScale}
              onRemove={onRemove}
              canvasRef={canvasRef}
            />
          ) : null,
        )}
      </div>

      {isEmpty && (
        <p className="outfit-canvas__hint">
          Click a piece — or roll a die — to dress each slot.
        </p>
      )}
    </div>
  )
}
