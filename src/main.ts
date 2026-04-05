/**
 * My Subway Builder Mod
 * Entry point for the mod.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import { MarkerAppearanceToolbarHost, TransferDotPanel, setToolbarPanelComponent } from './ui/ExamplePanel';
import { getMarkerAppearance, subscribeMarkerAppearance } from './markerAppearance';

const MOD_ID = 'com.naz.station-dots';
const MOD_VERSION = '1.0.0';
const TAG = '[Station Dots]';
const STATION_DOT_SELECTOR = '.maplibregl-marker .rounded-full.relative.border-\\[1px\\]';
const LINE_BADGE_WRAPPER_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5 > .relative';
const LINE_BADGE_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5 > .relative > .font-mta.cursor-pointer';
const STATION_NAME_SELECTOR = '.maplibregl-marker p.transition-transform.duration-300.font-bold.text-stroke';

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

function parsePixelValue(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = value.match(/-?\d*\.?\d+/);
  if (!match) return null;

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getElementHeight(element: HTMLElement): number {
  const inlineHeight = parsePixelValue(element.style.height);
  if (inlineHeight !== null && inlineHeight > 0) return inlineHeight;

  const computedHeight = parsePixelValue(getComputedStyle(element).height);
  if (computedHeight !== null && computedHeight > 0) return computedHeight;

  return element.getBoundingClientRect().height;
}

function getElementMinWidth(element: HTMLElement): number {
  const inlineMinWidth = parsePixelValue(element.style.minWidth);
  if (inlineMinWidth !== null && inlineMinWidth > 0) return inlineMinWidth;

  const computedMinWidth = parsePixelValue(getComputedStyle(element).minWidth);
  if (computedMinWidth !== null && computedMinWidth > 0) return computedMinWidth;

  return element.getBoundingClientRect().width;
}

function scalePixelTransforms(value: string, scale: number): string {
  if (!value || scale === 1) return value;
  return value.replace(/(-?\d*\.?\d+)px/g, (_, numericValue: string) => `${Number.parseFloat(numericValue) * scale}px`);
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

function applyMarkerAppearance(root: ParentNode): void {
  isApplyingMarkerAppearance = true;
  const { globalScale, normalStationDotSize, transferDotSize, lineBadgeSize, stationNameSize, transferDotColor } = getMarkerAppearance();
  const dots = root.querySelectorAll<HTMLElement>(STATION_DOT_SELECTOR);
  const lineBadgeWrappers = root.querySelectorAll<HTMLElement>(LINE_BADGE_WRAPPER_SELECTOR);
  const lineBadges = root.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR);
  const stationNames = root.querySelectorAll<HTMLElement>(STATION_NAME_SELECTOR);

  dots.forEach((dot) => {
    const dotKind = getDotKind(dot);
    if (!dotKind) return;

    const dotSize = (dotKind === 'transfer' ? transferDotSize : normalStationDotSize) * globalScale;
    dot.style.width = `${dotSize}rem`;
    dot.style.height = `${dotSize}rem`;

    if (dotKind === 'transfer') {
      dot.style.backgroundColor = transferDotColor;
    }
  });

  lineBadgeWrappers.forEach((wrapper) => {
    const effectiveLineBadgeSize = lineBadgeSize * globalScale;
    const metrics = getBaseLineBadgeWrapperMetrics(wrapper);
    const referenceBadge = wrapper.querySelector<HTMLElement>(':scope > .font-mta.cursor-pointer');
    const referenceHeight = referenceBadge ? getBaseLineBadgeMetrics(referenceBadge).height : metrics.height;
    const scale = referenceHeight > 0 ? effectiveLineBadgeSize / referenceHeight : 1;

    wrapper.style.height = `${metrics.height * scale}px`;
    wrapper.style.maxHeight = `${metrics.maxHeight * scale}px`;
  });

  lineBadges.forEach((badge) => {
    const effectiveLineBadgeSize = lineBadgeSize * globalScale;
    const metrics = getBaseLineBadgeMetrics(badge);
    const scale = metrics.height > 0 ? effectiveLineBadgeSize / metrics.height : 1;

    badge.style.minWidth = `${metrics.minWidth * scale}px`;
    badge.style.height = `${effectiveLineBadgeSize}px`;
    badge.style.fontSize = `${Math.max(8, metrics.fontSize * scale)}px`;
    badge.style.paddingLeft = `${Math.max(0, metrics.paddingLeft * scale)}px`;
    badge.style.paddingRight = `${Math.max(0, metrics.paddingRight * scale)}px`;

    const label = badge.querySelector<HTMLElement>(':scope > span');
    if (label) {
      if (label.dataset.stationDotsBaseTransform === undefined) {
        label.dataset.stationDotsBaseTransform = label.style.transform || '';
      }

      label.style.transform = scalePixelTransforms(label.dataset.stationDotsBaseTransform, scale);
    }
  });

  stationNames.forEach((name) => {
    name.style.fontSize = `${stationNameSize * globalScale}px`;
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
  document.addEventListener('focusin', reapplyForInteraction, true);

  (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY] = {
    observer,
    unsubscribe,
    removeInteractionListeners: () => {
      document.removeEventListener('mouseover', reapplyForInteraction, true);
      document.removeEventListener('focusin', reapplyForInteraction, true);
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
          width: 360,
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
