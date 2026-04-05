export type MarkerAppearanceKey =
  | 'globalScale'
  | 'normalStationDotSize'
  | 'transferDotSize'
  | 'transferDotOutlineThickness'
  | 'lineBadgeSize'
  | 'editRouteOrderButtonScale'
  | 'stationNameSize'
  | 'transferDotColor'
  | 'transferDotOutlineColor';

type NumericMarkerAppearanceKey = Exclude<MarkerAppearanceKey, 'transferDotColor' | 'transferDotOutlineColor'>;

type MarkerAppearanceSetting = {
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  storageKey: string;
};

export type MarkerAppearanceState = {
  globalScale: number;
  normalStationDotSize: number;
  transferDotSize: number;
  transferDotOutlineThickness: number;
  lineBadgeSize: number;
  editRouteOrderButtonScale: number;
  stationNameSize: number;
  transferDotColor: string;
  transferDotOutlineColor: string;
};

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
  transferDotOutlineThickness: {
    defaultValue: 1,
    min: 0,
    max: 6,
    step: 0.5,
    storageKey: 'com.author.modname:transfer-dot-outline-thickness-px',
  },
  lineBadgeSize: {
    defaultValue: 11,
    min: 8,
    max: 24,
    step: 1,
    storageKey: 'com.author.modname:line-badge-size-px',
  },
  editRouteOrderButtonScale: {
    defaultValue: 1,
    min: 0.5,
    max: 2,
    step: 0.05,
    storageKey: 'com.author.modname:edit-route-order-button-scale',
  },
  stationNameSize: {
    defaultValue: 11,
    min: 8,
    max: 20,
    step: 1,
    storageKey: 'com.author.modname:station-name-size-px',
  },
  transferDotColor: {
    defaultValue: '#ffffff',
    storageKey: 'com.author.modname:transfer-dot-color',
  },
  transferDotOutlineColor: {
    defaultValue: '#000000',
    storageKey: 'com.author.modname:transfer-dot-outline-color',
  },
};

const listeners = new Set<(state: MarkerAppearanceState) => void>();

const state: MarkerAppearanceState = {
  globalScale: loadValue('globalScale'),
  normalStationDotSize: loadValue('normalStationDotSize'),
  transferDotSize: loadValue('transferDotSize'),
  transferDotOutlineThickness: loadValue('transferDotOutlineThickness'),
  lineBadgeSize: loadValue('lineBadgeSize'),
  editRouteOrderButtonScale: loadValue('editRouteOrderButtonScale'),
  stationNameSize: loadValue('stationNameSize'),
  transferDotColor: loadValue('transferDotColor'),
  transferDotOutlineColor: loadValue('transferDotOutlineColor'),
};

function clampValue(key: NumericMarkerAppearanceKey, value: number): number {
  const setting = SETTINGS[key];
  return Math.min(setting.max!, Math.max(setting.min!, value));
}

function normalizeHexColor(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;

  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }

  return '#ffffff';
}

function loadValue<K extends MarkerAppearanceKey>(key: K): MarkerAppearanceState[K] {
  const setting = SETTINGS[key];
  const stored = window.localStorage.getItem(setting.storageKey);

  if (typeof setting.defaultValue === 'string') {
    return normalizeHexColor(stored ?? setting.defaultValue) as MarkerAppearanceState[K];
  }

  const parsed = stored ? Number.parseFloat(stored) : Number.NaN;

  if (Number.isFinite(parsed)) {
    return clampValue(key as NumericMarkerAppearanceKey, parsed) as MarkerAppearanceState[K];
  }

  return setting.defaultValue as MarkerAppearanceState[K];
}

function saveValue(key: MarkerAppearanceKey, value: string | number): void {
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

export function setMarkerAppearanceValue(key: NumericMarkerAppearanceKey, value: number): void {
  const nextValue = clampValue(key, value);

  if (nextValue === state[key]) return;

  state[key] = nextValue;
  saveValue(key, nextValue);
  emit();
}

export function setMarkerAppearanceColor(key: 'transferDotColor' | 'transferDotOutlineColor', value: string): void {
  const nextValue = normalizeHexColor(value);

  if (nextValue === state[key]) return;

  state[key] = nextValue;
  saveValue(key, nextValue);
  emit();
}

export function resetMarkerAppearance(): void {
  state.globalScale = SETTINGS.globalScale.defaultValue as number;
  state.normalStationDotSize = SETTINGS.normalStationDotSize.defaultValue as number;
  state.transferDotSize = SETTINGS.transferDotSize.defaultValue as number;
  state.transferDotOutlineThickness = SETTINGS.transferDotOutlineThickness.defaultValue as number;
  state.lineBadgeSize = SETTINGS.lineBadgeSize.defaultValue as number;
  state.editRouteOrderButtonScale = SETTINGS.editRouteOrderButtonScale.defaultValue as number;
  state.stationNameSize = SETTINGS.stationNameSize.defaultValue as number;
  state.transferDotColor = SETTINGS.transferDotColor.defaultValue as string;
  state.transferDotOutlineColor = SETTINGS.transferDotOutlineColor.defaultValue as string;

  saveValue('globalScale', state.globalScale);
  saveValue('normalStationDotSize', state.normalStationDotSize);
  saveValue('transferDotSize', state.transferDotSize);
  saveValue('transferDotOutlineThickness', state.transferDotOutlineThickness);
  saveValue('lineBadgeSize', state.lineBadgeSize);
  saveValue('editRouteOrderButtonScale', state.editRouteOrderButtonScale);
  saveValue('stationNameSize', state.stationNameSize);
  saveValue('transferDotColor', state.transferDotColor);
  saveValue('transferDotOutlineColor', state.transferDotOutlineColor);

  emit();
}

export function subscribeMarkerAppearance(listener: (state: MarkerAppearanceState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
