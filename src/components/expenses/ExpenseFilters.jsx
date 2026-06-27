const FILTERS = ['All', 'Capitec', 'FNB', 'Cash']

export default function ExpenseFilters({ active, onChange, categories, activeCategory, onCategoryChange }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Account filters */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95
              ${active === f
                ? 'bg-gold/10 border-gold/40 text-gold'
                : 'bg-bg-elevated border-border text-muted'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex gap-2 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95
              ${!activeCategory ? 'bg-bg-elevated border-border-light text-text-secondary' : 'bg-bg-elevated border-border text-muted'}`}
          >
            All categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id === activeCategory ? null : cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95
                ${activeCategory === cat.id
                  ? 'bg-bg-elevated border-border-light text-text-primary'
                  : 'bg-bg-elevated border-border text-muted'
                }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
