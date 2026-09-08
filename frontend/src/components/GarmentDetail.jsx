import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS } from '../constants.js'
import { PieceImage } from './Wardrobe.jsx'

export default function GarmentDetail({ garment, onClose, onDelete }) {
  const dialog = useRef(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className="piece-dialog" onCancel={onClose}
    aria-labelledby="piece-title" onClick={e => { if (e.target === dialog.current) onClose() }}>
    <button className="modal__close" onClick={onClose} aria-label="Close piece details">×</button>
    <div className="piece-detail">
      <div className="piece-detail__image"><PieceImage garment={garment} full /></div>
      <div className="piece-detail__info">
        <span className="eyebrow">{CATEGORY_LABELS[garment.category]}</span>
        <h2 id="piece-title">{garment.name}</h2>
        <p className="muted">Added {new Date(garment.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <Link className="btn btn--primary" to={`/ootd?garment=${garment.id}`}>Use in outfit</Link>
        <button className="text-button text-button--danger" disabled={deleting} onClick={async () => {
          setDeleting(true)
          const removed = await onDelete(garment)
          if (removed) onClose()
          else setDeleting(false)
        }}>{deleting ? 'Removing…' : 'Remove from closet'}</button>
      </div>
    </div>
  </dialog>
}
