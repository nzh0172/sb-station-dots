import { createElement, useEffect, useState } from 'react';
import {
  getMarkerAppearance,
  getMarkerAppearanceRange,
  resetMarkerAppearance,
  setMarkerAppearanceValue,
  subscribeMarkerAppearance,
} from '../markerAppearance';

const api = window.SubwayBuilderAPI;
const { Button } = api.utils.components as Record<string, React.ComponentType<any>>;
const globalScaleRange = getMarkerAppearanceRange('globalScale');
const normalStationDotRange = getMarkerAppearanceRange('normalStationDotSize');
const transferDotRange = getMarkerAppearanceRange('transferDotSize');
const lineBadgeRange = getMarkerAppearanceRange('lineBadgeSize');
const stationNameRange = getMarkerAppearanceRange('stationNameSize');
const PANEL_COMPONENT_KEY = '__markerAppearanceToolbarComponent';

export function TransferDotPanel() {
  const [appearance, setAppearance] = useState(getMarkerAppearance());

  useEffect(() => {
    return subscribeMarkerAppearance(setAppearance);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <p className="text-sm font-medium">Marker appearance</p>
        <p className="text-xs text-muted-foreground">
          Adjust station dots, line icons, and station name text on the map.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">All marker scale</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.globalScale.toFixed(2)}x
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={globalScaleRange.min}
            max={globalScaleRange.max}
            step={globalScaleRange.step}
            value={appearance.globalScale}
            onChange={(event) => {
              setMarkerAppearanceValue('globalScale', Number.parseFloat(event.target.value));
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Normal station dot size</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.normalStationDotSize.toFixed(2)}rem
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={normalStationDotRange.min}
            max={normalStationDotRange.max}
            step={normalStationDotRange.step}
            value={appearance.normalStationDotSize}
            onChange={(event) => {
              setMarkerAppearanceValue('normalStationDotSize', Number.parseFloat(event.target.value));
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Transfer dot size</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.transferDotSize.toFixed(2)}rem
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={transferDotRange.min}
            max={transferDotRange.max}
            step={transferDotRange.step}
            value={appearance.transferDotSize}
            onChange={(event) => {
              setMarkerAppearanceValue('transferDotSize', Number.parseFloat(event.target.value));
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Line icon size</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.lineBadgeSize}px
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={lineBadgeRange.min}
            max={lineBadgeRange.max}
            step={lineBadgeRange.step}
            value={appearance.lineBadgeSize}
            onChange={(event) => {
              setMarkerAppearanceValue('lineBadgeSize', Number.parseFloat(event.target.value));
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Station name text</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.stationNameSize}px
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={stationNameRange.min}
            max={stationNameRange.max}
            step={stationNameRange.step}
            value={appearance.stationNameSize}
            onChange={(event) => {
              setMarkerAppearanceValue('stationNameSize', Number.parseFloat(event.target.value));
            }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => resetMarkerAppearance()}
        >
          Reset
        </Button>
        <Button
          onClick={() => api.ui.showNotification(
            `Scale ${appearance.globalScale.toFixed(2)}x, normal ${appearance.normalStationDotSize.toFixed(2)}rem, transfer ${appearance.transferDotSize.toFixed(2)}rem, icon ${appearance.lineBadgeSize}px, text ${appearance.stationNameSize}px`,
            'info',
          )}
        >
          Show Value
        </Button>
      </div>
    </div>
  );
}

export function setToolbarPanelComponent(component: React.ComponentType): void {
  (window as Window & { [PANEL_COMPONENT_KEY]?: React.ComponentType })[PANEL_COMPONENT_KEY] = component;
}

export function MarkerAppearanceToolbarHost() {
  const component = (window as Window & { [PANEL_COMPONENT_KEY]?: React.ComponentType })[PANEL_COMPONENT_KEY];
  return component ? createElement(component) : null;
}
