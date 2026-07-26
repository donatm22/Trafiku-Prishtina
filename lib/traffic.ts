export const INCIDENT_TYPES = {
  jam: { label: "Kolonë", icon: "≈", color: "#c92f38" },
  accident: { label: "Aksident", icon: "!", color: "#20201f" },
  closure: { label: "Rrugë e mbyllur", icon: "×", color: "#7a4b28" },
  hazard: { label: "Rrezik", icon: "△", color: "#d58919" },
} as const;

export type IncidentType = keyof typeof INCIDENT_TYPES;

export type TrafficReport = {
  id: number;
  type: IncidentType;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high";
  confirmations: number;
  createdAt: string;
  expiresAt: string;
};

export const SEED_REPORTS: TrafficReport[] = [
  {
    id: 1,
    type: "jam",
    title: "Kolonë e dendur te Rrethi i Flamurit",
    description: "Lëvizje shumë e ngadalshme në drejtim të qendrës.",
    locationName: "Rrethi i Flamurit",
    latitude: 42.65596,
    longitude: 21.15751,
    severity: "high",
    confirmations: 18,
    createdAt: "2026-07-26T15:48:00.000Z",
    expiresAt: "2026-07-26T17:48:00.000Z",
  },
  {
    id: 2,
    type: "accident",
    title: "Aksident i lehtë në Ulpianë",
    description: "Dy automjete në krahun e djathtë; kalimi është i mundur.",
    locationName: "Bulevardi Dëshmorët e Kombit",
    latitude: 42.64944,
    longitude: 21.16077,
    severity: "medium",
    confirmations: 9,
    createdAt: "2026-07-26T16:04:00.000Z",
    expiresAt: "2026-07-26T18:04:00.000Z",
  },
  {
    id: 3,
    type: "closure",
    title: "Korsi e mbyllur pranë Katedrales",
    description: "Punime në rrjet; përdorni rrugët anësore.",
    locationName: "Rruga Garibaldi",
    latitude: 42.66035,
    longitude: 21.15618,
    severity: "medium",
    confirmations: 14,
    createdAt: "2026-07-26T14:32:00.000Z",
    expiresAt: "2026-07-26T20:32:00.000Z",
  },
  {
    id: 4,
    type: "hazard",
    title: "Pusetë e dëmtuar në Dardani",
    description: "Rrezik në korsinë e majtë, vozitni me kujdes.",
    locationName: "Rruga Bill Klinton",
    latitude: 42.65719,
    longitude: 21.14423,
    severity: "high",
    confirmations: 22,
    createdAt: "2026-07-26T13:58:00.000Z",
    expiresAt: "2026-07-27T01:58:00.000Z",
  },
  {
    id: 5,
    type: "jam",
    title: "Ngadalësim te Veterniku",
    description: "Fluks i shtuar në hyrje të qytetit.",
    locationName: "Veternik",
    latitude: 42.62888,
    longitude: 21.16302,
    severity: "medium",
    confirmations: 11,
    createdAt: "2026-07-26T16:12:00.000Z",
    expiresAt: "2026-07-26T18:12:00.000Z",
  },
  {
    id: 6,
    type: "jam",
    title: "Kolonë pranë Parkut të Qytetit",
    description: "Pritje rreth 10 minuta në kryqëzim.",
    locationName: "Rruga Agim Ramadani",
    latitude: 42.66281,
    longitude: 21.16966,
    severity: "low",
    confirmations: 7,
    createdAt: "2026-07-26T16:20:00.000Z",
    expiresAt: "2026-07-26T18:20:00.000Z",
  },
];
