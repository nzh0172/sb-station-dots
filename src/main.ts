/**
 * My Subway Builder Mod
 * Entry point for the mod.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Route, Station, StationGroup } from './types/game-state';
import samtaegukUrl from './data/samtaeguk.png?inline';
import transferUrl from './data/transfer.png?inline';
import { MarkerAppearanceToolbarHost, TransferDotPanel, setToolbarPanelComponent } from './ui/ExamplePanel';
import {
  getMarkerAppearance,
  subscribeMarkerAppearance,
  type JoinTransferNames,
  type JoinTransferNamesOrder,
  type NormalStationDotShape,
  type PreserveJoinedTransferNamesOnZoomOut,
  type RouteSortByShape,
  type RouteSortDirection,
  type SplitRouteCodeFromName,
} from './markerAppearance';

const MOD_ID = 'com.naz.station-dots';
const MOD_VERSION = '1.0.0';
const TAG = '[Station Dots]';
const STATION_DOT_SELECTOR = '.maplibregl-marker .rounded-full.relative.border-\\[1px\\]';
const LINE_BADGE_ROW_SELECTOR = '.maplibregl-marker .flex.flex-col.items-start.ml-0 > .flex.gap-0\\.5';
const LINE_BADGE_WRAPPER_SELECTOR =
  '.maplibregl-marker .flex.flex-col.items-start.ml-0 > .flex.gap-0\\.5 > .relative:has(> .font-mta.cursor-pointer)';
const LINE_BADGE_SELECTOR =
  '.maplibregl-marker .flex.flex-col.items-start.ml-0 > .flex.gap-0\\.5 > .relative > .font-mta.cursor-pointer';
const EDIT_ROUTE_ORDER_BUTTON_ROW_SELECTOR = '.maplibregl-marker .flex.relative.border-background.w-fit.gap-0\\.5';
const EDIT_ROUTE_ORDER_BUTTON_SELECTOR =
  '.maplibregl-marker .flex.relative.border-background.w-fit.gap-0\\.5 > .cursor-pointer';
const STATION_NAME_SELECTOR = '.maplibregl-marker p.transition-transform.duration-300.font-bold.text-stroke';
const STATION_NAME_WRAPPER_SELECTOR = '.maplibregl-marker .flex.flex-col.items-start.ml-0';
const STATION_NAME_HOVER_SCALE = 1.1;
const TRANSFER_CAPSULE_LABEL_GAP_PX = 4;
const HOVER_ANIMATION_DURATION_MS = 0;
const HOVER_ANIMATION_EASING = 'ease-out';

const api = window.SubwayBuilderAPI;
const CLEANUP_KEY = '__markerAppearanceCleanup';
const TOOLBAR_PANEL_TITLE = 'Station Dots';
const TRANSFER_CAPSULE_DOT_CLASS = 'station-dots-transfer-capsule-dot';
const TRANSFER_CAPSULE_ROW_CLASS = 'station-dots-transfer-capsule-row';

type CleanupHandle = {
  observer?: MutationObserver;
  unsubscribe?: () => void;
  removeInteractionListeners?: () => void;
  removeMapListeners?: () => void;
};

let isApplyingMarkerAppearance = false;
let currentMapZoom = Number.NaN;
let previousMapZoom = Number.NaN;

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
  borderWidth: number;
  backgroundColor: string;
  borderColor: string;
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

type CapsuleTransferEntry = {
  label: string;
  stationNumber: string;
  routeColor: string;
  textColor: string;
};

type CapsuleTransferEntryWithSort = CapsuleTransferEntry & {
  displayOrder: number;
  displayLabel: string;
};

type CapsuleStationGroupMatch = {
  group: StationGroup;
  groupRouteIds: string[];
  groupRouteLabels: string[];
  stationNameMatches: boolean;
};

type ParsedRouteName = {
  code: string;
  name: string;
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

function getFlexRowNaturalWidth(row: HTMLElement): number {
  const gap = parsePixelValue(getComputedStyle(row).columnGap) ?? 0;
  const children = Array.from(row.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (children.length === 0) {
    return row.scrollWidth || row.offsetWidth || 0;
  }

  const childrenWidth = children.reduce((total, child) => {
    const content = child.firstElementChild instanceof HTMLElement ? child.firstElementChild : null;
    const layoutWidth = Math.max(
      child.offsetWidth,
      child.scrollWidth,
      Math.ceil(child.getBoundingClientRect().width),
      content?.offsetWidth ?? 0,
      content?.scrollWidth ?? 0,
      content ? Math.ceil(content.getBoundingClientRect().width) : 0,
      getElementWidth(child),
    );
    return total + layoutWidth;
  }, 0);

  return Math.ceil(Math.max(childrenWidth + gap * Math.max(0, children.length - 1), row.scrollWidth, row.offsetWidth));
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

function compareStationNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function getStationRecentOrderScore(station: { id: string; createdAt: number }): number {
  return station.createdAt;
}

function parseRouteNameParts(routeName: string | undefined): ParsedRouteName {
  const normalizedName = normalizeLabelText(routeName ?? '');
  const firstSpaceIndex = normalizedName.search(/\s/);

  if (firstSpaceIndex <= 0) {
    return { code: normalizedName, name: normalizedName };
  }

  const code = normalizeLabelText(normalizedName.slice(0, firstSpaceIndex));
  const name = normalizeLabelText(normalizedName.slice(firstSpaceIndex + 1));
  return {
    code: code || normalizedName,
    name: name || normalizedName,
  };
}

function getRouteBaseDisplayLabel(route: { bullet?: string; name?: string }): string {
  return normalizeLabelText(route.bullet?.trim() || route.name?.trim() || '');
}

function getRouteSplitSource(route: { bullet?: string; name?: string }): string {
  const name = normalizeLabelText(route.name ?? '');
  if (/\s/.test(name)) return name;

  const baseDisplayLabel = getRouteBaseDisplayLabel(route);
  if (/\s/.test(baseDisplayLabel)) return baseDisplayLabel;

  return name || baseDisplayLabel;
}

function getRouteDisplayLabel(
  route: { bullet?: string; name?: string },
  splitRouteCodeFromName: SplitRouteCodeFromName,
): string {
  if (splitRouteCodeFromName === 'on') {
    return parseRouteNameParts(getRouteSplitSource(route)).name || getRouteBaseDisplayLabel(route);
  }

  return getRouteBaseDisplayLabel(route);
}

function getRouteCapsuleLabel(
  route: { bullet?: string; name?: string },
  splitRouteCodeFromName: SplitRouteCodeFromName,
): string {
  if (splitRouteCodeFromName === 'on') {
    return parseRouteNameParts(getRouteSplitSource(route)).code || getRouteInitials(route);
  }

  return getRouteInitials(route);
}

function buildRouteBadgeDisplayLabelByBaseLabel(splitRouteCodeFromName: SplitRouteCodeFromName): Map<string, string> {
  if (!api?.gameState) return new Map();

  const displayLabelByBaseLabel = new Map<string, string>();
  api.gameState.getRoutes().forEach((route) => {
    const displayLabel = getRouteDisplayLabel(route, splitRouteCodeFromName);
    const splitSource = getRouteSplitSource(route);
    const parsedName = parseRouteNameParts(splitSource);
    [getRouteBaseDisplayLabel(route), normalizeLabelText(route.name ?? ''), splitSource, parsedName.code].forEach((baseLabel) => {
      if (baseLabel.length > 0) {
        displayLabelByBaseLabel.set(baseLabel, displayLabel);
      }
    });
  });

  return displayLabelByBaseLabel;
}

function setRouteBadgeDisplayLabels(lineBadges: NodeListOf<HTMLElement>, splitRouteCodeFromName: SplitRouteCodeFromName): void {
  const routeBadgeDisplayLabelByBaseLabel = buildRouteBadgeDisplayLabelByBaseLabel(splitRouteCodeFromName);

  lineBadges.forEach((badge) => {
    const label = badge.querySelector<HTMLElement>(':scope > span') ?? badge;

    if (label.dataset.stationDotsBaseRouteLabel === undefined) {
      label.dataset.stationDotsBaseRouteLabel = normalizeLabelText(label.textContent ?? '');
    }

    const baseLabel = label.dataset.stationDotsBaseRouteLabel;
    const displayLabel =
      splitRouteCodeFromName === 'on' ? routeBadgeDisplayLabelByBaseLabel.get(baseLabel) ?? baseLabel : baseLabel;
    if (label.textContent !== displayLabel) {
      label.textContent = displayLabel;
    }
  });
}

function buildTransferStationGroups(
  joinTransferNamesOrder: JoinTransferNamesOrder,
  splitRouteCodeFromName: SplitRouteCodeFromName,
): TransferStationGroup[] {
  if (!api?.gameState) return [];

  const stations = api.gameState.getStations();
  const stationGroups = api.gameState.getStationGroups();
  const routes = api.gameState.getRoutes();
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const routeBulletById = new Map(
    routes.map((route) => [route.id, getRouteDisplayLabel(route, splitRouteCodeFromName)]),
  );
  return stationGroups
    .map((group) => {
      const groupStations = group.stationIds
        .map((stationId) => stationById.get(stationId))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

      const stationsByName = new Map<string, typeof groupStations>();
      groupStations.forEach((station) => {
        const normalizedName = normalizeLabelText(station.name);
        if (normalizedName.length === 0) return;

        const existingStations = stationsByName.get(normalizedName);
        if (existingStations) {
          existingStations.push(station);
          return;
        }

        stationsByName.set(normalizedName, [station]);
      });

      const names = Array.from(stationsByName.keys()).sort((left, right) => {
        const leftRecentScore = Math.max(
          ...(stationsByName.get(left) ?? []).map((station) => getStationRecentOrderScore(station)),
        );
        const rightRecentScore = Math.max(
          ...(stationsByName.get(right) ?? []).map((station) => getStationRecentOrderScore(station)),
        );

        return rightRecentScore - leftRecentScore || compareStationNames(left, right);
      });

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

function getMarkerRouteBadgeColors(marker: HTMLElement): string[] {
  return Array.from(marker.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR))
    .map((badge) => normalizeColor(badge.style.backgroundColor || getComputedStyle(badge).backgroundColor))
    .filter((color) => color.length > 0 && color !== 'transparent' && color !== 'rgba(0,0,0,0)');
}

function getMarkerRouteBadgeLabelsInDisplayOrder(marker: HTMLElement): string[] {
  return Array.from(marker.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR))
    .map((badge) => normalizeLabelText(badge.textContent ?? ''))
    .filter((label) => label.length > 0);
}

function getRouteInitials(route: { bullet?: string; name?: string }): string {
  const bullet = normalizeLabelText(route.bullet ?? '');
  if (bullet.length > 0) return bullet;

  const name = normalizeLabelText(route.name ?? '');
  if (name.length === 0) return '?';

  const initials = name
    .split(/[\s-]+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return initials.slice(0, 2) || name.slice(0, 1).toUpperCase();
}

function getMarkerStationBaseName(marker: HTMLElement): string {
  const name = marker.querySelector<HTMLElement>(STATION_NAME_SELECTOR);
  return normalizeLabelText(name?.dataset.stationDotsBaseName || name?.textContent || '');
}

function getRouteStationNumber(route: Route, groupStationIds: string[], stationById: Map<string, Station>): string {
  const stationIndex = route.stations?.findIndex((station) => groupStationIds.includes(station.id)) ?? -1;
  if (stationIndex >= 0) return String(stationIndex + 1);

  const groupStNodeIds = new Set(
    groupStationIds
      .map((stationId) => stationById.get(stationId))
      .filter((station): station is Station => station !== undefined)
      .flatMap((station) => station.stNodeIds),
  );
  const timing = route.stComboTimings
    ?.filter((entry) => groupStNodeIds.has(entry.stNodeId))
    .sort((left, right) => left.stNodeIndex - right.stNodeIndex)[0];

  return timing ? String(timing.stNodeIndex + 1) : '?';
}

function getCapsuleStationNumberSortValue(stationNumber: string): number {
  const parsed = Number.parseInt(stationNumber, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function getBalancedCapsuleRowSizes(entryCount: number): number[] {
  if (entryCount <= 0) return [];

  const rowCount = Math.ceil(entryCount / 4);
  const baseRowSize = Math.floor(entryCount / rowCount);
  const extraEntries = entryCount % rowCount;

  return Array.from({ length: rowCount }, (_, index) => baseRowSize + (index < extraEntries ? 1 : 0));
}

function pickCapsuleEntryByLowerStationNumber(
  left: CapsuleTransferEntryWithSort,
  right: CapsuleTransferEntryWithSort,
): CapsuleTransferEntryWithSort {
  const stationNumberOrder =
    getCapsuleStationNumberSortValue(left.stationNumber) - getCapsuleStationNumberSortValue(right.stationNumber);
  if (stationNumberOrder <= 0) return left;

  return right;
}

function dedupeCapsuleEntriesByRouteLabel(entries: CapsuleTransferEntryWithSort[]): CapsuleTransferEntryWithSort[] {
  const entryByDisplayLabel = new Map<string, CapsuleTransferEntryWithSort>();

  entries.forEach((entry) => {
    const existingEntry = entryByDisplayLabel.get(entry.displayLabel);
    entryByDisplayLabel.set(
      entry.displayLabel,
      existingEntry ? pickCapsuleEntryByLowerStationNumber(existingEntry, entry) : entry,
    );
  });

  return Array.from(entryByDisplayLabel.values());
}

function getCapsuleTransferEntries(
  marker: HTMLElement,
  splitRouteCodeFromName: SplitRouteCodeFromName,
): CapsuleTransferEntry[] {
  if (!api?.gameState) return [];

  const markerRouteLabels = getMarkerRouteBadgeLabels(marker);
  const markerRouteLabelsInDisplayOrder = getMarkerRouteBadgeLabelsInDisplayOrder(marker);
  const markerRouteLabelOrder = new Map(markerRouteLabelsInDisplayOrder.map((label, index) => [label, index]));
  if (markerRouteLabels.length === 0) return [];

  const markerStationName = getMarkerStationBaseName(marker);
  const routes = api.gameState.getRoutes();
  const stations = api.gameState.getStations();
  const stationGroups = api.gameState.getStationGroups();
  const routeById = new Map<string, Route>(routes.map((route) => [route.id, route]));
  const stationById = new Map<string, Station>(stations.map((station) => [station.id, station]));
  const badgeColorByLabel = new Map(
    Array.from(marker.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR)).map((badge) => [
      normalizeLabelText(badge.textContent ?? ''),
      normalizeColor(badge.style.backgroundColor || getComputedStyle(badge).backgroundColor),
    ]),
  );

  const matchingGroups: CapsuleStationGroupMatch[] = stationGroups
    .map((group): CapsuleStationGroupMatch => {
      const groupStations = group.stationIds
        .map((stationId) => stationById.get(stationId))
        .filter((station): station is Station => station !== undefined);
      const groupRouteIds = Array.from(new Set(groupStations.flatMap((station) => station.routeIds)));
      const groupRouteLabels = Array.from(
        new Set(
          groupRouteIds
            .map((routeId) => routeById.get(routeId))
            .map((route) => (route ? getRouteDisplayLabel(route, splitRouteCodeFromName) : ''))
            .filter((label) => label.length > 0),
        ),
      ).sort((left, right) => compareRouteBadgeLabels(left, right));
      const stationNameMatches =
        markerStationName.length === 0 ||
        normalizeLabelText(group.name) === markerStationName ||
        groupStations.some((station) => normalizeLabelText(station.name) === markerStationName);

      return {
        group,
        groupRouteIds,
        groupRouteLabels,
        stationNameMatches,
      };
    })
    .filter((entry) => arraysMatch(entry.groupRouteLabels, markerRouteLabels));

  const matchingGroup = matchingGroups.find((entry) => entry.stationNameMatches) ?? matchingGroups[0];
  if (!matchingGroup) return [];

  const entries = matchingGroup.groupRouteIds
    .map((routeId) => routeById.get(routeId))
    .filter((route): route is Route => route !== undefined)
    .map((route): CapsuleTransferEntryWithSort => {
      const displayLabel = getRouteDisplayLabel(route, splitRouteCodeFromName);
      const routeColor = route.color || badgeColorByLabel.get(displayLabel) || '#666666';

      return {
        label: getRouteCapsuleLabel(route, splitRouteCodeFromName),
        stationNumber: getRouteStationNumber(route, matchingGroup.group.stationIds, stationById),
        routeColor,
        textColor: route.textColor || getReadableTextColor(routeColor),
        displayOrder: markerRouteLabelOrder.get(displayLabel) ?? Number.MAX_SAFE_INTEGER,
        displayLabel,
      };
    })
    .filter((entry) => markerRouteLabels.includes(entry.displayLabel));

  return dedupeCapsuleEntriesByRouteLabel(entries)
    .sort((left, right) => left.displayOrder - right.displayOrder || compareRouteBadgeLabels(left.displayLabel, right.displayLabel))
    .map(({ label, stationNumber, routeColor, textColor }): CapsuleTransferEntry => ({ label, stationNumber, routeColor, textColor }));
}

function getTransferStationLabel(
  marker: HTMLElement,
  fallbackName: string,
  joinTransferNames: JoinTransferNames,
  joinTransferNamesOrder: JoinTransferNamesOrder,
  preserveJoinedTransferNamesOnZoomOut: PreserveJoinedTransferNamesOnZoomOut,
  splitRouteCodeFromName: SplitRouteCodeFromName,
  dotKind: 'transfer' | 'station' | null,
): string {
  const normalizedFallbackName = normalizeLabelText(fallbackName);
  if (joinTransferNames !== 'on') return normalizedFallbackName;
  if (preserveJoinedTransferNamesOnZoomOut !== 'on' && dotKind !== 'transfer') return normalizedFallbackName;

  const routeBullets = getMarkerRouteBadgeLabels(marker);
  if (routeBullets.length === 0) return normalizedFallbackName;

  const matchingGroup = buildTransferStationGroups(joinTransferNamesOrder, splitRouteCodeFromName).find((group) => {
    return arraysMatch(group.routeBullets, routeBullets) && group.names.includes(normalizedFallbackName);
  });

  if (!matchingGroup) return normalizedFallbackName;

  const displayNames = joinTransferNamesOrder === 'on' ? [...matchingGroup.names].reverse() : matchingGroup.names;
  return displayNames.join('/');
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
      borderWidth: Number.parseFloat(button.dataset.stationDotsRouteButtonBaseBorderWidth ?? '') || 0,
      backgroundColor: button.dataset.stationDotsRouteButtonBaseBackgroundColor ?? '',
      borderColor: button.dataset.stationDotsRouteButtonBaseBorderColor ?? '',
    };
  }

  const computedStyle = getComputedStyle(button);
  const metrics: EditRouteOrderButtonMetrics = {
    width: getElementWidth(button),
    height: getElementHeight(button),
    maxHeight: parsePixelValue(computedStyle.maxHeight) ?? getElementHeight(button),
    borderWidth: parsePixelValue(computedStyle.borderWidth) ?? 0,
    backgroundColor: computedStyle.backgroundColor,
    borderColor: computedStyle.borderColor,
  };

  button.dataset.stationDotsRouteButtonBaseWidth = String(metrics.width);
  button.dataset.stationDotsRouteButtonBaseHeight = String(metrics.height);
  button.dataset.stationDotsRouteButtonBaseMaxHeight = String(metrics.maxHeight);
  button.dataset.stationDotsRouteButtonBaseBorderWidth = String(metrics.borderWidth);
  button.dataset.stationDotsRouteButtonBaseBackgroundColor = metrics.backgroundColor;
  button.dataset.stationDotsRouteButtonBaseBorderColor = metrics.borderColor;

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

function getReadableTextColor(backgroundColor: string): string {
  const normalizedColor = normalizeColor(backgroundColor);
  const hexMatch = normalizedColor.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  const rgbMatch = normalizedColor.match(/^rgba?\((\d+),(\d+),(\d+)/);
  let red: number;
  let green: number;
  let blue: number;

  if (hexMatch) {
    const hex = hexMatch[1];
    const fullHex = hex.length === 3 ? hex.split('').map((part) => `${part}${part}`).join('') : hex;
    red = Number.parseInt(fullHex.slice(0, 2), 16);
    green = Number.parseInt(fullHex.slice(2, 4), 16);
    blue = Number.parseInt(fullHex.slice(4, 6), 16);
  } else if (rgbMatch) {
    red = Number.parseInt(rgbMatch[1], 10);
    green = Number.parseInt(rgbMatch[2], 10);
    blue = Number.parseInt(rgbMatch[3], 10);
  } else {
    return '#ffffff';
  }

  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? '#111111' : '#ffffff';
}

function isStationMarkerDot(dot: HTMLElement): boolean {
  if (dot.dataset.stationDotsKind === 'transfer' || dot.dataset.stationDotsKind === 'station') return true;
  if (dot.querySelector(`:scope > .${TRANSFER_CAPSULE_DOT_CLASS}`)) return true;
  if (dot.querySelector(`:scope > .${TRANSFER_CAPSULE_ROW_CLASS}`)) return true;

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
  if (!isStationMarkerDot(dot)) {
    delete dot.dataset.stationDotsKind;
    return null;
  }

  if (dot.querySelector(`:scope > .${TRANSFER_CAPSULE_DOT_CLASS}`)) {
    dot.dataset.stationDotsKind = 'transfer';
    return 'transfer';
  }

  if (isTransferDot(dot)) {
    dot.dataset.stationDotsKind = 'transfer';
    return 'transfer';
  }

  const cachedKind = dot.dataset.stationDotsKind;
  if (cachedKind === 'transfer' || cachedKind === 'station') {
    return cachedKind;
  }

  dot.dataset.stationDotsKind = 'station';
  return 'station';
}

function removeTransferCapsuleDots(dot: HTMLElement): void {
  dot.querySelectorAll(`:scope > .${TRANSFER_CAPSULE_ROW_CLASS}`).forEach((row) => row.remove());
  dot.querySelectorAll(`:scope > .${TRANSFER_CAPSULE_DOT_CLASS}`).forEach((innerDot) => innerDot.remove());
  dot.style.display = '';
  dot.style.flexDirection = '';
  dot.style.gridTemplateColumns = '';
  dot.style.gridAutoRows = '';
  dot.style.alignItems = '';
  dot.style.justifyContent = '';
  dot.style.justifyItems = '';
  dot.style.gap = '';
  dot.style.padding = '';
  dot.style.boxSizing = '';
  dot.style.minHeight = '';
  dot.style.overflow = '';
  dot.style.transformOrigin = '';
  dot.style.filter = '';
  dot.style.position = '';
  dot.style.backgroundImage = '';
  dot.style.backgroundPosition = '';
  dot.style.backgroundRepeat = '';
  dot.style.backgroundSize = '';
}

function applyNormalStationDotShape(dot: HTMLElement, shape: NormalStationDotShape): void {
  removeTransferCapsuleDots(dot);
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

function applyTransferTrafficLightDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  backgroundColor: string,
  outlineColor: string,
  globalScale: number,
  routeColors: string[],
): void {
  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = `${dotSize}rem`;
  dot.style.height = 'auto';
  dot.style.minHeight = `${dotSize}rem`;
  dot.style.display = 'flex';
  dot.style.flexDirection = 'column';
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.gap = `${Math.max(1, outlineThickness * globalScale)}px`;
  dot.style.padding = `${Math.max(2, outlineThickness * globalScale + 1)}px`;
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = backgroundColor;
  dot.style.borderColor = outlineColor;
  dot.style.borderWidth = `${outlineThickness * globalScale}px`;

  routeColors.forEach((routeColor) => {
    const innerDot = document.createElement('span');
    innerDot.className = TRANSFER_CAPSULE_DOT_CLASS;
    dot.appendChild(innerDot);

    innerDot.style.display = 'block';
    innerDot.style.width = `${Math.max(0.16, dotSize * 0.48)}rem`;
    innerDot.style.height = `${Math.max(0.16, dotSize * 0.48)}rem`;
    innerDot.style.flex = '0 0 auto';
    innerDot.style.borderRadius = '9999px';
    innerDot.style.backgroundColor = routeColor;
    innerDot.style.pointerEvents = 'none';
  });
}

function applyTransferCapsuleDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  backgroundColor: string,
  outlineColor: string,
  globalScale: number,
  entries: CapsuleTransferEntry[],
): void {
  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = 'max-content';
  dot.style.height = 'auto';
  dot.style.minHeight = `${Math.max(dotSize, dotSize * 1.7)}rem`;
  dot.style.display = 'flex';
  dot.style.flexDirection = 'column';
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.gap = `${Math.max(2, outlineThickness * globalScale + 1)}px`;
  dot.style.padding = `${Math.max(3, outlineThickness * globalScale + 2)}px`;
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = `${Math.max(4, dotSize * 5)}px`;
  dot.style.backgroundColor = backgroundColor;
  dot.style.borderColor = outlineColor;
  dot.style.borderWidth = `${outlineThickness * globalScale}px`;
  dot.style.overflow = 'visible';
  dot.style.position = 'relative';
  dot.style.filter = '';

  const rowGap = Math.max(2, outlineThickness * globalScale + 1);
  const rowSizes = getBalancedCapsuleRowSizes(entries.length);
  const rows = rowSizes.map((rowSize) => {
    const row = document.createElement('span');
    row.className = TRANSFER_CAPSULE_ROW_CLASS;
    dot.appendChild(row);

    row.style.display = 'grid';
    row.style.gridTemplateColumns = `repeat(${rowSize}, max-content)`;
    row.style.gridAutoRows = 'max-content';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'center';
    row.style.justifyItems = 'center';
    row.style.columnGap = `${rowGap}px`;
    row.style.width = 'max-content';
    row.style.maxWidth = '100%';
    row.style.pointerEvents = 'none';

    return row;
  });

  let currentRowIndex = 0;
  let entriesInCurrentRow = 0;

  entries.forEach((entry) => {
    const row = rows[currentRowIndex];
    if (!row) return;

    const routeBox = document.createElement('span');
    const routeLabel = document.createElement('span');
    const stationNumber = document.createElement('span');
    const minBoxWidth = Math.max(0.82, dotSize * 0.96);
    const boxHeight = Math.max(1.28, dotSize * 1.52);

    routeBox.className = TRANSFER_CAPSULE_DOT_CLASS;
    routeBox.append(routeLabel, stationNumber);
    row.appendChild(routeBox);

    routeBox.style.display = 'grid';
    routeBox.style.gridTemplateRows = 'minmax(0, 1fr) minmax(0, 1fr)';
    routeBox.style.alignItems = 'center';
    routeBox.style.justifyItems = 'center';
    routeBox.style.width = 'max-content';
    routeBox.style.minWidth = `${minBoxWidth}rem`;
    routeBox.style.height = `${boxHeight}rem`;
    routeBox.style.flex = '0 0 auto';
    routeBox.style.border = `${Math.max(1, outlineThickness * globalScale)}px solid ${entry.routeColor}`;
    routeBox.style.borderRadius = `${Math.max(3, dotSize * 4)}px`;
    routeBox.style.backgroundColor = entry.routeColor;
    routeBox.style.boxSizing = 'border-box';
    routeBox.style.overflow = 'hidden';
    routeBox.style.pointerEvents = 'none';
    routeBox.style.paddingLeft = `${Math.max(2, dotSize * 2.1 * globalScale)}px`;
    routeBox.style.paddingRight = `${Math.max(2, dotSize * 2.1 * globalScale)}px`;

    routeLabel.textContent = entry.label;
    routeLabel.style.display = 'flex';
    routeLabel.style.alignItems = 'center';
    routeLabel.style.justifyContent = 'center';
    routeLabel.style.width = '100%';
    routeLabel.style.height = '100%';
    routeLabel.style.color = '#ffffff';
    routeLabel.style.fontFamily = 'inherit';
    routeLabel.style.fontSize = `${Math.max(11, dotSize * 12.5 * globalScale)}px`;
    routeLabel.style.fontWeight = '700';
    routeLabel.style.lineHeight = '0.95';
    routeLabel.style.minHeight = '0';

    stationNumber.textContent = entry.stationNumber;
    stationNumber.style.display = 'flex';
    stationNumber.style.alignItems = 'center';
    stationNumber.style.justifyContent = 'center';
    stationNumber.style.width = '100%';
    stationNumber.style.height = '100%';
    stationNumber.style.color = '#ffffff';
    stationNumber.style.fontFamily = 'inherit';
    stationNumber.style.fontSize = `${Math.max(6, dotSize * 6.8 * globalScale)}px`;
    stationNumber.style.fontWeight = '700';
    stationNumber.style.lineHeight = '0.95';
    stationNumber.style.minHeight = '0';

    entriesInCurrentRow += 1;
    if (entriesInCurrentRow >= rowSizes[currentRowIndex]) {
      currentRowIndex += 1;
      entriesInCurrentRow = 0;
    }
  });

  const routeBoxes = Array.from(dot.querySelectorAll<HTMLElement>(`.${TRANSFER_CAPSULE_DOT_CLASS}`));
  const largestBoxWidth = Math.ceil(
    Math.max(
      0,
      ...routeBoxes.map((routeBox) =>
        Math.max(routeBox.scrollWidth, routeBox.offsetWidth, routeBox.getBoundingClientRect().width),
      ),
    ),
  );

  if (largestBoxWidth > 0) {
    routeBoxes.forEach((routeBox) => {
      routeBox.style.width = `${largestBoxWidth}px`;
    });
    rows.forEach((row) => {
      const rowSize = row.children.length;
      row.style.gridTemplateColumns = `repeat(${rowSize}, ${largestBoxWidth}px)`;
    });
  }
}

function tightenCapsuleLabelSpacing(marker: HTMLElement, dot: HTMLElement, globalScale: number): void {
  const wrapper = marker.querySelector<HTMLElement>(STATION_NAME_WRAPPER_SELECTOR);
  if (!wrapper) return;

  const capsuleWidth = dot.getBoundingClientRect().width || dot.offsetWidth;
  const tightGap = TRANSFER_CAPSULE_LABEL_GAP_PX * globalScale;
  if (capsuleWidth <= tightGap) {
    wrapper.style.marginLeft = '';
    return;
  }

  wrapper.style.marginLeft = `${Math.round(capsuleWidth * -0.5 + tightGap)}px`;
}

function placeStationNameAboveTransferDot(marker: HTMLElement, dot: HTMLElement, globalScale: number): void {
  const name = marker.querySelector<HTMLElement>(STATION_NAME_SELECTOR);
  if (!name || name.style.display === 'none') return;

  const dotRect = dot.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  if (dotRect.width <= 0 || dotRect.height <= 0 || nameRect.width <= 0 || nameRect.height <= 0) return;

  const gap = Math.max(2, 3 * globalScale);
  const targetLeft = dotRect.left + dotRect.width / 2 - nameRect.width / 2;
  const targetTop = dotRect.top - nameRect.height - gap;
  const translateX = Math.round(targetLeft - nameRect.left);
  const translateY = Math.round(targetTop - nameRect.top);

  name.style.transform = `translate(${translateX}px, ${translateY}px)`;
  name.style.transformOrigin = 'center bottom';
  name.style.textAlign = 'center';
  name.style.zIndex = '1';
}

function applyTransferGummyWormDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  globalScale: number,
  lineBadgeSize: number,
  entries: CapsuleTransferEntry[],
): void {
  const segmentHeight = Math.max(16, lineBadgeSize * globalScale);
  const textSize = Math.max(10, segmentHeight * 0.62);

  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = 'max-content';
  dot.style.height = 'auto';
  dot.style.minHeight = `${segmentHeight}px`;
  dot.style.display = 'flex';
  dot.style.flexDirection = 'column';
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.gap = `${Math.max(2, outlineThickness * globalScale + 1)}px`;
  dot.style.padding = '0';
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = 'transparent';
  dot.style.borderColor = 'transparent';
  dot.style.borderWidth = '0';
  dot.style.overflow = 'visible';
  dot.style.position = 'relative';
  dot.style.filter = '';

  const rowSizes = getBalancedCapsuleRowSizes(entries.length);
  const rows = rowSizes.map(() => {
    const row = document.createElement('span');
    row.className = TRANSFER_CAPSULE_ROW_CLASS;
    dot.appendChild(row);

    row.style.display = 'inline-flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'center';
    row.style.width = 'max-content';
    row.style.maxWidth = '100%';
    row.style.pointerEvents = 'none';

    return row;
  });
  let currentRowIndex = 0;
  let entriesInCurrentRow = 0;

  entries.forEach((entry, index) => {
    const row = rows[currentRowIndex];
    if (!row) return;

    const segment = document.createElement('span');
    const label = document.createElement('span');
    const stationNumber = document.createElement('span');
    const isFirst = entriesInCurrentRow === 0;
    const isLast = entriesInCurrentRow === rowSizes[currentRowIndex] - 1;

    segment.className = TRANSFER_CAPSULE_DOT_CLASS;
    segment.append(label, stationNumber);
    row.appendChild(segment);

    segment.style.display = 'inline-flex';
    segment.style.alignItems = 'center';
    segment.style.justifyContent = 'center';
    segment.style.gap = '0';
    segment.style.height = `${segmentHeight}px`;
    segment.style.minWidth = `${Math.max(1.05, dotSize * 1.35)}rem`;
    segment.style.paddingLeft = `${Math.max(5, dotSize * 4.9 * globalScale)}px`;
    segment.style.paddingRight = `${Math.max(5, dotSize * 4.9 * globalScale)}px`;
    segment.style.marginLeft = isFirst ? '0' : `${Math.max(1, outlineThickness * globalScale) * -1}px`;
    segment.style.flex = '0 0 auto';
    segment.style.border = `${Math.max(1, outlineThickness * globalScale)}px solid ${entry.routeColor}`;
    segment.style.borderRadius = `${isFirst ? '9999px' : '0'} ${isLast ? '9999px' : '0'} ${isLast ? '9999px' : '0'} ${isFirst ? '9999px' : '0'}`;
    segment.style.backgroundColor = entry.routeColor;
    segment.style.boxSizing = 'border-box';
    segment.style.overflow = 'hidden';
    segment.style.pointerEvents = 'none';

    label.textContent = entry.label;
    label.style.color = entry.textColor;
    label.style.fontFamily = 'inherit';
    label.style.fontSize = `${textSize}px`;
    label.style.fontWeight = '800';
    label.style.lineHeight = '1';
    label.style.whiteSpace = 'nowrap';

    stationNumber.textContent = entry.stationNumber;
    stationNumber.style.color = entry.textColor;
    stationNumber.style.fontFamily = 'inherit';
    stationNumber.style.fontSize = `${textSize}px`;
    stationNumber.style.fontWeight = '800';
    stationNumber.style.lineHeight = '1';
    stationNumber.style.whiteSpace = 'nowrap';

    entriesInCurrentRow += 1;
    if (entriesInCurrentRow >= rowSizes[currentRowIndex]) {
      currentRowIndex += 1;
      entriesInCurrentRow = 0;
    }
  });
}

function applyTransferBubblyDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  backgroundColor: string,
  outlineColor: string,
  globalScale: number,
  routeColors: string[],
): void {
  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = `${dotSize}rem`;
  dot.style.height = 'auto';
  dot.style.minHeight = '';
  dot.style.display = 'flex';
  dot.style.flexDirection = 'column';
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.gap = '0';
  dot.style.padding = '0';
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = '0';
  dot.style.backgroundColor = 'transparent';
  dot.style.borderColor = 'transparent';
  dot.style.borderWidth = '0px';
  dot.style.overflow = 'visible';
  dot.style.position = 'relative';
  dot.style.filter = '';

  const circleOverlap = dotSize * 0.24;
  const circleStep = dotSize - circleOverlap;
  const stackHeight = dotSize + Math.max(0, routeColors.length - 1) * circleStep;
  const outlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const outlinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const viewBoxWidth = 100;
  const viewBoxHeight = stackHeight * 100 / dotSize;
  const radius = 50;
  const centers = routeColors.map((_, index) => radius + index * (circleStep * 100 / dotSize));
  const outlinePathData = centers
    .map((centerY) => `M ${radius} ${centerY} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`)
    .join(' ');

  outlineSvg.setAttribute('class', TRANSFER_CAPSULE_DOT_CLASS);
  outlineSvg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
  outlineSvg.style.position = 'absolute';
  outlineSvg.style.left = '0';
  outlineSvg.style.top = '0';
  outlineSvg.style.width = `${dotSize}rem`;
  outlineSvg.style.height = `${stackHeight}rem`;
  outlineSvg.style.overflow = 'visible';
  outlineSvg.style.pointerEvents = 'none';
  outlineSvg.style.zIndex = '0';

  outlinePath.setAttribute('d', outlinePathData);
  outlinePath.setAttribute('fill', 'none');
  outlinePath.setAttribute('stroke', outlineColor);
  outlinePath.style.strokeWidth = `${Math.max(0, outlineThickness * globalScale * 2)}px`;
  outlinePath.style.vectorEffect = 'non-scaling-stroke';
  outlinePath.setAttribute('stroke-linejoin', 'round');
  outlinePath.setAttribute('stroke-linecap', 'round');
  outlineSvg.appendChild(outlinePath);
  dot.appendChild(outlineSvg);

  routeColors.forEach((routeColor, index) => {
    const outerCircle = document.createElement('span');
    const innerCircle = document.createElement('span');

    outerCircle.className = TRANSFER_CAPSULE_DOT_CLASS;
    outerCircle.appendChild(innerCircle);
    dot.appendChild(outerCircle);

    outerCircle.style.display = 'flex';
    outerCircle.style.position = 'relative';
    outerCircle.style.alignItems = 'center';
    outerCircle.style.justifyContent = 'center';
    outerCircle.style.width = `${dotSize}rem`;
    outerCircle.style.height = `${dotSize}rem`;
    outerCircle.style.flex = '0 0 auto';
    outerCircle.style.marginTop = index === 0 ? '0' : `${-circleOverlap}rem`;
    outerCircle.style.borderRadius = '9999px';
    outerCircle.style.backgroundColor = backgroundColor;
    outerCircle.style.borderColor = 'transparent';
    outerCircle.style.borderStyle = 'solid';
    outerCircle.style.borderWidth = '0px';
    outerCircle.style.boxSizing = 'border-box';
    outerCircle.style.pointerEvents = 'none';
    outerCircle.style.zIndex = '1';

    innerCircle.style.display = 'block';
    innerCircle.style.width = `${Math.max(0.16, dotSize * 0.5)}rem`;
    innerCircle.style.height = `${Math.max(0.16, dotSize * 0.5)}rem`;
    innerCircle.style.borderRadius = '9999px';
    innerCircle.style.backgroundColor = routeColor;
    innerCircle.style.pointerEvents = 'none';
  });
}

function applyTransferTriniteDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  backgroundColor: string,
  outlineColor: string,
  globalScale: number,
): void {
  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = `${dotSize}rem`;
  dot.style.height = `${dotSize}rem`;
  dot.style.minHeight = `${dotSize}rem`;
  dot.style.display = 'block';
  dot.style.flexDirection = '';
  dot.style.alignItems = '';
  dot.style.justifyContent = '';
  dot.style.gap = '';
  dot.style.padding = '0';
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = backgroundColor;
  dot.style.backgroundImage = `url("${samtaegukUrl}")`;
  dot.style.backgroundPosition = 'center';
  dot.style.backgroundRepeat = 'no-repeat';
  dot.style.backgroundSize = 'cover';
  dot.style.borderColor = outlineColor;
  dot.style.borderWidth = `${outlineThickness * globalScale}px`;
  dot.style.overflow = 'hidden';
  dot.style.position = 'relative';
  dot.style.filter = '';
}

function applyTransferSleekDotStyle(
  dot: HTMLElement,
  dotSize: number,
  outlineThickness: number,
  backgroundColor: string,
  outlineColor: string,
  globalScale: number,
): void {
  removeTransferCapsuleDots(dot);
  dot.style.clipPath = '';
  dot.style.transform = '';
  dot.style.transformOrigin = 'center';
  dot.style.width = `${dotSize}rem`;
  dot.style.height = `${dotSize}rem`;
  dot.style.minHeight = `${dotSize}rem`;
  dot.style.display = 'block';
  dot.style.flexDirection = '';
  dot.style.alignItems = '';
  dot.style.justifyContent = '';
  dot.style.gap = '';
  dot.style.padding = '0';
  dot.style.boxSizing = 'border-box';
  dot.style.borderRadius = '9999px';
  dot.style.backgroundColor = backgroundColor;
  dot.style.backgroundImage = `url("${transferUrl}")`;
  dot.style.backgroundPosition = 'center';
  dot.style.backgroundRepeat = 'no-repeat';
  dot.style.backgroundSize = 'cover';
  dot.style.borderColor = outlineColor;
  dot.style.borderWidth = `${outlineThickness * globalScale}px`;
  dot.style.overflow = 'hidden';
  dot.style.position = 'relative';
  dot.style.filter = '';
}

function applyMarkerAppearance(root: ParentNode): void {
  isApplyingMarkerAppearance = true;
  const {
    globalScale,
    normalStationDotSize,
    normalStationDotShape,
    normalStationDotOutlineThickness,
    transferDotSize,
    transferDotTrafficLight,
    transferDotStyle,
    transferDotShape,
    transferDotOutlineThickness,
    lineBadgeSize,
    editRouteOrderButtonScale,
    stationNameSize,
    stationNameLabelsVisible,
    routeIconLabelsVisible,
    joinTransferNames,
    joinTransferNamesOrder,
    preserveJoinedTransferNamesOnZoomOut,
    splitRouteCodeFromName,
    routeIconWrapWidth,
    routeSortByShape,
    routeSortDirection,
    transferDotColor,
    transferDotOutlineColor,
  } = getMarkerAppearance();
  const dots = root.querySelectorAll<HTMLElement>(STATION_DOT_SELECTOR);
  const lineBadgeRows = root.querySelectorAll<HTMLElement>(LINE_BADGE_ROW_SELECTOR);
  const lineBadgeWrappers = root.querySelectorAll<HTMLElement>(LINE_BADGE_WRAPPER_SELECTOR);
  const lineBadges = root.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR);
  const editRouteOrderButtonRows = root.querySelectorAll<HTMLElement>(EDIT_ROUTE_ORDER_BUTTON_ROW_SELECTOR);
  const editRouteOrderButtons = root.querySelectorAll<HTMLElement>(EDIT_ROUTE_ORDER_BUTTON_SELECTOR);
  const stationNames = root.querySelectorAll<HTMLElement>(STATION_NAME_SELECTOR);

  setRouteBadgeDisplayLabels(lineBadges, splitRouteCodeFromName);
  sortRouteBadges(root, routeSortDirection, routeSortByShape);

  lineBadgeRows.forEach((row) => {
    row.style.display = routeIconLabelsVisible === 'on' ? 'flex' : 'none';
    row.style.flexWrap = 'nowrap';
    row.style.alignItems = 'flex-start';
    row.style.width = 'max-content';
    row.style.maxWidth = 'none';
    row.style.overflow = 'visible';
  });

  editRouteOrderButtonRows.forEach((row) => {
    row.style.flexWrap = 'nowrap';
    row.style.alignItems = 'center';
    row.style.display = 'flex';
    row.style.width = 'max-content';
    row.style.maxWidth = 'none';
    row.style.flex = '0 0 auto';
    row.style.overflow = 'visible';
    row.style.marginRight = '0px';
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
    badge.style.width = 'max-content';
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
      label.style.whiteSpace = 'nowrap';
    }
  });

  lineBadgeRows.forEach((row) => {
    if (routeIconLabelsVisible !== 'on') return;

    const marker = row.closest('.maplibregl-marker');
    const isActive = marker instanceof HTMLElement ? isMarkerActive(marker) : false;
    const hoverScale = isActive ? STATION_NAME_HOVER_SCALE : 1;
    const wrapLimitWidth = routeIconWrapWidth * globalScale * hoverScale;
    const naturalWidth = getFlexRowNaturalWidth(row);
    const appliedWidth = Math.min(naturalWidth, wrapLimitWidth);

    row.style.flexWrap = 'wrap';
    row.style.width = `${appliedWidth}px`;
    row.style.maxWidth = `${wrapLimitWidth}px`;
  });

  editRouteOrderButtons.forEach((button) => {
    const scale = editRouteOrderButtonScale;
    const buttonMetrics = getBaseEditRouteOrderButtonMetrics(button);

    button.style.transitionProperty = 'none';
    button.style.transitionDuration = '0ms';
    button.style.transitionTimingFunction = 'linear';
    button.style.width = `${buttonMetrics.width * scale}px`;
    button.style.height = `${buttonMetrics.height * scale}px`;
    button.style.maxHeight = `${buttonMetrics.maxHeight * scale}px`;
    button.style.backgroundColor = buttonMetrics.backgroundColor;
    button.style.borderColor = buttonMetrics.borderColor;
    button.style.borderWidth = `${buttonMetrics.borderWidth}px`;

    const icon = button.querySelector<SVGSVGElement>(':scope > svg.lucide-plus');
    if (icon) {
      const iconMetrics = getBaseEditRouteOrderIconMetrics(icon);
      icon.style.transitionProperty = 'none';
      icon.style.transitionDuration = '0ms';
      icon.style.width = `${iconMetrics.width * scale}px`;
      icon.style.height = `${iconMetrics.height * scale}px`;
    }

    const label = button.querySelector<HTMLElement>(':scope > .text-white.font-semibold.leading-none');
    if (label) {
      const labelMetrics = getBaseEditRouteOrderLabelMetrics(label);
      label.style.transitionProperty = 'none';
      label.style.transitionDuration = '0ms';
      label.style.fontSize = `${labelMetrics.fontSize * scale}px`;
    }
  });

  editRouteOrderButtonRows.forEach((row) => {
    const rowWidth = getFlexRowNaturalWidth(row);
    row.style.marginRight = `${rowWidth * -0.5}px`;
  });

  stationNames.forEach((name) => {
    const marker = name.closest('.maplibregl-marker');
    const isActive = marker instanceof HTMLElement ? isMarkerActive(marker) : false;
    const hoverScale = isActive ? STATION_NAME_HOVER_SCALE : 1;
    const dot = marker?.querySelector<HTMLElement>(STATION_DOT_SELECTOR);
    const dotKind = dot instanceof HTMLElement ? getDotKind(dot) : null;
    const currentName = normalizeLabelText(name.textContent ?? '');
    const lastAppliedName = name.dataset.stationDotsAppliedName;

    if (name.dataset.stationDotsBaseName === undefined) {
      name.dataset.stationDotsBaseName = currentName;
    } else if (currentName.length > 0 && currentName !== lastAppliedName) {
      name.dataset.stationDotsBaseName = currentName;
    }

    const baseName = name.dataset.stationDotsBaseName;
    const resolvedJoinedName =
      marker instanceof HTMLElement
        ? getTransferStationLabel(
            marker,
            baseName,
            joinTransferNames,
            joinTransferNamesOrder,
            preserveJoinedTransferNamesOnZoomOut,
            splitRouteCodeFromName,
            dotKind,
          )
        : baseName;

    if (marker instanceof HTMLElement && resolvedJoinedName !== baseName) {
      marker.dataset.stationDotsJoinedName = resolvedJoinedName;
      marker.dataset.stationDotsJoinedNameZoom = String(currentMapZoom);
    }

    const cachedJoinedName = marker instanceof HTMLElement ? marker.dataset.stationDotsJoinedName ?? '' : '';
    const cachedJoinedNameZoom = marker instanceof HTMLElement
      ? Number.parseFloat(marker.dataset.stationDotsJoinedNameZoom ?? '')
      : Number.NaN;
    const shouldUseCachedJoinedName =
      preserveJoinedTransferNamesOnZoomOut === 'on' &&
      cachedJoinedName.length > 0 &&
      Number.isFinite(cachedJoinedNameZoom) &&
      Number.isFinite(currentMapZoom) &&
      currentMapZoom <= cachedJoinedNameZoom;

    const displayName =
      resolvedJoinedName !== baseName ? resolvedJoinedName : shouldUseCachedJoinedName ? cachedJoinedName : baseName;

    if (name.textContent !== displayName) {
      name.textContent = displayName;
    }
    name.dataset.stationDotsAppliedName = displayName;

    name.style.fontSize = `${stationNameSize * globalScale * hoverScale}px`;
    name.style.display = stationNameLabelsVisible === 'on' ? '' : 'none';
    name.style.transformOrigin = '';
    name.style.transitionProperty = 'font-size';
    name.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    name.style.transitionTimingFunction = HOVER_ANIMATION_EASING;
    name.style.transform = '';
    name.style.order = '';
    name.style.textAlign = '';
    name.style.zIndex = '';

    const wrapper = name.closest(STATION_NAME_WRAPPER_SELECTOR);
    if (!(wrapper instanceof HTMLElement)) return;

    const wrapperMetrics = getBaseStationNameWrapperMetrics(wrapper);
    wrapper.style.maxWidth = `${wrapperMetrics.maxWidth * hoverScale}px`;
    wrapper.style.transitionProperty = 'max-width';
    wrapper.style.transitionDuration = `${HOVER_ANIMATION_DURATION_MS}ms`;
    wrapper.style.transitionTimingFunction = HOVER_ANIMATION_EASING;
    wrapper.style.overflow = '';
    wrapper.style.alignItems = '';
    wrapper.style.marginLeft = '';
  });

  dots.forEach((dot) => {
    const marker = dot.closest('.maplibregl-marker');
    const dotKind = getDotKind(dot);
    if (!dotKind) return;

    const routeColors =
      marker instanceof HTMLElement
        ? Array.from(new Set(getMarkerRouteBadgeColors(marker)))
        : ['#ffffff'];
    const effectiveRouteColors = routeColors.length > 0 ? routeColors : ['#ffffff'];
    const dotSize = (dotKind === 'transfer' ? transferDotSize : normalStationDotSize) * globalScale;
    dot.style.width = `${dotSize}rem`;
    dot.style.height = `${dotSize}rem`;

    if (dotKind === 'transfer') {
      if (transferDotStyle === 'traffic light' || (transferDotStyle === 'single' && transferDotTrafficLight === 'on')) {
        applyTransferTrafficLightDotStyle(
          dot,
          dotSize,
          transferDotOutlineThickness,
          transferDotColor,
          transferDotOutlineColor,
          globalScale,
          effectiveRouteColors,
        );
      } else if (transferDotStyle === 'bubbly') {
        applyTransferBubblyDotStyle(
          dot,
          dotSize,
          transferDotOutlineThickness,
          transferDotColor,
          transferDotOutlineColor,
          globalScale,
          effectiveRouteColors,
        );
      } else if (transferDotStyle === 'tri-color') {
        applyTransferTriniteDotStyle(
          dot,
          dotSize,
          transferDotOutlineThickness,
          transferDotColor,
          transferDotOutlineColor,
          globalScale,
        );
      } else if (transferDotStyle === 'sleek') {
        applyTransferSleekDotStyle(
          dot,
          dotSize,
          transferDotOutlineThickness,
          transferDotColor,
          transferDotOutlineColor,
          globalScale,
        );
      } else if (transferDotStyle === 'wormy') {
        const gummyEntries =
          marker instanceof HTMLElement ? getCapsuleTransferEntries(marker, splitRouteCodeFromName) : [];
        if (gummyEntries.length > 0) {
          applyTransferGummyWormDotStyle(
            dot,
            dotSize,
            transferDotOutlineThickness,
            globalScale,
            lineBadgeSize,
            gummyEntries,
          );
          if (marker instanceof HTMLElement) {
            tightenCapsuleLabelSpacing(marker, dot, globalScale);
            placeStationNameAboveTransferDot(marker, dot, globalScale);
          }
        } else {
          applyNormalStationDotShape(dot, transferDotShape);
          dot.style.backgroundColor = transferDotColor;
          dot.style.borderColor = transferDotOutlineColor;
          dot.style.borderWidth = `${transferDotOutlineThickness * globalScale}px`;
        }
      } else if (transferDotStyle === 'capsule') {
        const capsuleEntries =
          marker instanceof HTMLElement ? getCapsuleTransferEntries(marker, splitRouteCodeFromName) : [];
        if (capsuleEntries.length > 0) {
          applyTransferCapsuleDotStyle(
            dot,
            dotSize,
            transferDotOutlineThickness,
            transferDotColor,
            transferDotOutlineColor,
            globalScale,
            capsuleEntries,
          );
          if (marker instanceof HTMLElement) {
            tightenCapsuleLabelSpacing(marker, dot, globalScale);
            placeStationNameAboveTransferDot(marker, dot, globalScale);
          }
        } else {
          applyNormalStationDotShape(dot, transferDotShape);
          dot.style.backgroundColor = transferDotColor;
          dot.style.borderColor = transferDotOutlineColor;
          dot.style.borderWidth = `${transferDotOutlineThickness * globalScale}px`;
        }
      } else {
        applyNormalStationDotShape(dot, transferDotShape);
        dot.style.backgroundColor = transferDotColor;
        dot.style.borderColor = transferDotOutlineColor;
        dot.style.borderWidth = `${transferDotOutlineThickness * globalScale}px`;
      }
    } else {
      applyNormalStationDotShape(dot, normalStationDotShape);
      dot.style.borderColor = '';
      dot.style.borderWidth = `${normalStationDotOutlineThickness * globalScale}px`;
    }
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
  currentMapZoom = map.getZoom();
  previousMapZoom = currentMapZoom;
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
      if (mutation.type === 'characterData') {
        const parentElement = mutation.target.parentElement;
        const marker = parentElement?.closest('.maplibregl-marker');
        if (marker instanceof HTMLElement) {
          scheduleMarkerRefresh(marker);
        }
        continue;
      }

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
    characterData: true,
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

  const handleZoomStart = () => {
    previousMapZoom = currentMapZoom;
  };

  const handleZoomEnd = () => {
    currentMapZoom = map.getZoom();
    applyMarkerAppearance(document);
  };

  map.on('zoomstart', handleZoomStart);
  map.on('zoomend', handleZoomEnd);

  (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY] = {
    observer,
    unsubscribe,
    removeInteractionListeners: () => {
      document.removeEventListener('mouseover', reapplyForInteraction, true);
      document.removeEventListener('mouseout', reapplyForInteraction, true);
      document.removeEventListener('focusin', reapplyForInteraction, true);
      document.removeEventListener('focusout', reapplyForInteraction, true);
    },
    removeMapListeners: () => {
      map.off('zoomstart', handleZoomStart);
      map.off('zoomend', handleZoomEnd);
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
          width: 1000,
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
