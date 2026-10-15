// Refined gold — one dark surface family, gold only for what matters
// (key numbers, primary actions, the active tab). Mirrors the CSS variables
// in styles/globals.css and the colours in tailwind.config.js.
export const T = {
  bg:           '#0E0E10',   // page
  surface:      '#17171A',   // cards
  surface2:     '#1F1F23',   // inputs, raised rows
  border:       '#26262B',
  borderStrong: '#34343A',
  text:         '#F4F4F5',
  text2:        '#A1A1AA',   // supporting
  text3:        '#8B8B93',   // captions, labels
  gold:         '#E8C36A',
  goldSoft:     'rgba(232,195,106,0.12)',
  goldLine:     'rgba(232,195,106,0.35)',
  positive:     '#5BC98B',
  negative:     '#F07A6A',
  warning:      '#E9A25A',
  fixed:        '#7C8DB5',
  predicted:    '#E8C36A',
  unplanned:    '#D98E5A',
  radius:       18,
}

export const TYPE_COLOUR = { fixed: T.fixed, predicted: T.predicted, unplanned: T.unplanned }

export const label = {
  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: T.text3,
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
