const PATHS = {
  back: "M15 18l-6-6 6-6",
  next: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5 9-10",
  sparkle:
    "M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  camera:
    "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 10a3 3 0 1 0 0 6a3 3 0 0 0 0-6z",
  plane: "M10.5 13.5L3 11l18-8-8 18-2.5-7.5zM10.5 13.5L21 3",
  train:
    "M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M8 21l2-4M16 21l-2-4",
  bus: "M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2zM4 11h16M7 17v3M17 17v3",
  faBus:
    "M488 128h-16V80c0-44.8-99.2-80-224-80S24 35.2 24 80v48H8c-4.42 0-8 3.58-8 8v80c0 4.42 3.58 8 8 8h16v200c0 13.25 10.75 24 24 24h24c13.25 0 24-10.75 24-24v-24h304v24c0 13.25 10.75 24 24 24h24c13.25 0 24-10.75 24-24V224h16c4.42 0 8-3.58 8-8v-80c0-4.42-3.58-8-8-8zM96 64h304v128H96V64zm16 288c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm272 0c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z",
  buildings:
    "M4 21V7a1 1 0 0 1 1-1h7v15M12 11h6a1 1 0 0 1 1 1v9M7 9h2M7 12h2M7 15h2M15 14h1M15 17h1M3 21h18",
  car: "M5 17h14v-5l-1.8-4.5a1 1 0 0 0-.9-.5H7.7a1 1 0 0 0-.9.5L5 12zM5 12h14M7 17v2M17 17v2",
  walk: "M13 4.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3zM10 21l2-6 3 3v3M8 12l2-5 4 2 2 3M12 15l-1-4",
  pin: "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4a2 2 0 0 0 0 4z",
  clock: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 7v5l3 2",
  calendar:
    "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  ticket: "M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10",
  image:
    "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 16l5-5 4 4 2.5-2.5L20 17M15 8.5h.01",
  bed: "M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12.5a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3z",
  museum: "M3 21h18M5 21V11M10 21V11M14 21V11M19 21V11M2.5 11L12 4l9.5 7z",
  food: "M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2 1.5-3 4-3 7h3",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  people:
    "M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 0 0 0-6M21 20a6 6 0 0 0-4-5.6",
  globe:
    "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  swap: "M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4",
  seat: "M7 3v9a2 2 0 0 0 2 2h8M7 3h2M9 9h6a2 2 0 0 1 2 2v3M8 14l-2 7M16 14l2 7M10 18h6",
  user: "M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  send: "M21 3L3 10.5l7 2.5 2.5 7zM10 13l11-10",
  grip: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
  at: "M16 12a4 4 0 1 1-8 0a4 4 0 0 1 8 0zM16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6z",
  eyeOff:
    "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
};

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className = "" }: IconProps) {
  const filled = name === "faBus";
  return (
    <svg
      viewBox={filled ? "0 0 512 448" : "0 0 24 24"}
      preserveAspectRatio={filled ? "xMidYMax meet" : undefined}
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
