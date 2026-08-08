import type { EQSettings } from "../audio/types";

interface EQPanelProps {
  eq: EQSettings;
  disabled: boolean;
  onChange: (eq: EQSettings) => void;
}

const BANDS: { key: keyof EQSettings; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "mid", label: "Mid" },
  { key: "high", label: "High" },
];

export function EQPanel({ eq, disabled, onChange }: EQPanelProps) {
  return (
    <div className="eq-panel" aria-disabled={disabled}>
      <div className="eq-bands">
        {BANDS.map(({ key, label }) => (
          <label key={key} className="eq-band">
            <span>{label}</span>
            <input
              type="range"
              min={-24}
              max={24}
              step={0.5}
              value={eq[key]}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...eq, [key]: Number(e.target.value) })
              }
            />
            <span className="eq-value">{eq[key].toFixed(1)} dB</span>
          </label>
        ))}
      </div>
      {disabled && (
        <p className="eq-disabled-note">
          EQ needs a local audio file — Apple Music streams can&apos;t be
          filtered (DRM).
        </p>
      )}
    </div>
  );
}
