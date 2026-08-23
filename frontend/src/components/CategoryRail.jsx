import SidebarGarment from './SidebarGarment.jsx'
import DiceButton from './DiceButton.jsx'
import { CATEGORY_LABELS } from '../constants.js'

export default function CategoryRail({ category, garments, activeId, onPick, onRoll }) {
  return (
    <section className="rail">
      <h2 className="rail__label">{CATEGORY_LABELS[category]}</h2>
      <div className="rail__row">
        <div className="rail__track">
          {garments.length === 0 ? (
            <p className="rail__empty">No {CATEGORY_LABELS[category].toLowerCase()} yet.</p>
          ) : (
            garments.map((g) => (
              <SidebarGarment
                key={g.id}
                garment={g}
                active={g.id === activeId}
                onAdd={onPick}
              />
            ))
          )}
        </div>
        <DiceButton
          label={`Shuffle ${CATEGORY_LABELS[category].toLowerCase()}`}
          onRoll={() => onRoll(category)}
          disabled={garments.length === 0}
        />
      </div>
    </section>
  )
}
