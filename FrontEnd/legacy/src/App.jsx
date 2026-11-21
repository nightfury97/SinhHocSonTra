import { useState } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import Scrim from './components/layout/Scrim.jsx';
import DashboardScreen from './components/dashboard/DashboardScreen.jsx';
import MapScreen from './components/map/MapScreen.jsx';
import SpeciesScreen from './components/species/SpeciesScreen.jsx';
import EntryScreen from './components/entry/EntryScreen.jsx';

const TITLES = {
  dashboard: ['Tổng quan', 'Khu bảo tồn thiên nhiên Sơn Trà · Đà Nẵng'],
  map: ['Bản đồ phân bố', 'Vị trí ghi nhận loài & trạm quan trắc'],
  species: ['Danh mục loài', 'Đa dạng sinh học bán đảo Sơn Trà'],
  entry: ['Nhập liệu quan sát', 'Ghi nhận dữ liệu thực địa'],
};

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [speciesId, setSpeciesId] = useState('vooc');

  const navigate = (next) => {
    setScreen(next);
    setNavOpen(false);
  };

  const goVooc = () => {
    setSpeciesId('vooc');
    navigate('species');
  };

  const [title, subtitle] = TITLES[screen];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-body)',
        background: 'var(--color-paper)',
        color: 'var(--color-ink)',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <Sidebar screen={screen} navOpen={navOpen} onNavigate={navigate} />
      <Scrim navOpen={navOpen} onClose={() => setNavOpen(false)} />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title={title} subtitle={subtitle} onToggleNav={() => setNavOpen((v) => !v)} />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {screen === 'dashboard' && <DashboardScreen onGoEntry={() => navigate('entry')} onGoVooc={goVooc} />}
          {screen === 'map' && <MapScreen />}
          {screen === 'species' && <SpeciesScreen selectedId={speciesId} onSelectSpecies={setSpeciesId} />}
          {screen === 'entry' && <EntryScreen />}
        </div>
      </main>
    </div>
  );
}
