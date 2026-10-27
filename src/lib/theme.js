// Theme colours for inline styles. Each one points at a CSS variable in
// styles/globals.css, so components follow light or dark mode
// (<html data-mode>). The names are historic: "gold" is the accent (lime).
export const T = {
  bg:           'rgb(var(--c-bg))',   // page
  surface:      'rgb(var(--c-surface))',   // cards
  surface2:     'rgb(var(--c-surface-2))',   // inputs, raised rows
  border:       'rgb(var(--c-border))',
  borderStrong: 'rgb(var(--c-border-strong))',
  text:         'rgb(var(--c-text))',
  text2:        'rgb(var(--c-text-2))',   // supporting
  text3:        'rgb(var(--c-text-3))',   // captions, labels
  gold:         'rgb(var(--c-accent))',
  goldSoft:     'rgb(var(--c-accent) / 0.12)',
  goldLine:     'rgb(var(--c-accent) / 0.35)',
  positive:     'rgb(var(--c-positive))',
  negative:     'rgb(var(--c-negative))',
  warning:      'rgb(var(--c-warning))',
  fixed:        'rgb(var(--c-fixed))',
  predicted:    'rgb(var(--c-predicted))',
  unplanned:    'rgb(var(--c-unplanned))',
  radius:       'var(--radius-card)',
}

export const TYPE_COLOUR = { fixed: T.fixed, predicted: T.predicted, unplanned: T.unplanned }

export const label = {
  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: T.text3,
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
