import OutfitZones from './OutfitZones.jsx'
import { CATEGORY_ZONES } from '../constants.js'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

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
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  // Every part that carries a piece, so the empty ones keep their label.
  const filledZones = Object.fromEntries(
    (outfit?.items ?? []).map((item) => [item.garment.category, true]),
  )

  return (
    <dialog ref={dialog} className="modal look-dialog" aria-label="Saved outfit" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose() }}>
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
                <OutfitZones filled={filledZones} />
                {outfit.items.map((item) => (
                  <div
                    key={item.id}
                    className="outfit-render__item"
                    style={{
                      left: `${item.position_x * 100}%`,
                      top: `${item.position_y * 100}%`,
                      height: `${
                        (CATEGORY_ZONES[item.garment.category]?.base ?? 0.2) * 100
                      }%`,
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
                <Link className="btn btn--primary" to={`/studio?outfit=${outfit.id}`}>Wear it again</Link>
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
    </dialog>
  )
}
