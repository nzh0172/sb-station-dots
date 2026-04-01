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
const LINE_BADGE_SELECTOR = '.maplibregl-marker .font-mta.rounded-full.cursor-pointer';
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
    wrapper.style.height = `${effectiveLineBadgeSize}px`;
    wrapper.style.maxHeight = `${effectiveLineBadgeSize}px`;
  });

  lineBadges.forEach((badge) => {
    const effectiveLineBadgeSize = lineBadgeSize * globalScale;
    badge.style.minWidth = `${effectiveLineBadgeSize}px`;
    badge.style.height = `${effectiveLineBadgeSize}px`;
    badge.style.fontSize = `${Math.max(8, effectiveLineBadgeSize * 0.8)}px`;
    badge.style.paddingLeft = `${Math.max(0, effectiveLineBadgeSize * 0.25)}px`;
    badge.style.paddingRight = `${Math.max(0, effectiveLineBadgeSize * 0.25)}px`;
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
