import { createElement, useEffect, useState } from 'react';
import emojiPresets from '../data/emojiPresets.json';
import {
  getMarkerAppearance,
  getMarkerAppearanceRange,
  resetMarkerAppearance,
  setMarkerAppearanceColor,
  setMarkerAppearanceValue,
  subscribeMarkerAppearance,
} from '../markerAppearance';

const api = window.SubwayBuilderAPI;
const { Button } = api.utils.components as Record<string, React.ComponentType<any>>;
const globalScaleRange = getMarkerAppearanceRange('globalScale');
const normalStationDotRange = getMarkerAppearanceRange('normalStationDotSize');
const transferDotRange = getMarkerAppearanceRange('transferDotSize');
const transferDotOutlineThicknessRange = getMarkerAppearanceRange('transferDotOutlineThickness');
const lineBadgeRange = getMarkerAppearanceRange('lineBadgeSize');
const editRouteOrderButtonScaleRange = getMarkerAppearanceRange('editRouteOrderButtonScale');
const stationNameRange = getMarkerAppearanceRange('stationNameSize');
const PANEL_COMPONENT_KEY = '__markerAppearanceToolbarComponent';
const EMOJI_PRESETS = emojiPresets as Array<{ icon: string; label: string }>;

async function copyEmojiToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    api.ui.showNotification(`${label} copied: ${value}`, 'success');
  } catch (error) {
    api.ui.showNotification(`Could not copy ${label}.`, 'error');
    console.error('[Station Dots] Failed to copy emoji:', error);
  }
}

export function TransferDotPanel() {
  const [appearance, setAppearance] = useState(getMarkerAppearance());

  useEffect(() => {
    return subscribeMarkerAppearance(setAppearance);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-3">

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
            <p className="text-sm font-medium">Edit route order button scale</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.editRouteOrderButtonScale.toFixed(2)}x
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={editRouteOrderButtonScaleRange.min}
            max={editRouteOrderButtonScaleRange.max}
            step={editRouteOrderButtonScaleRange.step}
            value={appearance.editRouteOrderButtonScale}
            onChange={(event) => {
              setMarkerAppearanceValue('editRouteOrderButtonScale', Number.parseFloat(event.target.value));
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
            <p className="text-sm font-medium">Station group dot size</p>
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
            <p className="text-sm font-medium">Station group dot color</p>
            <span
              className="h-6 w-6 rounded-full"
              style={{
                backgroundColor: appearance.transferDotColor,
              }}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent p-1"
              type="color"
              value={appearance.transferDotColor}
              onChange={(event) => {
                setMarkerAppearanceColor('transferDotColor', event.target.value);
              }}
            />
            <input
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm"
              type="text"
              value={appearance.transferDotColor}
              onChange={(event) => {
                setMarkerAppearanceColor('transferDotColor', event.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Station group outline color</p>
            <span
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: appearance.transferDotOutlineColor }}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent p-1"
              type="color"
              value={appearance.transferDotOutlineColor}
              onChange={(event) => {
                setMarkerAppearanceColor('transferDotOutlineColor', event.target.value);
              }}
            />
            <input
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm"
              type="text"
              value={appearance.transferDotOutlineColor}
              onChange={(event) => {
                setMarkerAppearanceColor('transferDotOutlineColor', event.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Station group dot outline thickness</p>
            <div className="min-w-14 text-right font-mono text-sm">
              {appearance.transferDotOutlineThickness.toFixed(1)}px
            </div>
          </div>
          <input
            className="w-full accent-primary"
            type="range"
            min={transferDotOutlineThicknessRange.min}
            max={transferDotOutlineThicknessRange.max}
            step={transferDotOutlineThicknessRange.step}
            value={appearance.transferDotOutlineThickness}
            onChange={(event) => {
              setMarkerAppearanceValue('transferDotOutlineThickness', Number.parseFloat(event.target.value));
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
            <p className="text-sm font-medium">Station name text size</p>
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

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Emoji quick copy</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EMOJI_PRESETS.map((preset) => (
              <button
                key={`${preset.icon}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
                type="button"
                title={preset.label}
                onClick={() => {
                  void copyEmojiToClipboard(preset.icon, preset.label);
                }}
              >
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => resetMarkerAppearance()}
        >
          Reset
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
