/**
 * My Subway Builder Mod
 * Entry point for the mod.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import { MarkerAppearanceToolbarHost, TransferDotPanel, setToolbarPanelComponent } from './ui/ExamplePanel';
import {
  getMarkerAppearance,
  subscribeMarkerAppearance,
  type JoinTransferNames,
  type NormalStationDotShape,
  type RouteSortByShape,
  type RouteSortDirection,
} from './markerAppearance';

const MOD_ID = 'com.naz.station-dots';
const MOD_VERSION = '1.0.0';
const TAG = '[Station Dots]';
const STATION_DOT_SELECTOR = '.maplibregl-marker .rounded-full.relative.border-\\[1px\\]';
const LINE_BADGE_ROW_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5';
const LINE_BADGE_WRAPPER_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5 > .relative:has(> .font-mta.cursor-pointer)';
const LINE_BADGE_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5 > .relative > .font-mta.cursor-pointer';
const EDIT_ROUTE_ORDER_BUTTON_SELECTOR =
  '.maplibregl-marker .flex.relative.border-background.w-fit.gap-0\\.5 > .cursor-pointer';
const STATION_NAME_SELECTOR = '.maplibregl-marker p.transition-transform.duration-300.font-bold.text-stroke';
const STATION_NAME_WRAPPER_SELECTOR = '.maplibregl-marker .flex.flex-col.items-start.ml-0';
const STATION_NAME_HOVER_SCALE = 1.18;
const HOVER_ANIMATION_DURATION_MS = 140;
const HOVER_ANIMATION_EASING = 'ease-out';

const api = window.SubwayBuilderAPI;
const CLEANUP_KEY = '__markerAppearanceCleanup';
const TOOLBAR_PANEL_TITLE = 'Station Dots';

type CleanupHandle = {
  observer?: MutationObserver;
  unsubscribe?: () => void;
  removeInteractionListeners?: () => void;
};

let isApplyingMarkerAppearance = false;

type LineBadgeMetrics = {
  height: number;
  minWidth: number;
  fontSize: number;
  paddingLeft: number;
  paddingRight: number;
};

type LineBadgeWrapperMetrics = {
  height: number;
  maxHeight: number;
};

type EditRouteOrderButtonMetrics = {
  width: number;
  height: number;
  maxHeight: number;
};

type EditRouteOrderIconMetrics = {
  width: number;
  height: number;
};

type EditRouteOrderLabelMetrics = {
  fontSize: number;
};

type StationNameWrapperMetrics = {
  maxWidth: number;
};

type TransferStationGroup = {
  names: string[];
  routeBullets: string[];
};

function parsePixelValue(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = value.match(/-?\d*\.?\d+/);
  if (!match) return null;

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getElementHeight(element: HTMLElement): number {
  const computedHeight = parsePixelValue(getComputedStyle(element).height);
  if (computedHeight !== null && computedHeight > 0) return computedHeight;

  const inlineHeight = parsePixelValue(element.style.height);
  if (inlineHeight !== null && inlineHeight > 0) return inlineHeight;

  return element.getBoundingClientRect().height;
}

function getElementMinWidth(element: HTMLElement): number {
  const computedMinWidth = parsePixelValue(getComputedStyle(element).minWidth);
  if (computedMinWidth !== null && computedMinWidth > 0) return computedMinWidth;

  const inlineMinWidth = parsePixelValue(element.style.minWidth);
  if (inlineMinWidth !== null && inlineMinWidth > 0) return inlineMinWidth;

  return element.getBoundingClientRect().width;
}

function getElementWidth(element: HTMLElement): number {
  const computedWidth = parsePixelValue(getComputedStyle(element).width);
  if (computedWidth !== null && computedWidth > 0) return computedWidth;

  const inlineWidth = parsePixelValue(element.style.width);
  if (inlineWidth !== null && inlineWidth > 0) return inlineWidth;

  return element.getBoundingClientRect().width;
}

function getElementMaxWidth(element: HTMLElement): number {
  const computedMaxWidth = parsePixelValue(getComputedStyle(element).maxWidth);
  if (computedMaxWidth !== null && computedMaxWidth > 0) return computedMaxWidth;

  const inlineMaxWidth = parsePixelValue(element.style.maxWidth);
  if (inlineMaxWidth !== null && inlineMaxWidth > 0) return inlineMaxWidth;

  return element.getBoundingClientRect().width;
}

function scalePixelTransforms(value: string, scale: number): string {
  if (!value || scale === 1) return value;
  return value.replace(/(-?\d*\.?\d+)px/g, (_, numericValue: string) => `${Number.parseFloat(numericValue) * scale}px`);
}

function isMarkerActive(marker: HTMLElement): boolean {
  return marker.matches(':hover') || marker.contains(document.activeElement);
}

function normalizeLabelText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function buildTransferStationGroups(): TransferStationGroup[] {
  if (!api?.gameState) return [];

  const stations = api.gameState.getStations();
  const stationGroups = api.gameState.getStationGroups();
  const routes = api.gameState.getRoutes();
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const routeBulletById = new Map(
    routes.map((route) => [route.id, normalizeLabelText(route.bullet?.trim() || route.name?.trim() || '')]),
  );
  return stationGroups
    .map((group) => {
      const groupStations = group.stationIds
        .map((stationId) => stationById.get(stationId))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

      const names = Array.from(
        new Set(groupStations.map((entry) => normalizeLabelText(entry.name)).filter((entry) => entry.length > 0)),
      );

      const routeBullets = Array.from(
        new Set(
          groupStations
            .flatMap((entry) => entry.routeIds)
            .map((routeId) => routeBulletById.get(routeId) ?? '')
            .filter((entry) => entry.length > 0),
        ),
      ).sort((left, right) => compareRouteBadgeLabels(left, right));

      return { names, routeBullets };
    })
    .filter((group) => group.names.length > 1 && group.routeBullets.length > 0);
}

function arraysMatch(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function getMarkerRouteBadgeLabels(marker: HTMLElement): string[] {
  return Array.from(marker.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR))
    .map((badge) => normalizeLabelText(badge.textContent ?? ''))
    .filter((label) => label.length > 0)
    .sort((left, right) => compareRouteBadgeLabels(left, right));
}

function getTransferStationLabel(marker: HTMLElement, fallbackName: string, joinTransferNames: JoinTransferNames): string {
  const normalizedFallbackName = normalizeLabelText(fallbackName);
  if (joinTransferNames !== 'on') return normalizedFallbackName;

  const routeBullets = getMarkerRouteBadgeLabels(marker);
  if (routeBullets.length === 0) return normalizedFallbackName;

  const matchingGroup = buildTransferStationGroups().find((group) => {
    return arraysMatch(group.routeBullets, routeBullets) && group.names.includes(normalizedFallbackName);
  });

  if (!matchingGroup) return normalizedFallbackName;

  return matchingGroup.names.join('/');
}

function compareRouteBadgeLabels(left: string, right: string): number {
  const leftNumber = Number.parseFloat(left);
  const rightNumber = Number.parseFloat(right);
  const leftIsNumber = Number.isFinite(leftNumber);
  const rightIsNumber = Number.isFinite(rightNumber);

  if (leftIsNumber && rightIsNumber) {
    return leftNumber - rightNumber;
  }

  if (leftIsNumber) return -1;
  if (rightIsNumber) return 1;

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function getOriginalRouteBadgeOrder(wrapper: HTMLElement, fallbackIndex: number): number {
  const cachedOrder = Number.parseInt(wrapper.dataset.stationDotsOriginalOrder ?? '', 10);
  if (Number.isFinite(cachedOrder)) {
    return cachedOrder;
  }

  wrapper.dataset.stationDotsOriginalOrder = String(fallbackIndex);
  return fallbackIndex;
}

function getRouteBadgeLabel(wrapper: HTMLElement): string {
  return wrapper.querySelector<HTMLElement>(':scope > .font-mta.cursor-pointer > span')?.textContent?.trim() ?? '';
}

function getRouteBadgeShapeName(wrapper: HTMLElement): 'circle' | 'square' | 'diamond' | 'other' {
  const badge = wrapper.querySelector<HTMLElement>(':scope > .font-mta.cursor-pointer');
  if (!(badge instanceof HTMLElement)) return 'other';

  const computedStyle = getComputedStyle(badge);
  const inlineTransform = badge.style.transform.toLowerCase();
  const computedTransform = computedStyle.transform.toLowerCase();
  const clipPath = `${badge.style.clipPath} ${computedStyle.clipPath}`.toLowerCase();
  if (inlineTransform.includes('rotate(45deg)') || computedTransform !== 'none' || clipPath.includes('polygon')) {
    return 'diamond';
  }

  const metrics = getBaseLineBadgeMetrics(badge);
  if (metrics.height <= 0) return 'other';

  const widthHeightRatio = metrics.minWidth / metrics.height;
  const borderRadius = parsePixelValue(badge.style.borderRadius || computedStyle.borderRadius) ?? 0;
  const isCircle = borderRadius >= metrics.height / 2 - 0.5;
  const isPill = borderRadius >= metrics.height / 2 - 0.5 && widthHeightRatio > 1.1;
  if (isCircle && !isPill) {
    return 'circle';
  }

  if (widthHeightRatio <= 1.1) {
    return 'square';
  }

  return 'square';
}

function getRouteBadgeShapeOrder(wrapper: HTMLElement): number {
  switch (getRouteBadgeShapeName(wrapper)) {
    case 'circle':
      return 0;
    case 'square':
      return 1;
    case 'diamond':
      return 2;
    default:
      return 3;
  }
}

function sortRouteBadges(root: ParentNode, direction: RouteSortDirection, sortByShape: RouteSortByShape): void {
  const containers = root.querySelectorAll<HTMLElement>(LINE_BADGE_ROW_SELECTOR);

  containers.forEach((container) => {
    const wrappers = Array.from(container.children).filter((child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) return false;
      return child.classList.contains('relative') && child.querySelector(':scope > .font-mta.cursor-pointer') !== null;
    });

    if (wrappers.length < 2) return;

    wrappers.forEach((wrapper, index) => {
      getOriginalRouteBadgeOrder(wrapper, index);
    });

    const sortedWrappers = [...wrappers].sort((leftWrapper, rightWrapper) => {
      if (direction === 'original') {
        return getOriginalRouteBadgeOrder(leftWrapper, 0) - getOriginalRouteBadgeOrder(rightWrapper, 0);
      }

      const leftLabel = getRouteBadgeLabel(leftWrapper);
      const rightLabel = getRouteBadgeLabel(rightWrapper);

      const order =
        sortByShape === 'on'
          ? getRouteBadgeShapeOrder(leftWrapper) - getRouteBadgeShapeOrder(rightWrapper) ||
            compareRouteBadgeLabels(leftLabel, rightLabel)
          : compareRouteBadgeLabels(leftLabel, rightLabel);
      return direction === 'descending' ? order * -1 : order;
    });

    sortedWrappers.forEach((wrapper) => {
      container.appendChild(wrapper);
    });
  });
}

function getBaseLineBadgeMetrics(badge: HTMLElement): LineBadgeMetrics {
  const cachedHeight = Number.parseFloat(badge.dataset.stationDotsBaseHeight ?? '');
  const cachedMinWidth = Number.parseFloat(badge.dataset.stationDotsBaseMinWidth ?? '');
  const cachedFontSize = Number.parseFloat(badge.dataset.stationDotsBaseFontSize ?? '');
  const cachedPaddingLeft = Number.parseFloat(badge.dataset.stationDotsBasePaddingLeft ?? '');
  const cachedPaddingRight = Number.parseFloat(badge.dataset.stationDotsBasePaddingRight ?? '');

  if (
    Number.isFinite(cachedHeight) &&
    Number.isFinite(cachedMinWidth) &&
    Number.isFinite(cachedFontSize) &&
    Number.isFinite(cachedPaddingLeft) &&
    Number.isFinite(cachedPaddingRight)
  ) {
    return {
      height: cachedHeight,
      minWidth: cachedMinWidth,
      fontSize: cachedFontSize,
      paddingLeft: cachedPaddingLeft,
      paddingRight: cachedPaddingRight,
    };
  }

  const computedStyle = getComputedStyle(badge);
  const metrics: LineBadgeMetrics = {
    height: getElementHeight(badge),
    minWidth: getElementMinWidth(badge),
    fontSize: parsePixelValue(computedStyle.fontSize) ?? 0,
    paddingLeft: parsePixelValue(computedStyle.paddingLeft) ?? 0,
    paddingRight: parsePixelValue(computedStyle.paddingRight) ?? 0,
  };

  badge.dataset.stationDotsBaseHeight = String(metrics.height);
  badge.dataset.stationDotsBaseMinWidth = String(metrics.minWidth);
  badge.dataset.stationDotsBaseFontSize = String(metrics.fontSize);
  badge.dataset.stationDotsBasePaddingLeft = String(metrics.paddingLeft);
  badge.dataset.stationDotsBasePaddingRight = String(metrics.paddingRight);

  return metrics;
}

function getBaseStationNameWrapperMetrics(wrapper: HTMLElement): StationNameWrapperMetrics {
  const cachedMaxWidth = Number.parseFloat(wrapper.dataset.stationDotsBaseMaxWidth ?? '');
  if (Number.isFinite(cachedMaxWidth)) {
    return { maxWidth: cachedMaxWidth };
  }

  const metrics: StationNameWrapperMetrics = {
    maxWidth: getElementMaxWidth(wrapper),
  };

  wrapper.dataset.stationDotsBaseMaxWidth = String(metrics.maxWidth);
  return metrics;
}

function getBaseLineBadgeWrapperMetrics(wrapper: HTMLElement): LineBadgeWrapperMetrics {
  const cachedHeight = Number.parseFloat(wrapper.dataset.stationDotsBaseHeight ?? '');
  const cachedMaxHeight = Number.parseFloat(wrapper.dataset.stationDotsBaseMaxHeight ?? '');

  if (Number.isFinite(cachedHeight) && Number.isFinite(cachedMaxHeight)) {
    return {
      height: cachedHeight,
      maxHeight: cachedMaxHeight,
    };
  }

  const computedStyle = getComputedStyle(wrapper);
  const height = getElementHeight(wrapper);
  const maxHeight = parsePixelValue(computedStyle.maxHeight) ?? height;
  const metrics: LineBadgeWrapperMetrics = { height, maxHeight };

  wrapper.dataset.stationDotsBaseHeight = String(metrics.height);
  wrapper.dataset.stationDotsBaseMaxHeight = String(metrics.maxHeight);

  return metrics;
}

function getBaseEditRouteOrderButtonMetrics(button: HTMLElement): EditRouteOrderButtonMetrics {
  const cachedWidth = Number.parseFloat(button.dataset.stationDotsRouteButtonBaseWidth ?? '');
  const cachedHeight = Number.parseFloat(button.dataset.stationDotsRouteButtonBaseHeight ?? '');
  const cachedMaxHeight = Number.parseFloat(button.dataset.stationDotsRouteButtonBaseMaxHeight ?? '');

  if (Number.isFinite(cachedWidth) && Number.isFinite(cachedHeight) && Number.isFinite(cachedMaxHeight)) {
    return {
      width: cachedWidth,
      height: cachedHeight,
      maxHeight: cachedMaxHeight,
    };
  }

  const computedStyle = getComputedStyle(button);
  const metrics: EditRouteOrderButtonMetrics = {
    width: getElementWidth(button),
    height: getElementHeight(button),
    maxHeight: parsePixelValue(computedStyle.maxHeight) ?? getElementHeight(button),
  };

  button.dataset.stationDotsRouteButtonBaseWidth = String(metrics.width);
  button.dataset.stationDotsRouteButtonBaseHeight = String(metrics.height);
  button.dataset.stationDotsRouteButtonBaseMaxHeight = String(metrics.maxHeight);

  return metrics;
}

function getBaseEditRouteOrderIconMetrics(icon: SVGSVGElement): EditRouteOrderIconMetrics {
  const cachedWidth = Number.parseFloat(icon.dataset.stationDotsRouteButtonIconBaseWidth ?? '');
  const cachedHeight = Number.parseFloat(icon.dataset.stationDotsRouteButtonIconBaseHeight ?? '');

  if (Number.isFinite(cachedWidth) && Number.isFinite(cachedHeight)) {
    return {
      width: cachedWidth,
      height: cachedHeight,
    };
  }

  const computedStyle = getComputedStyle(icon);
  const metrics: EditRouteOrderIconMetrics = {
    width: parsePixelValue(computedStyle.width) ?? icon.getBoundingClientRect().width,
    height: parsePixelValue(computedStyle.height) ?? icon.getBoundingClientRect().height,
  };

  icon.dataset.stationDotsRouteButtonIconBaseWidth = String(metrics.width);
  icon.dataset.stationDotsRouteButtonIconBaseHeight = String(metrics.height);

  return metrics;
}

function getBaseEditRouteOrderLabelMetrics(label: HTMLElement): EditRouteOrderLabelMetrics {
  const cachedFontSize = Number.parseFloat(label.dataset.stationDotsRouteButtonLabelBaseFontSize ?? '');

  if (Number.isFinite(cachedFontSize)) {
    return {
      fontSize: cachedFontSize,
    };
  }

  const computedStyle = getComputedStyle(label);
  const metrics: EditRouteOrderLabelMetrics = {
    fontSize: parsePixelValue(computedStyle.fontSize) ?? 0,
  };

  label.dataset.stationDotsRouteButtonLabelBaseFontSize = String(metrics.fontSize);

  return metrics;
}

function normalizeColor(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function isStationMarkerDot(dot: HTMLElement): boolean {
  const backgroundColor = normalizeColor(dot.style.backgroundColor || getComputedStyle(dot).backgroundColor);
  return backgroundColor.length > 0 && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0,0,0,0)';
}

function isTransferDot(dot: HTMLElement): boolean {
  const backgroundColor = normalizeColor(dot.style.backgroundColor || getComputedStyle(dot).backgroundColor);
  return (
    backgroundColor === 'white' ||
    backgroundColor === '#fff' ||
    backgroundColor === '#ffffff' ||
    backgroundColor === 'rgb(255,255,255)'
  );
}

function getDotKind(dot: HTMLElement): 'transfer' | 'station' | null {
  const cachedKind = dot.dataset.stationDotsKind;
  if (cachedKind === 'transfer' || cachedKind === 'station') {
    return cachedKind;
  }

  if (!isStationMarkerDot(dot)) {
    return null;
  }

  const kind = isTransferDot(dot) ? 'transfer' : 'station';
  dot.dataset.stationDotsKind = kind;
  return kind;
}

function applyNormalStationDotShape(dot: HTMLElement, shape: NormalStationDotShape): void {
  dot.style.clipPath = '';
  dot.style.transform = '';

  if (shape === 'square') {
    dot.style.borderRadius = '0';
    return;
  }

  if (shape === 'diamond') {
    dot.style.borderRadius = '0';
    dot.style.transform = 'rotate(45deg) scale(0.85)';
    return;
  }

  dot.style.borderRadius = '9999px';
}

function applyMarkerAppearance(root: ParentNode): void {
  isApplyingMarkerAppearance = true;
  const {
    globalScale,
    normalStationDotSize,
    normalStationDotShape,
    normalStationDotOutlineThickness,
    transferDotSize,
    transferDotShape,
    transferDotOutlineThickness,
    lineBadgeSize,
    editRouteOrderButtonScale,
    stationNameSize,
    joinTransferNames,
    routeIconWrapWidth,
    routeSortByShape,
    routeSortDirection,
    transferDotColor,
    transferDotOutlineColor,
  } = getMarkerAppearance();
  sortRouteBadges(root, routeSortDirection, routeSortByShape);
  const dots = root.querySelectorAll<HTMLElement>(STATION_DOT_SELECTOR);
  const lineBadgeRows = root.querySelectorAll<HTMLElement>(LINE_BADGE_ROW_SELECTOR);
  const lineBadgeWrappers = root.querySelectorAll<HTMLElement>(LINE_BADGE_WRAPPER_SELECTOR);
  const lineBadges = root.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR);
  const editRouteOrderButtons = root.querySelectorAll<HTMLElement>(EDIT_ROUTE_ORDER_BUTTON_SELECTOR);
  const stationNames = root.querySelectorAll<HTMLElement>(STATION_NAME_SELECTOR);

  dots.forEach((dot) => {
    const dotKind = getDotKind(dot);
    if (!dotKind) return;

    const dotSize = (dotKind === 'transfer' ? transferDotSize : normalStationDotSize) * globalScale;
    dot.style.width = `${dotSize}rem`;
    dot.style.height = `${dotSize}rem`;

    if (dotKind === 'transfer') {
      applyNormalStationDotShape(dot, transferDotShape);
      dot.style.backgroundColor = transferDotColor;
      dot.style.borderColor = transferDotOutlineColor;
      dot.style.borderWidth = `${transferDotOutlineThickness * globalScale}px`;
    } else {
      applyNormalStationDotShape(dot, normalStationDotShape);
      dot.style.borderColor = '';
      dot.style.borderWidth = `${normalStationDotOutlineThickness * globalScale}px`;
    }
  });

  lineBadgeRows.forEach((row) => {
    row.style.flexWrap = 'wrap';
    row.style.alignItems = 'flex-start';
    row.style.width = `${routeIconWrapWidth * globalScale}px`;
    row.style.maxWidth = `${routeIconWrapWidth * globalScale}px`;
    row.style.overflow = 'visible';
  });

  lineBadgeWrappers.forEach((wrapper) => {
    const effectiveLineBadgeSize = lineBadgeSize * globalScale;
    const metrics = getBaseLineBadgeWrapperMetrics(wrapper);
    const referenceBadge = wrapper.querySelector<HTMLElement>(':scope > .font-mta.cursor-pointer');
    const referenceHeight = referenceBadge ? getBaseLineBadgeMetrics(referenceBadge).height : metrics.height;
    const scale = referenceHeight > 0 ? effectiveLineBadgeSize / referenceHeight : 1;
    const marker = wrapper.closest('.maplibregl-marker');
    const isActive = marker instanceof HTMLElement ? isMarkerActive(marker) : false;
    const hoverScale = isActive ? STATION_NAME_HOVER_SCALE : 1;

    wrapper.style.height = `${metrics.height * scale * hoverScale}px`;
    wrapper.style.maxHeight = `${metrics.maxHeight * scale * hoverScale}px`;
    wrapper.style.overflow = '';
    wrapper.style.transformOrigin = '';
    wrapper.style.transitionProperty = 'height, max-height';
    wrapper.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    wrapper.style.transitionTimingFunction = HOVER_ANIMATION_EASING;
    wrapper.style.transform = '';
  });

  lineBadges.forEach((badge) => {
    const effectiveLineBadgeSize = lineBadgeSize * globalScale;
    const metrics = getBaseLineBadgeMetrics(badge);
    const marker = badge.closest('.maplibregl-marker');
    const isActive = marker instanceof HTMLElement ? isMarkerActive(marker) : false;
    const hoverScale = isActive ? STATION_NAME_HOVER_SCALE : 1;
    const scale = metrics.height > 0 ? (effectiveLineBadgeSize * hoverScale) / metrics.height : 1;

    badge.style.minWidth = `${metrics.minWidth * scale}px`;
    badge.style.height = `${effectiveLineBadgeSize * hoverScale}px`;
    badge.style.fontSize = `${Math.max(8, metrics.fontSize * scale)}px`;
    badge.style.paddingLeft = `${Math.max(0, metrics.paddingLeft * scale)}px`;
    badge.style.paddingRight = `${Math.max(0, metrics.paddingRight * scale)}px`;
    badge.style.transitionProperty = 'min-width, height, font-size, padding-left, padding-right, color, background-color, border-color, opacity';
    badge.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    badge.style.transitionTimingFunction = HOVER_ANIMATION_EASING;

    const label = badge.querySelector<HTMLElement>(':scope > span');
    if (label) {
      if (label.dataset.stationDotsBaseTransform === undefined) {
        label.dataset.stationDotsBaseTransform = label.style.transform || '';
      }

      label.style.transform = scalePixelTransforms(label.dataset.stationDotsBaseTransform, scale);
    }
  });

  editRouteOrderButtons.forEach((button) => {
    const scale = editRouteOrderButtonScale;
    const buttonMetrics = getBaseEditRouteOrderButtonMetrics(button);

    button.style.transitionProperty = 'background-color, border-color, border-width, transform';
    button.style.width = `${buttonMetrics.width * scale}px`;
    button.style.height = `${buttonMetrics.height * scale}px`;
    button.style.maxHeight = `${buttonMetrics.maxHeight * scale}px`;

    const icon = button.querySelector<SVGSVGElement>(':scope > svg.lucide-plus');
    if (icon) {
      const iconMetrics = getBaseEditRouteOrderIconMetrics(icon);
      icon.style.transitionProperty = 'color, opacity, transform';
      icon.style.width = `${iconMetrics.width * scale}px`;
      icon.style.height = `${iconMetrics.height * scale}px`;
    }

    const label = button.querySelector<HTMLElement>(':scope > .text-white.font-semibold.leading-none');
    if (label) {
      const labelMetrics = getBaseEditRouteOrderLabelMetrics(label);
      label.style.transitionProperty = 'color, opacity, transform';
      label.style.fontSize = `${labelMetrics.fontSize * scale}px`;
    }
  });

  stationNames.forEach((name) => {
    const marker = name.closest('.maplibregl-marker');
    const isActive = marker instanceof HTMLElement ? isMarkerActive(marker) : false;
    const hoverScale = isActive ? STATION_NAME_HOVER_SCALE : 1;
    const dot = marker?.querySelector<HTMLElement>(STATION_DOT_SELECTOR);

    if (name.dataset.stationDotsBaseName === undefined) {
      name.dataset.stationDotsBaseName = normalizeLabelText(name.textContent ?? '');
    }

    const baseName = name.dataset.stationDotsBaseName;
    const displayName =
      marker instanceof HTMLElement && dot instanceof HTMLElement && getDotKind(dot) === 'transfer'
        ? getTransferStationLabel(marker, baseName, joinTransferNames)
        : baseName;

    if (name.textContent !== displayName) {
      name.textContent = displayName;
    }

    name.style.fontSize = `${stationNameSize * globalScale * hoverScale}px`;
    name.style.transformOrigin = '';
    name.style.transitionProperty = 'font-size';
    name.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    name.style.transitionTimingFunction = HOVER_ANIMATION_EASING;
    name.style.transform = '';

    const wrapper = name.closest(STATION_NAME_WRAPPER_SELECTOR);
    if (!(wrapper instanceof HTMLElement)) return;

    const wrapperMetrics = getBaseStationNameWrapperMetrics(wrapper);
    wrapper.style.maxWidth = `${wrapperMetrics.maxWidth * hoverScale}px`;
    wrapper.style.transitionProperty = 'max-width';
    wrapper.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    wrapper.style.transitionTimingFunction = HOVER_ANIMATION_EASING;
    wrapper.style.overflow = '';
  });
  isApplyingMarkerAppearance = false;
}

function applyMarkerAppearanceToMarker(marker: HTMLElement): void {
  applyMarkerAppearance(marker);
}

function cleanupPreviousInstall(): void {
  const existing = (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY];
  if (!existing) return;

  existing.observer?.disconnect();
  existing.unsubscribe?.();
  existing.removeInteractionListeners?.();
  delete (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY];
}

function hasMarkerAppearanceToolbarButton(): boolean {
  return document.querySelector(`[title="${TOOLBAR_PANEL_TITLE}"]`) !== null;
}

function installMarkerAppearanceController(map: MapLibreMap): void {
  cleanupPreviousInstall();
  applyMarkerAppearance(document);
  const pendingMarkers = new Set<HTMLElement>();
  let flushScheduled = false;

  const scheduleMarkerRefresh = (marker: HTMLElement) => {
    pendingMarkers.add(marker);
    if (flushScheduled) return;

    flushScheduled = true;
    requestAnimationFrame(() => {
      flushScheduled = false;
      pendingMarkers.forEach((pendingMarker) => {
        applyMarkerAppearanceToMarker(pendingMarker);
      });
      pendingMarkers.clear();
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (isApplyingMarkerAppearance) return;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
        const marker = mutation.target.closest('.maplibregl-marker');
        if (marker instanceof HTMLElement) {
          scheduleMarkerRefresh(marker);
        }
        continue;
      }

      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        if (node.matches(STATION_DOT_SELECTOR) && isStationMarkerDot(node)) {
          const marker = node.closest('.maplibregl-marker');
          if (marker instanceof HTMLElement) {
            scheduleMarkerRefresh(marker);
          } else {
            applyMarkerAppearance(node);
          }
          return;
        }

        const marker = node.closest('.maplibregl-marker');
        if (marker instanceof HTMLElement) {
          scheduleMarkerRefresh(marker);
          return;
        }

        applyMarkerAppearance(node);
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  const unsubscribe = subscribeMarkerAppearance(() => {
    applyMarkerAppearance(document);
  });

  const reapplyForInteraction = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const marker = target.closest('.maplibregl-marker');
    if (!(marker instanceof HTMLElement)) return;

    applyMarkerAppearanceToMarker(marker);

    // Some hover states apply after the current event tick.
    requestAnimationFrame(() => {
      applyMarkerAppearanceToMarker(marker);
    });
  };

  document.addEventListener('mouseover', reapplyForInteraction, true);
  document.addEventListener('mouseout', reapplyForInteraction, true);
  document.addEventListener('focusin', reapplyForInteraction, true);
  document.addEventListener('focusout', reapplyForInteraction, true);

  (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY] = {
    observer,
    unsubscribe,
    removeInteractionListeners: () => {
      document.removeEventListener('mouseover', reapplyForInteraction, true);
      document.removeEventListener('mouseout', reapplyForInteraction, true);
      document.removeEventListener('focusin', reapplyForInteraction, true);
      document.removeEventListener('focusout', reapplyForInteraction, true);
    },
  };
}

if (!api) {
  console.error(`${TAG} SubwayBuilderAPI not found!`);
} else {
  console.log(`${TAG} v${MOD_VERSION} | API v${api.version}`);

  // Guard against double initialization (onMapReady can fire multiple times)
  let initialized = false;

  // Initialize mod when map is ready
  api.hooks.onMapReady((map) => {
    if (initialized) return;
    initialized = true;

    try {
      installMarkerAppearanceController(map);
      setToolbarPanelComponent(TransferDotPanel);

      if (!hasMarkerAppearanceToolbarButton()) {
        api.ui.addToolbarPanel({
          id: 'marker-appearance-toolbar-panel',
          icon: 'Circle',
          tooltip: TOOLBAR_PANEL_TITLE,
          title: TOOLBAR_PANEL_TITLE,
          width: 680,
          render: MarkerAppearanceToolbarHost,
        });
      }

      console.log(`${TAG} Initialized successfully.`);
    } catch (err) {
      console.error(`${TAG} Failed to initialize:`, err);
      api.ui.showNotification(`${MOD_ID} failed to load. Check console for details.`, 'error');
    }
  });
}
