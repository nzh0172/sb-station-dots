import { createElement, useEffect, useState } from 'react';
import emojiPresets from '../data/emojiPresets.json';
import {
  getMarkerAppearance,
  getMarkerAppearanceRange,
  resetMarkerAppearance,
  setJoinTransferNames,
  setLabelVisibility,
  setJoinTransferNamesOrder,
  setPreserveJoinedTransferNamesOnZoomOut,
  setUseWhiteTransferDotsOnZoomOut,
  setRouteSortByShape,
  setRouteSortDirection,
  setSplitRouteCodeFromName,
  setShowRouteCodeStationNumber,
  setRouteNameCodeDelimiter,
  setMarkerAppearanceColor,
  setMarkerAppearanceShape,
  setMarkerAppearanceValue,
  setTransferDotStyle,
  subscribeMarkerAppearance,
} from '../markerAppearance';

const api = window.SubwayBuilderAPI;
const { Button } = api.utils.components as Record<string, React.ComponentType<any>>;
const { Eye, EyeOff, ChevronDown, ChevronRight } = api.utils.icons as Record<
  string,
  React.ComponentType<{ className?: string }>
>;
const globalScaleRange = getMarkerAppearanceRange('globalScale');
const normalStationDotRange = getMarkerAppearanceRange('normalStationDotSize');
const normalStationDotOutlineThicknessRange = getMarkerAppearanceRange('normalStationDotOutlineThickness');
const transferDotRange = getMarkerAppearanceRange('transferDotSize');
const transferDotOutlineThicknessRange = getMarkerAppearanceRange('transferDotOutlineThickness');
const lineBadgeRange = getMarkerAppearanceRange('lineBadgeSize');
const editRouteOrderButtonScaleRange = getMarkerAppearanceRange('editRouteOrderButtonScale');
const stationNameRange = getMarkerAppearanceRange('stationNameSize');
const routeIconWrapWidthRange = getMarkerAppearanceRange('routeIconWrapWidth');
const routeCodeStationNumberZeroPadRange = getMarkerAppearanceRange('routeCodeStationNumberZeroPad');
const PANEL_COMPONENT_KEY = '__markerAppearanceToolbarComponent';
const EMOJI_PRESETS = emojiPresets as Array<{ icon: string; label: string }>;
const NORMAL_STATION_DOT_SHAPES = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Diamond', value: 'diamond' },
] as const;
const TRANSFER_DOT_STYLES = [
  { label: 'Single', value: 'single' },
  { label: 'Traffic light', value: 'traffic light' },
  { label: 'Bubbly', value: 'bubbly' },
  { label: 'Tri-color', value: 'tri-color' },
  { label: 'Sleek', value: 'sleek' },
  { label: 'Cycle', value: 'cycle' },
  { label: 'Capsule', value: 'capsule' },
  { label: 'Wormy', value: 'wormy' },
] as const;
const ROUTE_SORT_DIRECTIONS = [
  { label: 'Original', value: 'original' },
  { label: 'Ascending', value: 'ascending' },
  { label: 'Descending', value: 'descending' },
] as const;
const PANEL_CARD_CLASS = 'rounded-xl border-2 border-border bg-background/40 p-4';
const PANEL_CARD_STRETCH_CLASS = PANEL_CARD_CLASS;
const PANEL_CARD_HEADER_CLASS = 'mb-4 flex items-center justify-between gap-3';
const PANEL_FIELD_CLASS = 'flex flex-col gap-2';
const PANEL_FIELD_ROW_CLASS = 'flex items-center justify-between gap-3';
const PANEL_SWITCH_ROW_CLASS = 'flex cursor-pointer items-center justify-between gap-3 transition-colors hover:bg-accent';

function getTransferDotStyleLabel(value: string): string {
  return TRANSFER_DOT_STYLES.find((style) => style.value === value)?.label ?? value;
}

