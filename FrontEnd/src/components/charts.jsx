import { useId, useState } from 'react';
import { fmtNum } from '../lib/format.js';

/** Khung biểu đồ: tiêu đề, chú giải, nút chuyển sang bảng số liệu (để không chỉ dựa vào màu). */
export function ChartCard({ title, note, legend, table, children }) {
  const [asTable, setAsTable] = useState(false);
  const tid = useId();
  return (
    <section className="panel chart-card" aria-labelledby={tid}>
      <div className="panel__head">
        <h2 id={tid}>{title}</h2>
        {table && (
          <button type="button" className="btn btn--sm btn--ghost" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'Xem biểu đồ' : 'Xem bảng'}
          </button>
        )}
      </div>
      <div className="panel__body chart-card__body">
        {legend && !asTable && (
          <ul className="legend" aria-label="Chú giải">
            {legend.map((l) => (
              <li key={l.key}>
                <i style={{ background: l.color }} aria-hidden="true" />
                {l.label}
              </li>
            ))}
          </ul>
        )}
        {asTable && table ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {table.head.map((h, i) => (
                    <th key={h} className={i > 0 ? 'num' : undefined}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j} className={j > 0 ? 'num' : undefined}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
        {note && <p className="field__hint">{note}</p>}
      </div>
    </section>
  );
}

/** Mốc trục y "đẹp": 4 khoảng, bước là 1, 2, 5 × 10^k. */
function niceScale(max) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

/**
 * Biểu đồ cột HTML/CSS (chữ giữ nguyên cỡ trên điện thoại).
 * data[categoryKey][seriesKey] = số. mode 'stack' = chồng, 'group' = cạnh nhau.
 * Mỗi nhóm cột là một vùng bấm/tab được; tooltip liệt kê mọi chuỗi (đọc được không cần phân biệt màu).
 */
export function ColumnChart({ categories, series, data, mode = 'group', unit = '', digits, label }) {
  const [active, setActive] = useState(null);
  const val = (c, s) => data[c.key]?.[s.key] ?? 0;
  const totals = categories.map((c) => (mode === 'stack' ? series.reduce((n, s) => n + val(c, s), 0) : Math.max(0, ...series.map((s) => val(c, s)))));
  const { top, ticks } = niceScale(Math.max(0, ...totals));
  const fmt = (n) => fmtNum(n, digits);
  const name = (c) => c.title ?? c.label;
  const summary = (c) => `${name(c)}: ${series.map((s) => `${s.label} ${fmt(val(c, s))}${unit}`).join(', ')}`;
  const act = active !== null ? categories[active] : null;

  return (
    <div className="cc" role="group" aria-label={label} onMouseLeave={() => setActive(null)}>
      <div className="cc__y" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
            {fmt(t)}
          </span>
        ))}
      </div>
      <div className="cc__plot">
        {ticks.map((t) => (
          <i key={t} className="cc__grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />
        ))}
        <div className="cc__cols">
          {categories.map((c, i) => (
            <div
              key={c.key}
              className="cc__col"
              data-active={active === i || undefined}
              tabIndex={0}
              role="img"
              aria-label={summary(c)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {mode === 'stack' ? (
                <div className="cc__stack" style={{ height: `${(totals[i] / top) * 100}%` }}>
                  {series
                    .filter((s) => val(c, s) > 0)
                    .map((s) => (
                      <span key={s.key} className="cc__seg" style={{ flexGrow: val(c, s), background: s.color }} />
                    ))}
                </div>
              ) : (
                <div className="cc__group">
                  {series.map((s) => (
                    <span key={s.key} className="cc__bar" style={{ height: `${(val(c, s) / top) * 100}%`, background: s.color }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {act && (
          <div className="cc__tip" role="presentation" style={{ left: `${((active + 0.5) / categories.length) * 100}%`, bottom: `${Math.min(92, (totals[active] / top) * 100 + 4)}%` }}>
            <strong>{name(act)}</strong>
            {series.map((s) => (
              <span key={s.key}>
                <i style={{ background: s.color }} aria-hidden="true" />
                {s.label}: {fmt(val(act, s))}
                {unit}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="cc__x" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {categories.map((c) => (
          <span key={c.key}>{c.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Thanh ngang có nhãn và giá trị ghi thẳng ở đầu thanh. */
export function HBarChart({ rows, color = 'var(--series-a)', unit = '' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbar hbar--wide">
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'contents' }} title={`${r.label}: ${fmtNum(r.value)}${unit}`}>
          <span className="hbar__label">{r.label}</span>
          <div className="hbar__track">
            <span className="hbar__fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? color }} />
          </div>
          <span className="hbar__value">{fmtNum(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
