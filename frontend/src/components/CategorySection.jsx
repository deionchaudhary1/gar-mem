import GarmentCard from './GarmentCard.jsx'
import { CATEGORY_LABELS } from '../constants.js'

export default function CategorySection({ category, garments, onDelete }) {
  return (
    <section className="closet-row">
      <h2 className="closet-row__label">{CATEGORY_LABELS[category]}</h2>
      <div className="closet-row__track">
        {garments.length === 0 ? (
          <p className="closet-row__empty">Nothing here yet.</p>
        ) : (
          garments.map((g) => (
            <GarmentCard key={g.id} garment={g} onDelete={onDelete} />
          ))
        )}
      </div>
    </section>
  )
}
