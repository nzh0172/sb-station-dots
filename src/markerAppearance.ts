export type MarkerAppearanceKey =
  | 'globalScale'
  | 'normalStationDotSize'
  | 'transferDotSize'
  | 'lineBadgeSize'
  | 'stationNameSize';

type MarkerAppearanceSetting = {
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  storageKey: string;
};

type MarkerAppearanceState = Record<MarkerAppearanceKey, number>;

const SETTINGS: Record<MarkerAppearanceKey, MarkerAppearanceSetting> = {
  globalScale: {
    defaultValue: 1,
    min: 0.5,
    max: 2,
    step: 0.05,
    storageKey: 'com.author.modname:global-marker-scale',
  },
  normalStationDotSize: {
    defaultValue: 0.45,
    min: 0.35,
    max: 1.4,
    step: 0.05,
    storageKey: 'com.author.modname:normal-station-dot-size-rem',
  },
  transferDotSize: {
    defaultValue: 0.8,
    min: 0.45,
    max: 1.6,
    step: 0.05,
    storageKey: 'com.author.modname:transfer-dot-size-rem',
  },
  lineBadgeSize: {
    defaultValue: 11,
    min: 8,
    max: 24,
    step: 1,
    storageKey: 'com.author.modname:line-badge-size-px',
  },
  stationNameSize: {
    defaultValue: 11,
    min: 8,
    max: 20,
    step: 1,
    storageKey: 'com.author.modname:station-name-size-px',
  },
};

const listeners = new Set<(state: MarkerAppearanceState) => void>();

const state: MarkerAppearanceState = {
  globalScale: loadValue('globalScale'),
  normalStationDotSize: loadValue('normalStationDotSize'),
  transferDotSize: loadValue('transferDotSize'),
  lineBadgeSize: loadValue('lineBadgeSize'),
  stationNameSize: loadValue('stationNameSize'),
};

function clampValue(key: MarkerAppearanceKey, value: number): number {
  const setting = SETTINGS[key];
  return Math.min(setting.max, Math.max(setting.min, value));
}

function loadValue(key: MarkerAppearanceKey): number {
  const setting = SETTINGS[key];
  const stored = window.localStorage.getItem(setting.storageKey);
  const parsed = stored ? Number.parseFloat(stored) : Number.NaN;

  if (Number.isFinite(parsed)) {
    return clampValue(key, parsed);
  }

  return setting.defaultValue;
}

function saveValue(key: MarkerAppearanceKey, value: number): void {
  window.localStorage.setItem(SETTINGS[key].storageKey, String(value));
}

function emit(): void {
  const snapshot = getMarkerAppearance();
  listeners.forEach((listener) => listener(snapshot));
}

export function getMarkerAppearance(): MarkerAppearanceState {
  return { ...state };
}

export function getMarkerAppearanceRange(key: MarkerAppearanceKey) {
  const setting = SETTINGS[key];
  return {
    min: setting.min,
    max: setting.max,
    step: setting.step,
    defaultValue: setting.defaultValue,
  };
}

export function setMarkerAppearanceValue(key: MarkerAppearanceKey, value: number): void {
  const nextValue = clampValue(key, value);

  if (nextValue === state[key]) return;

  state[key] = nextValue;
  saveValue(key, nextValue);
  emit();
}

export function resetMarkerAppearance(): void {
  (Object.keys(SETTINGS) as MarkerAppearanceKey[]).forEach((key) => {
    state[key] = SETTINGS[key].defaultValue;
    saveValue(key, state[key]);
  });

  emit();
}

export function subscribeMarkerAppearance(listener: (state: MarkerAppearanceState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
