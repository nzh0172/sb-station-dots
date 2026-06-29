export type MarkerAppearanceKey =
  | 'globalScale'
  | 'normalStationDotSize'
  | 'normalStationDotShape'
  | 'normalStationDotOutlineThickness'
  | 'preserveTransferDotRoutesOnZoomOut'
  | 'useWhiteTransferDotsOnZoomOut'
  | 'transferDotSize'
  | 'transferDotTrafficLight'
  | 'transferDotStyle'
  | 'transferDotShape'
  | 'transferDotOutlineThickness'
  | 'lineBadgeSize'
  | 'editRouteOrderButtonScale'
  | 'stationNameSize'
  | 'stationNameLabelsVisible'
  | 'routeIconLabelsVisible'
  | 'joinTransferNames'
  | 'joinTransferNamesOrder'
  | 'preserveJoinedTransferNamesOnZoomOut'
  | 'splitRouteCodeFromName'
  | 'routeSortDirection'
  | 'routeSortByShape'
  | 'routeIconWrapWidth'
  | 'transferDotColor'
  | 'transferDotOutlineColor';

type NumericMarkerAppearanceKey = Exclude<
  MarkerAppearanceKey,
  | 'normalStationDotShape'
  | 'preserveTransferDotRoutesOnZoomOut'
  | 'useWhiteTransferDotsOnZoomOut'
  | 'transferDotTrafficLight'
  | 'transferDotStyle'
  | 'transferDotShape'
  | 'joinTransferNames'
  | 'joinTransferNamesOrder'
  | 'preserveJoinedTransferNamesOnZoomOut'
  | 'splitRouteCodeFromName'
  | 'stationNameLabelsVisible'
  | 'routeIconLabelsVisible'
  | 'routeSortDirection'
  | 'routeSortByShape'
  | 'transferDotColor'
  | 'transferDotOutlineColor'
>;

export type NormalStationDotShape = 'circle' | 'square' | 'diamond';
export type PreserveTransferDotRoutesOnZoomOut = 'off' | 'on';
export type UseWhiteTransferDotsOnZoomOut = 'off' | 'on';
export type JoinTransferNames = 'off' | 'on';
export type TransferDotTrafficLight = 'off' | 'on';
export type TransferDotStyle =
  | 'single'
  | 'traffic light'
  | 'bubbly'
  | 'tri-color'
  | 'capsule'
  | 'wormy'
  | 'sleek'
  | 'cycle';
