export const CARGO_STATUS = {
  received: { label: "Received", tone: "orange" },
  loaded: { label: "Loaded", tone: "green" },
  in_transit: { label: "In transit", tone: "blue" },
  arrived: { label: "Arrived", tone: "violet" },
  delivered: { label: "Delivered", tone: "blue" },
  collected: { label: "Collected", tone: "yellow" },
} as const;

export const SHIPMENT_STATUS = {
  registered: { label: "Registered", tone: "grey" },
  loaded: { label: "Loaded", tone: "orange" },
  in_transit: { label: "In transit", tone: "blue" },
  at_port: { label: "At port", tone: "yellow" },
  arrived: { label: "Arrived", tone: "violet" },
  off_loaded: { label: "Off-loaded", tone: "green" },
} as const;

export const CARGO_TYPES = ["General goods", "Clothing", "Electronics", "Furniture", "Spare parts", "Household items", "Other"];

export const COUNTRIES = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Burundi", "DR Congo", "Zambia", "Malawi"];

export const formatVolume = (volume: string, unit: "cbm" | "kg") => `${Number(volume)} ${unit}`;
