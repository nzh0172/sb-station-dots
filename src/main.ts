/**
 * My Subway Builder Mod
 * Entry point for the mod.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import { MarkerAppearanceToolbarHost, TransferDotPanel, setToolbarPanelComponent } from './ui/ExamplePanel';
import { getMarkerAppearance, subscribeMarkerAppearance } from './markerAppearance';

const MOD_ID = 'com.author.modname';
const MOD_VERSION = '1.0.0';
const TAG = '[MyMod]';
const STATION_DOT_SELECTOR = '.maplibregl-marker .rounded-full.relative.border-\\[1px\\]';
const LINE_BADGE_WRAPPER_SELECTOR = '.maplibregl-marker .flex.gap-0\\.5 > .relative';
const LINE_BADGE_SELECTOR = '.maplibregl-marker .font-mta.rounded-full.cursor-pointer';
const STATION_NAME_SELECTOR = '.maplibregl-marker p.transition-transform.duration-300.font-bold.text-stroke';

const api = window.SubwayBuilderAPI;
const CLEANUP_KEY = '__markerAppearanceCleanup';
const TOOLBAR_PANEL_TITLE = 'Marker Appearance';

type CleanupHandle = {
  observer?: MutationObserver;
  unsubscribe?: () => void;
};

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

function applyMarkerAppearance(root: ParentNode): void {
  const { globalScale, normalStationDotSize, transferDotSize, lineBadgeSize, stationNameSize } = getMarkerAppearance();
  const dots = root.querySelectorAll<HTMLElement>(STATION_DOT_SELECTOR);
  const lineBadgeWrappers = root.querySelectorAll<HTMLElement>(LINE_BADGE_WRAPPER_SELECTOR);
  const lineBadges = root.querySelectorAll<HTMLElement>(LINE_BADGE_SELECTOR);
  const stationNames = root.querySelectorAll<HTMLElement>(STATION_NAME_SELECTOR);

  dots.forEach((dot) => {
    if (!isStationMarkerDot(dot)) return;

    const dotSize = (isTransferDot(dot) ? transferDotSize : normalStationDotSize) * globalScale;
    dot.style.width = `${dotSize}rem`;
    dot.style.height = `${dotSize}rem`;
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
}

function cleanupPreviousInstall(): void {
  const existing = (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY];
  if (!existing) return;

  existing.observer?.disconnect();
  existing.unsubscribe?.();
  delete (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY];
}

function hasMarkerAppearanceToolbarButton(): boolean {
  return document.querySelector(`[title="${TOOLBAR_PANEL_TITLE}"]`) !== null;
}

function installMarkerAppearanceController(map: MapLibreMap): void {
  cleanupPreviousInstall();
  applyMarkerAppearance(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;

        if (node.matches(STATION_DOT_SELECTOR) && isStationMarkerDot(node)) {
          const { globalScale, normalStationDotSize, transferDotSize } = getMarkerAppearance();
          const dotSize = (isTransferDot(node) ? transferDotSize : normalStationDotSize) * globalScale;
          node.style.width = `${dotSize}rem`;
          node.style.height = `${dotSize}rem`;
          return;
        }

        applyMarkerAppearance(node);
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const unsubscribe = subscribeMarkerAppearance(() => {
    applyMarkerAppearance(document);
  });

  (window as Window & { [CLEANUP_KEY]?: CleanupHandle })[CLEANUP_KEY] = {
    observer,
    unsubscribe,
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
