function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function OutfitDetail({ outfit, loading, onClose, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {loading || !outfit ? (
          <p className="loading">Loading…</p>
        ) : (
          <>
            <h2 className="modal__date">{formatDate(outfit.date)}</h2>

            <div className="modal__body">
              <div className="outfit-render">
                {outfit.items.map((item) => (
                  <div
                    key={item.id}
                    className="outfit-render__item"
                    style={{
                      left: `${item.position_x * 100}%`,
                      top: `${item.position_y * 100}%`,
                      transform: `translate(-50%, -50%) scale(${item.scale})`,
                    }}
                  >
                    <img
                      src={item.garment.image_path}
                      alt={item.garment.name}
                    />
                  </div>
                ))}
              </div>

              <div className="modal__aside">
                {outfit.selfie_path && (
                  <img
                    className="modal__selfie"
                    src={outfit.selfie_path}
                    alt="Selfie"
                  />
                )}
                {outfit.note && <p className="modal__note">{outfit.note}</p>}
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => onDelete(outfit.id)}
                >
                  Delete outfit
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
