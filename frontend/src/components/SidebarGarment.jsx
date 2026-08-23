export default function SidebarGarment({ garment, active, onAdd }) {
  return (
    <button
      type="button"
      className={`sidebar-garment${active ? ' sidebar-garment--active' : ''}`}
      title={active ? `Remove ${garment.name}` : `Wear ${garment.name}`}
      aria-pressed={active}
      onClick={() => onAdd(garment)}
    >
      <img src={garment.image_path} alt={garment.name} />
    </button>
  )
}
