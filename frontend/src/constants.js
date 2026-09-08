export const CATEGORIES = ['headwear', 'tops', 'pants', 'shoes']

export const CATEGORY_LABELS = {
  headwear: 'Headwear',
  tops: 'Shirts',
  pants: 'Pants',
  shoes: 'Shoes',
}

// The display is divided into one part per category, stacked head to toe.
// `top`/`bottom` are fractions of display height and bound the part.
// `y` is where a piece lands when placed.
// `base` is the piece's height as a fraction of display height, chosen so that
// even at MAX_SCALE it cannot grow taller than its part — which is what keeps
// the four categories genuinely separate rather than merely usually separate.
export const CATEGORY_ZONES = {
  headwear: { top: 0.0, bottom: 0.22, y: 0.11, base: 0.14 },
  tops: { top: 0.22, bottom: 0.52, y: 0.37, base: 0.2 },
  pants: { top: 0.52, bottom: 0.82, y: 0.67, base: 0.2 },
  shoes: { top: 0.82, bottom: 1.0, y: 0.91, base: 0.115 },
}

// base * MAX_SCALE stays under every part's height.
export const MIN_SCALE = 0.5
export const MAX_SCALE = 1.4

// Half the piece's height, as a fraction of display height.
export const halfHeight = (category, scale) =>
  (CATEGORY_ZONES[category].base * scale) / 2

// Each part is drawn a few pixels inside its geometric band (see the `zone`
// rule), so the clamp keeps that gutter too — otherwise a piece dragged to the
// limit sits a hair over the panel edge.
const PANEL_INSET = 0.012

// The centre positions at which a piece exactly touches the edges of its part.
export const zoneBounds = (category, scale) => {
  const { top, bottom } = CATEGORY_ZONES[category]
  const half = halfHeight(category, scale) + PANEL_INSET
  return [top + half, bottom - half]
}
