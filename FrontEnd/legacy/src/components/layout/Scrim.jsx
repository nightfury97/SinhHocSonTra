export default function Scrim({ navOpen, onClose }) {
  return (
    <div
      data-scrim="true"
      data-open={navOpen}
      onClick={onClose}
      style={{ display: 'none', position: 'absolute', inset: 0, background: 'oklch(20% 0.02 150 / 0.35)', zIndex: 'var(--z-dropdown)' }}
    />
  );
}
