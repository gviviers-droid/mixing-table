import type { DelaySettings } from "../audio/types";

interface DelayPanelProps {
  delay: DelaySettings;
  disabled: boolean;
  onChange: (delay: DelaySettings) => void;
}

export function DelayPanel({ delay, disabled, onChange }: DelayPanelProps) {
  return (
    <div className="fx-panel" aria-disabled={disabled}>
      <label className="fx-toggle">
        <input
          type="checkbox"
          checked={delay.enabled}
          disabled={disabled}
          onChange={(e) => onChange({ ...delay, enabled: e.target.checked })}
        />
        Delay
      </label>

      <label className="fx-field">
        <span>Mix</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(delay.mix * 100)}
          disabled={disabled || !delay.enabled}
          onChange={(e) => onChange({ ...delay, mix: Number(e.target.value) / 100 })}
        />
        <span className="fx-value">{Math.round(delay.mix * 100)}%</span>
      </label>

      <label className="fx-field">
        <span>Time</span>
        <input
          type="range"
          min={1}
          max={2000}
          step={1}
          value={delay.timeMs}
          disabled={disabled || !delay.enabled}
          onChange={(e) => onChange({ ...delay, timeMs: Number(e.target.value) })}
        />
        <span className="fx-value">{delay.timeMs}ms</span>
      </label>

      <label className="fx-field">
        <span>Feedback</span>
        <input
          type="range"
          min={0}
          max={90}
          step={1}
          value={Math.round(delay.feedback * 100)}
          disabled={disabled || !delay.enabled}
          onChange={(e) => onChange({ ...delay, feedback: Number(e.target.value) / 100 })}
        />
        <span className="fx-value">{Math.round(delay.feedback * 100)}%</span>
      </label>

      <label className="fx-field">
        <span>Tone</span>
        <input
          type="range"
          min={200}
          max={18000}
          step={100}
          value={delay.toneHz}
          disabled={disabled || !delay.enabled}
          onChange={(e) => onChange({ ...delay, toneHz: Number(e.target.value) })}
        />
        <span className="fx-value">{delay.toneHz} Hz</span>
      </label>
    </div>
  );
}
