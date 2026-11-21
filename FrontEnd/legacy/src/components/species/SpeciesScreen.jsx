import { useState } from 'react';
import SpeciesList from './SpeciesList.jsx';
import SpeciesDetail from './SpeciesDetail.jsx';
import { SPECIES } from '../../data/species.js';

export default function SpeciesScreen({ selectedId, onSelectSpecies }) {
  const [group, setGroup] = useState('Tất cả');
  const selected = SPECIES.find((s) => s.id === selectedId) || SPECIES[0];

  return (
    <section data-screen-label="Danh mục loài">
      <div className="stack-mobile" style={{ display: 'flex', minHeight: 520 }}>
        <SpeciesList species={SPECIES} group={group} selectedId={selected.id} onSelectGroup={setGroup} onSelectSpecies={onSelectSpecies} />
        <SpeciesDetail species={selected} />
      </div>
    </section>
  );
}
