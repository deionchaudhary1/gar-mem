import { CATEGORIES, CATEGORY_LABELS, CATEGORY_ZONES } from '../constants.js'

// The four parts of the display, stacked head to toe. Rendered behind the
// pieces in both the builder and the saved-outfit view so a look reads the
// same way in each. `filled` marks the parts that already have a piece, so
// only the empty ones show their label.
export default function OutfitZones({ filled = {} }) {
  return CATEGORIES.map((category) => {
    const { top, bottom } = CATEGORY_ZONES[category]
    return (
      <div
        key={category}
        className="zone"
        style={{
          top: `calc(${top * 100}% + 3px)`,
          height: `calc(${(bottom - top) * 100}% - 6px)`,
        }}
      >
        {!filled[category] && (
          <span className="zone__label">{CATEGORY_LABELS[category]}</span>
        )}
      </div>
    )
  })
}
