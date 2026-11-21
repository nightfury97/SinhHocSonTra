import ObservationForm from './ObservationForm.jsx';
import MyReports from './MyReports.jsx';
import { MY_REPORTS } from '../../data/dashboard.js';

export default function EntryScreen() {
  return (
    <section
      data-screen-label="Nhập liệu"
      style={{ padding: 'var(--space-lg) clamp(var(--space-md), 4vw, var(--space-lg)) var(--space-xl)' }}
    >
      <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-md)', maxWidth: 1120 }}>
        <ObservationForm />
        <MyReports reports={MY_REPORTS} />
      </div>
    </section>
  );
}
