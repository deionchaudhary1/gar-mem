import { CATEGORIES, CATEGORY_LABELS } from '../constants.js'
import { PieceImage } from './Wardrobe.jsx'

export default function LookPreview({ outfit }) {
  return <div className="look-preview" aria-label="Outfit pieces">
    {CATEGORIES.map(category => {
      const item = outfit.items.find(i => i.garment.category === category)
      return <div key={category} className={`look-preview__part look-preview__part--${category}`}>
        {item ? <PieceImage garment={{ ...item.garment, thumbnail_path: `/api/garments/${item.garment.id}/thumbnail` }} /> : <span>{CATEGORY_LABELS[category]}</span>}
      </div>
    })}
  </div>
}
