import GarmentCard from './GarmentCard.jsx'
import { CATEGORY_LABELS } from '../constants.js'

export default function CategorySection({ category, garments, onDelete }) {
  return (
    <section className="category-section">
      <h2 className="section-label">{CATEGORY_LABELS[category]}</h2>
      {garments.length === 0 ? (
        <p className="category-section__empty">Nothing here yet.</p>
      ) : (
        <div className="garment-grid">
          {garments.map((g, i) => (
            <GarmentCard key={g.id} garment={g} onDelete={onDelete} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
