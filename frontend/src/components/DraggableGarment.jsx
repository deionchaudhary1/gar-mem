import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

export default function DraggableGarment({ garment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `sidebar-${garment.id}`,
      data: { type: 'sidebar', garment },
    })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className="sidebar-garment"
      title={garment.name}
      {...listeners}
      {...attributes}
    >
      <img src={garment.image_path} alt={garment.name} />
    </button>
  )
}
