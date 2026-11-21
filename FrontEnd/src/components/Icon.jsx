/* One icon set: 24-grid, 1.6 stroke, round caps — drawn for this app. */
const PATHS = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13',
  species: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14Zm0 0 7-7',
  observations: 'M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  surveys: 'M4 18 9 9l4 5 3-4 4 8M4 21h16',
  datasets: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m16 0v-1.5a3.5 3.5 0 0 0-2.5-3.35M14.5 4.15a3.5 3.5 0 0 1 0 6.7M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  x: 'M7 7l10 10M17 7 7 17',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  alert: 'M12 9v4m0 3.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4m0-3.5v-.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  plus: 'M12 5v14M5 12h14',
  search: 'M20 20l-4.2-4.2M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  arrowRight: 'M5 12h14m-5-5 5 5-5 5',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chat: 'M4 5h16v11H9l-5 4V5Zm4 4.5h8M8 12.5h5',
  send: 'M4 12 20 4l-6 16-3-7-7-1Z',
  key: 'M14.5 9.5a4 4 0 1 0-3.4 3.96L11 15H9v2H7v2H4v-3l7.1-7.1A4 4 0 0 0 14.5 9.5Zm1.5-1h.01',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Zm10 2.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z',
  eyeOff: 'M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6.4 0 10 6.1 10 6.1a17 17 0 0 1-3.2 3.9M6.6 7.6C3.9 9.4 2 12 2 12s3.6 6.5 10 6.5c1.5 0 2.8-.3 4-.8M9.9 9.9a2.8 2.8 0 0 0 4.2 3.6',
  leaf: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14Zm0 0 7-7',
  filter: 'M4 5h16l-6 8v6l-4-2v-4L4 5Z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
};

export default function Icon({ name, size = 18, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
