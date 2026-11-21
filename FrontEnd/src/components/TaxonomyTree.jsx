import { useMemo, useState } from 'react';
import { IucnBadge } from './ui.jsx';
import { SpeciesThumb } from './SpeciesPhoto.jsx';
import { fmtNum } from '../lib/format.js';

const CLASS_LABEL = { Aves: 'Chim', Mammal: 'Thú', Mammalia: 'Thú', Reptilia: 'Bò sát', Amphibia: 'Lưỡng cư' };
const UNCLASSIFIED = 'Chưa phân loại';
const byName = (a, b) => a.name.localeCompare(b.name, 'vi');

/** Dựng cây Lớp → Bộ → Họ → Loài từ danh sách loài; loài thiếu thông tin xếp vào nhánh "Chưa phân loại". */
function buildTaxonomy(species) {
  const root = new Map();
  for (const s of species) {
    const cls = s.taxonClass || UNCLASSIFIED;
    const ord = s.taxonOrder || UNCLASSIFIED;
    const fam = s.family || UNCLASSIFIED;
    const c = root.get(cls) ?? { key: cls, name: cls, label: CLASS_LABEL[cls], children: new Map() };
    root.set(cls, c);
    const o = c.children.get(ord) ?? { key: `${cls}/${ord}`, name: ord, children: new Map() };
    c.children.set(ord, o);
    const f = o.children.get(fam) ?? { key: `${cls}/${ord}/${fam}`, name: fam, species: [] };
    o.children.set(fam, f);
    f.species.push(s);
  }
  const tally = (node) => {
    const kids = node.children ? [...node.children.values()].map(tally) : [];
    node.children = kids.sort((a, b) => (a.name === UNCLASSIFIED) - (b.name === UNCLASSIFIED) || byName(a, b));
    node.species = node.species ? node.species.sort((a, b) => a.scientificName.localeCompare(b.scientificName)) : [];
    node.speciesCount = node.species.length + kids.reduce((n, k) => n + k.speciesCount, 0);
    node.recordCount = node.species.reduce((n, s) => n + (s._count?.observations ?? 0), 0) + kids.reduce((n, k) => n + k.recordCount, 0);
    return node;
  };
  return [...root.values()].map(tally).sort((a, b) => (a.name === UNCLASSIFIED) - (b.name === UNCLASSIFIED) || byName(a, b));
}

const LEVEL = ['Lớp', 'Bộ', 'Họ'];

export default function TaxonomyTree({ species, onOpen, forceOpen = false }) {
  const tree = useMemo(() => buildTaxonomy(species), [species]);
  const [open, setOpen] = useState(() => new Set());
  const isOpen = (key) => forceOpen || open.has(key);
  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allKeys = useMemo(() => {
    const keys = [];
    const walk = (n) => {
      keys.push(n.key);
      n.children.forEach(walk);
    };
    tree.forEach(walk);
    return keys;
  }, [tree]);

  return (
    <div>
      <div className="tree-tools">
        <button type="button" className="btn btn--sm" onClick={() => setOpen(new Set(allKeys))}>
          Mở tất cả
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(new Set())} disabled={forceOpen}>
          Thu tất cả
        </button>
        {forceOpen && <span className="field__hint">Đang lọc: các nhánh khớp được mở sẵn.</span>}
      </div>
      <ul className="tree" role="tree" aria-label="Cây phân loại">
        {tree.map((n) => (
          <Node key={n.key} node={n} depth={0} isOpen={isOpen} toggle={toggle} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}

function Node({ node, depth, isOpen, toggle, onOpen }) {
  const expanded = isOpen(node.key);
  return (
    <li role="treeitem" aria-expanded={expanded} className="tree__item">
      <button type="button" className="tree__row" style={{ '--depth': depth }} onClick={() => toggle(node.key)}>
        <span className="tree__caret" data-open={expanded} aria-hidden="true" />
        <span className="tree__level">{LEVEL[depth]}</span>
        <span className={node.name === UNCLASSIFIED ? 'tree__name faint' : 'tree__name'}>
          {node.name}
          {node.label && <span className="muted"> · {node.label}</span>}
        </span>
        <span className="tree__count num" title="Số loài · số bản ghi">
          {fmtNum(node.speciesCount)} loài · {fmtNum(node.recordCount)} bản ghi
        </span>
      </button>
      {expanded && (
        <ul role="group" className="tree__group">
          {node.children.map((c) => (
            <Node key={c.key} node={c} depth={depth + 1} isOpen={isOpen} toggle={toggle} onOpen={onOpen} />
          ))}
          {node.species.map((s) => (
            <li key={s.id} role="treeitem" aria-selected="false" className="tree__item">
              <button type="button" className="tree__row tree__leaf" style={{ '--depth': depth + 1 }} onClick={() => onOpen(s.id)}>
                <SpeciesThumb species={s} size={28} />
                <span className="tree__name">
                  {s.name === s.scientificName ? <span className="sci">{s.name}</span> : s.name}
                  {s.name !== s.scientificName && <span className="muted sci"> · {s.scientificName}</span>}
                </span>
                <IucnBadge status={s.status} />
                <span className="tree__count num">{fmtNum(s._count?.observations ?? 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
