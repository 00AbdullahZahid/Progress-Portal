"use client";

import { Card } from "./ui";
import { AccentControl, ThemeControl } from "./theme-control";
import { SunIcon } from "./icons";

/**
 * Settings card for the two appearance choices: mode (light/dark/system) and
 * accent colour. Both save to this browser immediately, so the preview below
 * updates as soon as a swatch is chosen.
 */
export function AppearanceSettings() {
  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <SunIcon width={18} height={18} className="text-brand" />
        Appearance
      </h2>
      <p className="mb-4 text-sm text-muted">
        Pick a theme and an accent colour. Changes apply instantly and are saved
        on this device.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">Theme</p>
          <p className="mb-2 text-xs text-muted">
            Light, dark, or follow your device setting.
          </p>
          <ThemeControl showLabels />
        </div>

        <div>
          <p className="text-sm font-medium">Accent colour</p>
          <p className="mb-2 text-xs text-muted">
            Used for buttons, links, charts, and highlights across the portal.
          </p>
          <AccentControl />
        </div>

        <div className="rounded-xl border border-border bg-surface2/60 p-3">
          <p className="text-xs font-medium text-muted">Preview</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink">
              Primary button
            </span>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              Accent badge
            </span>
            <span className="text-sm font-medium text-brand underline-offset-2 hover:underline">
              Accent link
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