export type JoinTransferNamesOrder = 'off' | 'on';
export type PreserveJoinedTransferNamesOnZoomOut = 'off' | 'on';
export type SplitRouteCodeFromName = 'off' | 'on';
export type LabelVisibility = 'off' | 'on';
export type RouteSortDirection = 'original' | 'ascending' | 'descending';
export type RouteSortByShape = 'off' | 'on';

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
  normalStationDotShape: NormalStationDotShape;
  normalStationDotOutlineThickness: number;
  preserveTransferDotRoutesOnZoomOut: PreserveTransferDotRoutesOnZoomOut;
  useWhiteTransferDotsOnZoomOut: UseWhiteTransferDotsOnZoomOut;
  transferDotSize: number;
  transferDotTrafficLight: TransferDotTrafficLight;
  transferDotStyle: TransferDotStyle;
  transferDotShape: NormalStationDotShape;
  transferDotOutlineThickness: number;
  lineBadgeSize: number;
  editRouteOrderButtonScale: number;
  stationNameSize: number;
  stationNameLabelsVisible: LabelVisibility;
  routeIconLabelsVisible: LabelVisibility;
  joinTransferNames: JoinTransferNames;
  joinTransferNamesOrder: JoinTransferNamesOrder;
  preserveJoinedTransferNamesOnZoomOut: PreserveJoinedTransferNamesOnZoomOut;
  splitRouteCodeFromName: SplitRouteCodeFromName;
  routeSortDirection: RouteSortDirection;
  routeSortByShape: RouteSortByShape;
  routeIconWrapWidth: number;
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
  normalStationDotShape: {
    defaultValue: 'circle',
    storageKey: 'com.author.modname:normal-station-dot-shape',
  },
  normalStationDotOutlineThickness: {
    defaultValue: 1,
    min: 0,
    max: 6,
    step: 0.5,
    storageKey: 'com.author.modname:normal-station-dot-outline-thickness-px',
  },
  preserveTransferDotRoutesOnZoomOut: {
    defaultValue: 'on',
    storageKey: 'com.author.modname:preserve-transfer-dot-routes-on-zoom-out',
  },
  useWhiteTransferDotsOnZoomOut: {
    defaultValue: 'on',
    storageKey: 'com.author.modname:use-white-transfer-dots-on-zoom-out',
  },
  transferDotSize: {
    defaultValue: 0.8,
    min: 0.45,
    max: 1.6,
    step: 0.05,
    storageKey: 'com.author.modname:transfer-dot-size-rem',
  },
  transferDotTrafficLight: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:transfer-dot-traffic light',
  },
  transferDotStyle: {
    defaultValue: 'single',
    storageKey: 'com.author.modname:transfer-dot-style',
  },
  transferDotShape: {
    defaultValue: 'circle',
    storageKey: 'com.author.modname:transfer-dot-shape',
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
  stationNameLabelsVisible: {
    defaultValue: 'on',
    storageKey: 'com.author.modname:station-name-labels-visible',
  },
  routeIconLabelsVisible: {
    defaultValue: 'on',
    storageKey: 'com.author.modname:route-icon-labels-visible',
  },
  joinTransferNames: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:join-transfer-names',
  },
  joinTransferNamesOrder: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:join-transfer-names-order',
  },
  preserveJoinedTransferNamesOnZoomOut: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:preserve-joined-transfer-names-on-zoom-out',
  },
  splitRouteCodeFromName: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:split-route-code-from-name',
  },
  routeSortDirection: {
    defaultValue: 'original',
    storageKey: 'com.author.modname:route-sort-direction',
  },
  routeSortByShape: {
    defaultValue: 'off',
    storageKey: 'com.author.modname:route-sort-by-shape',
  },
  routeIconWrapWidth: {
    defaultValue: 88,
    min: 44,
    max: 220,
    step: 4,
    storageKey: 'com.author.modname:route-icon-wrap-width-px',
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
  normalStationDotShape: loadValue('normalStationDotShape'),
  normalStationDotOutlineThickness: loadValue('normalStationDotOutlineThickness'),
  preserveTransferDotRoutesOnZoomOut: loadValue('preserveTransferDotRoutesOnZoomOut'),
  useWhiteTransferDotsOnZoomOut: loadValue('useWhiteTransferDotsOnZoomOut'),
  transferDotSize: loadValue('transferDotSize'),
  transferDotTrafficLight: loadValue('transferDotTrafficLight'),
  transferDotShape: loadValue('transferDotShape'),
  transferDotOutlineThickness: loadValue('transferDotOutlineThickness'),
  transferDotStyle: loadValue('transferDotStyle'),
  lineBadgeSize: loadValue('lineBadgeSize'),
  editRouteOrderButtonScale: loadValue('editRouteOrderButtonScale'),
  stationNameSize: loadValue('stationNameSize'),
  stationNameLabelsVisible: loadValue('stationNameLabelsVisible'),
  routeIconLabelsVisible: loadValue('routeIconLabelsVisible'),
  joinTransferNames: loadValue('joinTransferNames'),
  joinTransferNamesOrder: loadValue('joinTransferNamesOrder'),
  preserveJoinedTransferNamesOnZoomOut: loadValue('preserveJoinedTransferNamesOnZoomOut'),
  splitRouteCodeFromName: loadValue('splitRouteCodeFromName'),
  routeSortDirection: loadValue('routeSortDirection'),
  routeSortByShape: loadValue('routeSortByShape'),
  routeIconWrapWidth: loadValue('routeIconWrapWidth'),
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

function normalizeStationDotShape(value: string): NormalStationDotShape {
  switch (value.trim().toLowerCase()) {
    case 'square':
      return 'square';
    case 'diamond':
      return 'diamond';
    default:
      return 'circle';
  }
}

function normalizeRouteSortDirection(value: string): RouteSortDirection {
  switch (value.trim().toLowerCase()) {
    case 'ascending':
      return 'ascending';
    case 'descending':
      return 'descending';
    default:
      return 'original';
  }
}

function normalizeRouteSortByShape(value: string): RouteSortByShape {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeTransferDotTrafficLight(value: string): TransferDotTrafficLight {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeTransferDotStyle(value: string): TransferDotStyle {
  switch (value.trim().toLowerCase()) {
    case 'bubbly':
      return 'bubbly';
    case 'capsule':
      return 'capsule';
    case 'wormy':
    case 'gummy worm':
    case 'gummy-worm':
    case 'gummy_worm':
      return 'wormy';
    case 'sleek':
      return 'sleek';
    case 'cycle':
      return 'cycle';
    case 'tri-color':
      return 'tri-color';
    case 'traffic light':
    case 'traffic-light':
    case 'traffic_light':
      return 'traffic light';
    default:
      return 'single';
  }
}

function normalizeJoinTransferNames(value: string): JoinTransferNames {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeJoinTransferNamesOrder(value: string): JoinTransferNamesOrder {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'on' || normalized === 'alphabetical') return 'on';
  return 'off';
}

function normalizePreserveJoinedTransferNamesOnZoomOut(value: string): PreserveJoinedTransferNamesOnZoomOut {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeSplitRouteCodeFromName(value: string): SplitRouteCodeFromName {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeUseWhiteTransferDotsOnZoomOut(value: string): UseWhiteTransferDotsOnZoomOut {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizePreserveTransferDotRoutesOnZoomOut(value: string): PreserveTransferDotRoutesOnZoomOut {
  return value.trim().toLowerCase() === 'on' ? 'on' : 'off';
}

function normalizeLabelVisibility(value: string): LabelVisibility {
  return value.trim().toLowerCase() === 'off' ? 'off' : 'on';
}

function loadValue<K extends MarkerAppearanceKey>(key: K): MarkerAppearanceState[K] {
  const setting = SETTINGS[key];
  const stored = window.localStorage.getItem(setting.storageKey);

  if (key === 'normalStationDotShape' || key === 'transferDotShape') {
    return normalizeStationDotShape(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'joinTransferNames') {
    return normalizeJoinTransferNames(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'transferDotTrafficLight') {
    return normalizeTransferDotTrafficLight(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'transferDotStyle') {
    const legacyCapsule = window.localStorage.getItem(SETTINGS.transferDotTrafficLight.storageKey);
    const fallback = legacyCapsule === 'on' ? 'traffic light' : String(setting.defaultValue);
    return normalizeTransferDotStyle(stored ?? fallback) as MarkerAppearanceState[K];
  }

  if (key === 'joinTransferNamesOrder') {
    return normalizeJoinTransferNamesOrder(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'preserveJoinedTransferNamesOnZoomOut') {
    return normalizePreserveJoinedTransferNamesOnZoomOut(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'splitRouteCodeFromName') {
    return normalizeSplitRouteCodeFromName(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'useWhiteTransferDotsOnZoomOut') {
    return normalizeUseWhiteTransferDotsOnZoomOut(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'preserveTransferDotRoutesOnZoomOut') {
    return normalizePreserveTransferDotRoutesOnZoomOut(
      String(SETTINGS.preserveTransferDotRoutesOnZoomOut.defaultValue),
    ) as MarkerAppearanceState[K];
  }

  if (key === 'stationNameLabelsVisible' || key === 'routeIconLabelsVisible') {
    return normalizeLabelVisibility(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'routeSortDirection') {
    return normalizeRouteSortDirection(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

  if (key === 'routeSortByShape') {
    return normalizeRouteSortByShape(stored ?? String(setting.defaultValue)) as MarkerAppearanceState[K];
  }

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

export function setMarkerAppearanceShape(key: 'normalStationDotShape' | 'transferDotShape', value: string): void {
  const nextValue = normalizeStationDotShape(value);

  if (nextValue === state[key]) return;

  state[key] = nextValue;
  saveValue(key, nextValue);
  emit();
}

export function setTransferDotTrafficLight(value: string): void {
  const nextValue = normalizeTransferDotTrafficLight(value);

  if (nextValue === state.transferDotTrafficLight) return;

  state.transferDotTrafficLight = nextValue;
  saveValue('transferDotTrafficLight', nextValue);
  emit();
}

export function setTransferDotStyle(value: string): void {
  const nextValue = normalizeTransferDotStyle(value);

  if (nextValue === state.transferDotStyle) return;

  state.transferDotStyle = nextValue;
  state.transferDotTrafficLight = nextValue === 'traffic light' ? 'on' : 'off';
  saveValue('transferDotStyle', nextValue);
  saveValue('transferDotTrafficLight', state.transferDotTrafficLight);
  emit();
}

export function setRouteSortDirection(value: string): void {
  const nextValue = normalizeRouteSortDirection(value);

  if (nextValue === state.routeSortDirection) return;

  state.routeSortDirection = nextValue;
  saveValue('routeSortDirection', nextValue);
  emit();
}

export function setJoinTransferNames(value: string): void {
  const nextValue = normalizeJoinTransferNames(value);

  const shouldResetPreserve = nextValue === 'off' && state.preserveJoinedTransferNamesOnZoomOut !== 'off';
  if (nextValue === state.joinTransferNames && !shouldResetPreserve) return;

  state.joinTransferNames = nextValue;
  saveValue('joinTransferNames', nextValue);

  if (nextValue === 'off') {
    state.preserveJoinedTransferNamesOnZoomOut = 'off';
    saveValue('preserveJoinedTransferNamesOnZoomOut', state.preserveJoinedTransferNamesOnZoomOut);
  }

  emit();
}

export function setJoinTransferNamesOrder(value: string): void {
  const nextValue = normalizeJoinTransferNamesOrder(value);

  if (nextValue === state.joinTransferNamesOrder) return;

  state.joinTransferNamesOrder = nextValue;
  saveValue('joinTransferNamesOrder', nextValue);
  emit();
}

export function setPreserveJoinedTransferNamesOnZoomOut(value: string): void {
  const nextValue = normalizePreserveJoinedTransferNamesOnZoomOut(value);

  if (nextValue === state.preserveJoinedTransferNamesOnZoomOut) return;

  state.preserveJoinedTransferNamesOnZoomOut = nextValue;
  saveValue('preserveJoinedTransferNamesOnZoomOut', nextValue);
  emit();
}

export function setSplitRouteCodeFromName(value: string): void {
  const nextValue = normalizeSplitRouteCodeFromName(value);

  if (nextValue === state.splitRouteCodeFromName) return;

  state.splitRouteCodeFromName = nextValue;
  saveValue('splitRouteCodeFromName', nextValue);
  emit();
}

export function setUseWhiteTransferDotsOnZoomOut(value: string): void {
  const nextValue = normalizeUseWhiteTransferDotsOnZoomOut(value);

  if (nextValue === state.useWhiteTransferDotsOnZoomOut) return;

  state.useWhiteTransferDotsOnZoomOut = nextValue;
  saveValue('useWhiteTransferDotsOnZoomOut', nextValue);
  emit();
}

export function setPreserveTransferDotRoutesOnZoomOut(value: string): void {
  const nextValue = normalizePreserveTransferDotRoutesOnZoomOut(value);

  if (nextValue === state.preserveTransferDotRoutesOnZoomOut) return;

  state.preserveTransferDotRoutesOnZoomOut = nextValue;
  saveValue('preserveTransferDotRoutesOnZoomOut', nextValue);
  emit();
}

export function setLabelVisibility(key: 'stationNameLabelsVisible' | 'routeIconLabelsVisible', value: string): void {
  const nextValue = normalizeLabelVisibility(value);

  if (nextValue === state[key]) return;

  state[key] = nextValue;
  saveValue(key, nextValue);
  emit();
}

export function setRouteSortByShape(value: string): void {
  const nextValue = normalizeRouteSortByShape(value);

  if (nextValue === state.routeSortByShape) return;

  state.routeSortByShape = nextValue;
  saveValue('routeSortByShape', nextValue);
  emit();
}

export function resetMarkerAppearance(): void {
  state.globalScale = SETTINGS.globalScale.defaultValue as number;
  state.normalStationDotSize = SETTINGS.normalStationDotSize.defaultValue as number;
  state.normalStationDotShape = SETTINGS.normalStationDotShape.defaultValue as NormalStationDotShape;
  state.normalStationDotOutlineThickness = SETTINGS.normalStationDotOutlineThickness.defaultValue as number;
  state.preserveTransferDotRoutesOnZoomOut =
    SETTINGS.preserveTransferDotRoutesOnZoomOut.defaultValue as PreserveTransferDotRoutesOnZoomOut;
  state.useWhiteTransferDotsOnZoomOut =
    SETTINGS.useWhiteTransferDotsOnZoomOut.defaultValue as UseWhiteTransferDotsOnZoomOut;
  state.transferDotSize = SETTINGS.transferDotSize.defaultValue as number;
  state.transferDotTrafficLight = SETTINGS.transferDotTrafficLight.defaultValue as TransferDotTrafficLight;
  state.transferDotStyle = SETTINGS.transferDotStyle.defaultValue as TransferDotStyle;
  state.transferDotShape = SETTINGS.transferDotShape.defaultValue as NormalStationDotShape;
  state.transferDotOutlineThickness = SETTINGS.transferDotOutlineThickness.defaultValue as number;
  state.lineBadgeSize = SETTINGS.lineBadgeSize.defaultValue as number;
  state.editRouteOrderButtonScale = SETTINGS.editRouteOrderButtonScale.defaultValue as number;
  state.stationNameSize = SETTINGS.stationNameSize.defaultValue as number;
  state.stationNameLabelsVisible = SETTINGS.stationNameLabelsVisible.defaultValue as LabelVisibility;
  state.routeIconLabelsVisible = SETTINGS.routeIconLabelsVisible.defaultValue as LabelVisibility;
  state.joinTransferNames = SETTINGS.joinTransferNames.defaultValue as JoinTransferNames;
  state.joinTransferNamesOrder = SETTINGS.joinTransferNamesOrder.defaultValue as JoinTransferNamesOrder;
  state.preserveJoinedTransferNamesOnZoomOut =
    SETTINGS.preserveJoinedTransferNamesOnZoomOut.defaultValue as PreserveJoinedTransferNamesOnZoomOut;
  state.splitRouteCodeFromName = SETTINGS.splitRouteCodeFromName.defaultValue as SplitRouteCodeFromName;
  state.routeSortDirection = SETTINGS.routeSortDirection.defaultValue as RouteSortDirection;
  state.routeSortByShape = SETTINGS.routeSortByShape.defaultValue as RouteSortByShape;
  state.routeIconWrapWidth = SETTINGS.routeIconWrapWidth.defaultValue as number;
  state.transferDotColor = SETTINGS.transferDotColor.defaultValue as string;
  state.transferDotOutlineColor = SETTINGS.transferDotOutlineColor.defaultValue as string;

  saveValue('globalScale', state.globalScale);
  saveValue('normalStationDotSize', state.normalStationDotSize);
  saveValue('normalStationDotShape', state.normalStationDotShape);
  saveValue('normalStationDotOutlineThickness', state.normalStationDotOutlineThickness);
  saveValue('preserveTransferDotRoutesOnZoomOut', state.preserveTransferDotRoutesOnZoomOut);
  saveValue('useWhiteTransferDotsOnZoomOut', state.useWhiteTransferDotsOnZoomOut);
  saveValue('transferDotSize', state.transferDotSize);
  saveValue('transferDotTrafficLight', state.transferDotTrafficLight);
  saveValue('transferDotStyle', state.transferDotStyle);
  saveValue('transferDotShape', state.transferDotShape);
  saveValue('transferDotOutlineThickness', state.transferDotOutlineThickness);
  saveValue('lineBadgeSize', state.lineBadgeSize);
  saveValue('editRouteOrderButtonScale', state.editRouteOrderButtonScale);
  saveValue('stationNameSize', state.stationNameSize);
  saveValue('stationNameLabelsVisible', state.stationNameLabelsVisible);
  saveValue('routeIconLabelsVisible', state.routeIconLabelsVisible);
  saveValue('joinTransferNames', state.joinTransferNames);
  saveValue('joinTransferNamesOrder', state.joinTransferNamesOrder);
  saveValue('preserveJoinedTransferNamesOnZoomOut', state.preserveJoinedTransferNamesOnZoomOut);
  saveValue('splitRouteCodeFromName', state.splitRouteCodeFromName);
  saveValue('routeSortDirection', state.routeSortDirection);
  saveValue('routeSortByShape', state.routeSortByShape);
  saveValue('routeIconWrapWidth', state.routeIconWrapWidth);
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
