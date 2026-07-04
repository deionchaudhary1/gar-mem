import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function CanvasItem({ item, selected, onSelect, onScale, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `canvas-${item.key}`,
      data: { type: 'canvas-item', key: item.key },
    })

  const style = {
    left: `${item.position_x * 100}%`,
    top: `${item.position_y * 100}%`,
    transform: `translate(-50%, -50%) ${
      transform ? CSS.Translate.toString(transform) : ''
    } scale(${item.scale})`,
    zIndex: selected ? 20 : isDragging ? 15 : 10,
  }

  return (
    <div
      ref={setNodeRef}
      className={`canvas-item${selected ? ' canvas-item--selected' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(item.key)
      }}
      {...listeners}
      {...attributes}
    >
      <img src={item.garment.image_path} alt={item.garment.name} draggable={false} />
      {selected && (
        <div className="canvas-item__controls" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onScale(item.key, -0.1)} aria-label="Smaller">
            −
          </button>
          <button type="button" onClick={() => onScale(item.key, 0.1)} aria-label="Larger">
            +
          </button>
          <button
            type="button"
            className="canvas-item__remove"
            onClick={() => onRemove(item.key)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default function OutfitCanvas({
  items,
  selectedKey,
  onSelect,
  onScale,
  onRemove,
  canvasRef,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  const setRefs = (node) => {
    setNodeRef(node)
    if (canvasRef) canvasRef.current = node
  }

  return (
    <div
      ref={setRefs}
      className={`outfit-canvas${isOver ? ' outfit-canvas--over' : ''}`}
      onClick={() => onSelect(null)}
    >
      {items.length === 0 && (
        <p className="outfit-canvas__hint">Drag pieces here to build a look.</p>
      )}
      {items.map((item) => (
        <CanvasItem
          key={item.key}
          item={item}
          selected={item.key === selectedKey}
          onSelect={onSelect}
          onScale={onScale}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
