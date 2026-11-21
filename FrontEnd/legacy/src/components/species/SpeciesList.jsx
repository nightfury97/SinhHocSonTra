import { GROUPS } from '../../data/dashboard.js';
import { statusStyle, groupSwatch } from '../../theme.js';

export default function SpeciesList({ species, group, selectedId, onSelectGroup, onSelectSpecies }) {
  const filtered = group === 'Tất cả' ? species : species.filter((s) => s.group === group);

  return (
    <div style={{ flex: 1, minWidth: 0, padding: 'var(--space-lg)', borderRight: '1px solid var(--color-rule)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        {GROUPS.map((g) => (
          <button key={g} onClick={() => onSelectGroup(g)} className={`chip${group === g ? ' is-active' : ''}`}>
            {g}
          </button>
        ))}
      </div>
      {filtered.map((sp) => {
        const [statusBg, statusFg] = statusStyle(sp.statusShort);
        const [thumbBg, thumbFg] = sp.featured ? ['var(--swatch-featured-bg)', 'var(--swatch-featured-fg)'] : groupSwatch(sp.group);
        const active = sp.id === selectedId;
        return (
          <button
            key={sp.id}
            onClick={() => onSelectSpecies(sp.id)}
            className={`row-link${active ? ' is-selected' : ''}`}
            style={{ gap: 'var(--space-sm)', borderBottom: '1px solid var(--color-rule-2)', padding: 'var(--space-sm)' }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 'var(--radius-md)',
                flex: 'none',
                background: thumbBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: thumbFg,
                fontWeight: 600,
              }}
            >
              {sp.tag}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-base)', fontWeight: 500 }}>{sp.name}</span>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-ink-2)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>{sp.sci}</span>
            </span>
            <span className="eyebrow" style={{ letterSpacing: 0, whiteSpace: 'nowrap' }}>{sp.group}</span>
            <span className="badge" style={{ background: statusBg, color: statusFg }}>{sp.statusShort}</span>
          </button>
        );
      })}
    </div>
  );
}
