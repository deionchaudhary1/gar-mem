export const CATEGORIES = ['headwear', 'tops', 'pants', 'shoes']

export const CATEGORY_LABELS = {
  headwear: 'Headwear',
  tops: 'Tops',
  pants: 'Pants',
  shoes: 'Shoes',
}

// The outfit canvas is split into one horizontal band per category, stacked
// head-to-toe. `top`/`bottom` are fractions of canvas height and bound where a
// piece may be dragged; `y` is where it lands when placed; `scale` keeps hats
// and shoes from arriving the same size as a pair of trousers.
export const CATEGORY_ZONES = {
  headwear: { top: 0.0, bottom: 0.22, y: 0.11, scale: 0.72 },
  tops: { top: 0.22, bottom: 0.52, y: 0.37, scale: 1.1 },
  pants: { top: 0.52, bottom: 0.82, y: 0.67, scale: 1.1 },
  shoes: { top: 0.82, bottom: 1.0, y: 0.91, scale: 0.78 },
}
