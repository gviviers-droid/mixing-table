import type { ReverbSettings } from "../audio/types";

interface ReverbPanelProps {
  reverb: ReverbSettings;
  disabled: boolean;
  onChange: (reverb: ReverbSettings) => void;
}

export function ReverbPanel({ reverb, disabled, onChange }: ReverbPanelProps) {
  return (
    <div className="fx-panel" aria-disabled={disabled}>
      <label className="fx-toggle">
        <input
          type="checkbox"
          checked={reverb.enabled}
          disabled={disabled}
          onChange={(e) => onChange({ ...reverb, enabled: e.target.checked })}
        />
        Reverb
      </label>

      <label className="fx-field">
        <span>Mix</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(reverb.mix * 100)}
          disabled={disabled || !reverb.enabled}
          onChange={(e) => onChange({ ...reverb, mix: Number(e.target.value) / 100 })}
        />
        <span className="fx-value">{Math.round(reverb.mix * 100)}%</span>
      </label>

      <label className="fx-field">
        <span>Decay</span>
        <input
          type="range"
          min={0.1}
          max={8}
          step={0.1}
          value={reverb.decaySeconds}
          disabled={disabled || !reverb.enabled}
          onChange={(e) => onChange({ ...reverb, decaySeconds: Number(e.target.value) })}
        />
        <span className="fx-value">{reverb.decaySeconds.toFixed(1)}s</span>
      </label>

      <label className="fx-field">
        <span>Pre-delay</span>
        <input
          type="range"
          min={0}
          max={1000}
          step={10}
          value={reverb.preDelayMs}
          disabled={disabled || !reverb.enabled}
          onChange={(e) => onChange({ ...reverb, preDelayMs: Number(e.target.value) })}
        />
        <span className="fx-value">{reverb.preDelayMs}ms</span>
      </label>
    </div>
  );
}