function VisibilityIconButton({
  isVisible,
  label,
  onClick,
}: {
  isVisible: boolean;
  label: string;
  onClick: () => void;
}) {
  const Icon = isVisible ? Eye : EyeOff;

  return (
    <button
      aria-label={label}
      aria-pressed={isVisible}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
        isVisible
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-muted/60 text-muted-foreground hover:bg-accent'
      }`}
      title={label}
      type="button"
      onClick={onClick}
    >
      {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">{isVisible ? 'On' : 'Off'}</span>}
    </button>
  );
}

async function copyEmojiToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    api.ui.showNotification(`${label} copied: ${value}`, 'success');
  } catch (error) {
    api.ui.showNotification(`Could not copy ${label}.`, 'error');
    console.error('[Station Dots] Failed to copy emoji:', error);
  }
}

function getDelimiterInputValue(delimiter: string): string {
  return delimiter === ' ' ? '' : delimiter;
}

function formatDelimiterPreview(delimiter: string): string {
  if (delimiter === ' ') return 'space';
  return delimiter;
}

function RouteCodeHelpCollapsible() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-md border border-blue-400/40 bg-blue-500/10 text-sm leading-relaxed text-blue-950 dark:text-blue-100">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-blue-500/10"
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <span className="font-small text-blue-900 dark:text-blue-50">How to make a route code</span>
        {isOpen ? (
          ChevronDown ? <ChevronDown className="h-4 w-4 shrink-0" /> : <span>−</span>
        ) : ChevronRight ? (
          <ChevronRight className="h-4 w-4 shrink-0" />
        ) : (
          <span>+</span>
        )}
      </button>

      {isOpen ? (
        <div className="border-t border-blue-400/30 px-3 pb-3 pt-2">
          <p>
            Name your route as [Route code][delimiter][Route name], e.g. PY Putrajaya Line, KA_Kream Avenue Line,
            or KA-Kream Avenue Line.
          </p>
          <p className="mt-1 text-blue-800/80 dark:text-blue-100/80">
            ie: PY Putrajaya Line (PY=code, Putrajaya Line=route name)
          </p>
          <p className="mt-3 font-small text-blue-900 dark:text-blue-50">Recommendation</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-blue-800/80 dark:text-blue-100/80">
            <li>Use a short route code (three letters or fewer)</li>
            <li>Enable split route code from route name below</li>
            <li>Disable route icon visibility in station labels</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TransferDotPanel() {
  const [appearance, setAppearance] = useState(getMarkerAppearance());

  useEffect(() => {
    return subscribeMarkerAppearance(setAppearance);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="grid grid-cols-4 items-start gap-3">
        <div className="flex flex-col gap-3">
          <div className={PANEL_CARD_STRETCH_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Global scale</p>
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
            </div>
          </div>

          <div className={PANEL_CARD_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Normal station dots</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Dot size</p>
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

              <div className={PANEL_FIELD_CLASS}>
                <div className={PANEL_FIELD_ROW_CLASS}>
                  <p className="text-sm font-medium">Dot shape</p>
                  <div className="min-w-14 text-right font-mono text-sm capitalize">
                    {appearance.normalStationDotShape}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {NORMAL_STATION_DOT_SHAPES.map((shape) => {
                    const isActive = appearance.normalStationDotShape === shape.value;
                    return (
                      <button
                        key={shape.value}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-accent'
                        }`}
                        type="button"
                        onClick={() => {
                          setMarkerAppearanceShape('normalStationDotShape', shape.value);
                        }}
                      >
                        {shape.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Outline thickness</p>
                  <div className="min-w-14 text-right font-mono text-sm">
                    {appearance.normalStationDotOutlineThickness.toFixed(1)}px
                  </div>
                </div>
                <input
                  className="w-full accent-primary"
                  type="range"
                  min={normalStationDotOutlineThicknessRange.min}
                  max={normalStationDotOutlineThicknessRange.max}
                  step={normalStationDotOutlineThicknessRange.step}
                  value={appearance.normalStationDotOutlineThickness}
                  onChange={(event) => {
                    setMarkerAppearanceValue('normalStationDotOutlineThickness', Number.parseFloat(event.target.value));
                  }}
                />
              </div>
            </div>
          </div>

          <div className={PANEL_CARD_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Emoji quick copy</p>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_PRESETS.map((preset) => (
                <button
                  key={`${preset.icon}`}
                  className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-background px-0 py-0 text-center transition-colors hover:bg-accent"
                  type="button"
                  title={preset.label}
                  onClick={() => {
                    void copyEmojiToClipboard(preset.icon, preset.label);
                  }}
                >
                  <span className="text-lg leading-none">{preset.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className={PANEL_CARD_STRETCH_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Station group dots</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className={PANEL_FIELD_CLASS}>
                <div className={PANEL_FIELD_ROW_CLASS}>
                  <p className="text-sm font-medium">Dot style</p>
                  <div className="min-w-24 text-right font-mono text-sm">
                    {getTransferDotStyleLabel(appearance.transferDotStyle)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TRANSFER_DOT_STYLES.map((style) => {
                    const isActive = appearance.transferDotStyle === style.value;
                    return (
                      <button
                        key={style.value}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-accent'
                        }`}
                        type="button"
                        onClick={() => {
                          setTransferDotStyle(style.value);
                        }}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Dot size</p>
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
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Use white dots when zoomed out</span>
                  <button
                    aria-checked={appearance.useWhiteTransferDotsOnZoomOut === 'on'}
                    aria-label="Toggle white transfer dots when zoomed out"
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.useWhiteTransferDotsOnZoomOut === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    onClick={() => {
                      setUseWhiteTransferDotsOnZoomOut(
                        appearance.useWhiteTransferDotsOnZoomOut === 'on' ? 'off' : 'on',
                      );
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.useWhiteTransferDotsOnZoomOut === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {appearance.transferDotStyle === 'capsule' || appearance.transferDotStyle === 'wormy' ? null : (
                <>
                  <div className={PANEL_FIELD_CLASS}>
                    <div className={PANEL_FIELD_ROW_CLASS}>
                      <p className="text-sm font-medium">Dot shape</p>
                      <div className="min-w-14 text-right font-mono text-sm capitalize">
                        {appearance.transferDotShape}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {NORMAL_STATION_DOT_SHAPES.map((shape) => {
                        const isActive = appearance.transferDotShape === shape.value;
                        return (
                          <button
                            key={`${shape.value}`}
                            className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                              isActive
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background hover:bg-accent'
                            }`}
                            type="button"
                            onClick={() => {
                              setMarkerAppearanceShape('transferDotShape', shape.value);
                            }}
                          >
                            {shape.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={PANEL_FIELD_CLASS}>
                    <div className={PANEL_FIELD_ROW_CLASS}>
                      <p className="text-sm font-medium">Dot color</p>
                      <span
                        className="h-6 w-6 rounded-full"
                        style={{
                          backgroundColor: appearance.transferDotColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-3">
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

                  <div className={PANEL_FIELD_CLASS}>
                    <div className={PANEL_FIELD_ROW_CLASS}>
                      <p className="text-sm font-medium">Outline color</p>
                      <span
                        className="h-6 w-6 rounded-full border border-border"
                        style={{ backgroundColor: appearance.transferDotOutlineColor }}
                      />
                    </div>

                    <div className="flex items-center gap-3">
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
                      <p className="text-sm font-medium">Outline thickness</p>
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
                </>
              )}
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-3">
          <div className={PANEL_CARD_STRETCH_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Station labels</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Route icon size</p>
                  <div className="flex items-center gap-2">
                    <VisibilityIconButton
                      isVisible={appearance.routeIconLabelsVisible === 'on'}
                      label="Toggle route icon label visibility"
                      onClick={() => {
                        setLabelVisibility(
                          'routeIconLabelsVisible',
                          appearance.routeIconLabelsVisible === 'on' ? 'off' : 'on',
                        );
                      }}
                    />
                    <div className="min-w-14 text-right font-mono text-sm">
                      {appearance.lineBadgeSize}px
                    </div>
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
              <div className={PANEL_FIELD_CLASS}>
                <div className={PANEL_FIELD_ROW_CLASS}>
                  <p className="text-sm font-medium">Route icon wrap width</p>
                  <div className="min-w-14 text-right font-mono text-sm">
                    {appearance.routeIconWrapWidth}px
                  </div>
                </div>
                <input
                  className="w-full accent-primary"
                  type="range"
                  min={routeIconWrapWidthRange.min}
                  max={routeIconWrapWidthRange.max}
                  step={routeIconWrapWidthRange.step}
                  value={appearance.routeIconWrapWidth}
                  onChange={(event) => {
                    setMarkerAppearanceValue('routeIconWrapWidth', Number.parseFloat(event.target.value));
                  }}
                />
              </div>
            
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Station name text size</p>
                  <div className="flex items-center gap-2">
                    <VisibilityIconButton
                      isVisible={appearance.stationNameLabelsVisible === 'on'}
                      label="Toggle station name label visibility"
                      onClick={() => {
                        setLabelVisibility(
                          'stationNameLabelsVisible',
                          appearance.stationNameLabelsVisible === 'on' ? 'off' : 'on',
                        );
                      }}
                    />
                    <div className="min-w-14 text-right font-mono text-sm">
                      {appearance.stationNameSize}px
                    </div>
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
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Join distinct station group names with slash '/'</span>
                  <button
                    aria-checked={appearance.joinTransferNames === 'on'}
                    aria-label="Toggle joined transfer station names"
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.joinTransferNames === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    onClick={() => {
                      setJoinTransferNames(appearance.joinTransferNames === 'on' ? 'off' : 'on');
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.joinTransferNames === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div>
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Flip joined station names</span>
                  <button
                    aria-checked={appearance.joinTransferNamesOrder === 'on'}
                    aria-label="Toggle flipping joined station names"
                    aria-disabled={appearance.joinTransferNames !== 'on'}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.joinTransferNames !== 'on'
                        ? 'cursor-not-allowed border-border/60 bg-muted/40 opacity-50'
                        : appearance.joinTransferNamesOrder === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    disabled={appearance.joinTransferNames !== 'on'}
                    onClick={() => {
                      setJoinTransferNamesOrder(appearance.joinTransferNamesOrder === 'on' ? 'off' : 'on');
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.joinTransferNamesOrder === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div>
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Preserve joined station names on zoom out</span>
                  <button
                    aria-checked={appearance.preserveJoinedTransferNamesOnZoomOut === 'on'}
                    aria-label="Toggle preserving joined transfer names on zoom out"
                    aria-disabled={appearance.joinTransferNames !== 'on'}
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.joinTransferNames !== 'on'
                        ? 'cursor-not-allowed border-border/60 bg-muted/40 opacity-50'
                        : appearance.preserveJoinedTransferNamesOnZoomOut === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    disabled={appearance.joinTransferNames !== 'on'}
                    onClick={() => {
                      setPreserveJoinedTransferNamesOnZoomOut(
                        appearance.preserveJoinedTransferNamesOnZoomOut === 'on' ? 'off' : 'on',
                      );
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.preserveJoinedTransferNamesOnZoomOut === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className={PANEL_FIELD_CLASS}>
                <div className={PANEL_FIELD_ROW_CLASS}>
                  <p className="text-sm font-medium">Sort route icons by text</p>
                  <div className="min-w-14 text-right font-mono text-sm capitalize">
                    {appearance.routeSortDirection}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ROUTE_SORT_DIRECTIONS.map((direction) => {
                    const isActive = appearance.routeSortDirection === direction.value;
                    return (
                      <button
                        key={direction.value}
                        className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:bg-accent'
                        }`}
                        type="button"
                        onClick={() => {
                          setRouteSortDirection(direction.value);
                        }}
                      >
                        {direction.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="text-sm font-medium">Group route icons by shape</span>
                  <button
                    aria-checked={appearance.routeSortByShape === 'on'}
                    aria-label="Toggle sort by shape"
                    className={`relative h-6 w-11 rounded-full border transition-colors ${
                      appearance.routeSortByShape === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    onClick={() => {
                      setRouteSortByShape(appearance.routeSortByShape === 'on' ? 'off' : 'on');
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.routeSortByShape === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>


            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className={PANEL_CARD_STRETCH_CLASS}>
            <div className={PANEL_CARD_HEADER_CLASS}>
              <p className="text-sm font-medium">Route code</p>
            </div>

            <div className="flex flex-col gap-3">
              <RouteCodeHelpCollapsible />

              <div>
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Split route code from route name</span>
                  <button
                    aria-checked={appearance.splitRouteCodeFromName === 'on'}
                    aria-label="Toggle route code and name split"
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.splitRouteCodeFromName === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    onClick={() => {
                      setSplitRouteCodeFromName(appearance.splitRouteCodeFromName === 'on' ? 'off' : 'on');
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.splitRouteCodeFromName === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className={PANEL_FIELD_CLASS}>
                <label className="text-sm font-medium" htmlFor="route-name-code-delimiter">
                  Route name code delimiter
                </label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  id="route-name-code-delimiter"
                  placeholder="Space (default)"
                  type="text"
                  value={getDelimiterInputValue(appearance.routeNameCodeDelimiter)}
                  onChange={(event) => {
                    const nextValue = event.target.value.length === 0 ? ' ' : event.target.value;
                    setRouteNameCodeDelimiter(nextValue);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Splits route code from route name when parsing names. Current delimiter:{' '}
                  {formatDelimiterPreview(appearance.routeNameCodeDelimiter)}.
                </p>
              </div>

              <div>
                <label className={PANEL_SWITCH_ROW_CLASS}>
                  <span className="pr-3 text-sm font-medium">Show station number on route code</span>
                  <button
                    aria-checked={appearance.showRouteCodeStationNumber === 'on'}
                    aria-label="Toggle station number on route code"
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      appearance.showRouteCodeStationNumber === 'on'
                        ? 'border-primary bg-primary'
                        : 'border-border bg-muted/60'
                    }`}
                    role="switch"
                    type="button"
                    onClick={() => {
                      setShowRouteCodeStationNumber(
                        appearance.showRouteCodeStationNumber === 'on' ? 'off' : 'on',
                      );
                    }}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        appearance.showRouteCodeStationNumber === 'on' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <div className={PANEL_FIELD_CLASS}>
                <div className={PANEL_FIELD_ROW_CLASS}>
                  <p className="text-sm font-medium">Station number zero pad</p>
                  <div className="min-w-14 text-right font-mono text-sm">
                    {appearance.routeCodeStationNumberZeroPad}
                  </div>
                </div>
                <input
                  aria-label="Route code station number zero pad count"
                  className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={appearance.showRouteCodeStationNumber !== 'on'}
                  max={routeCodeStationNumberZeroPadRange.max}
                  min={routeCodeStationNumberZeroPadRange.min}
                  step={routeCodeStationNumberZeroPadRange.step}
                  type="range"
                  value={appearance.routeCodeStationNumberZeroPad}
                  onChange={(event) => {
                    setMarkerAppearanceValue('routeCodeStationNumberZeroPad', Number.parseInt(event.target.value, 10));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leading zeros on the station number (1 → 01, 12 → 012 at pad 1). Displayed as KA01, KA054 with no
                  separator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/80 p-3 backdrop-blur-sm">
        <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => resetMarkerAppearance()}
        >
          Reset
        </Button>

        </div>
      </div>
    </div>
  );
}

export function setToolbarPanelComponent(component: React.ComponentType): void {
  (window as Window & { [PANEL_COMPONENT_KEY]?: React.ComponentType })[PANEL_COMPONENT_KEY] = component;
}

export function MarkerAppearanceToolbarHost() {
  const component = (window as Window & { [PANEL_COMPONENT_KEY]?: React.ComponentType })[PANEL_COMPONENT_KEY];
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {component ? createElement(component) : null}
    </div>
  );
}
