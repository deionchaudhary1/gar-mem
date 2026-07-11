export default function GarmentCard({ garment, onDelete, index = 0 }) {
  return (
    <div className="garment-card" style={{ '--i': index }}>
      <div className="garment-card__tile">
        <img
          src={garment.image_path}
          alt={garment.name}
          className="garment-card__img"
        />
        {onDelete && (
          <button
            type="button"
            className="garment-card__delete"
            aria-label={`Delete ${garment.name}`}
            title="Delete"
            onClick={() => onDelete(garment)}
          >
            ×
          </button>
        )}
      </div>
      <div className="garment-card__name">{garment.name}</div>
    </div>
  )
}
