import type { CompressorSettings } from "../audio/types";

interface CompressorPanelProps {
  compressor: CompressorSettings;
  /** Current gain reduction in dB (0 = none), for the meter. */
  reduction: number;
  disabled: boolean;
  onChange: (compressor: CompressorSettings) => void;
}

const METER_RANGE_DB = 24;

export function CompressorPanel({
  compressor,
  reduction,
  disabled,
  onChange,
}: CompressorPanelProps) {
  // Some browsers report a small non-zero DynamicsCompressorNode.reduction
  // even at ratio 1 (our "disabled" bypass); treat disabled as truly 0.
  const effectiveReduction = compressor.enabled ? reduction : 0;
  const meterPercent = Math.min(100, (Math.abs(effectiveReduction) / METER_RANGE_DB) * 100);

  return (
    <div className="compressor-panel" aria-disabled={disabled}>
      <label className="compressor-toggle">
        <input
          type="checkbox"
          checked={compressor.enabled}
          disabled={disabled}
          onChange={(e) => onChange({ ...compressor, enabled: e.target.checked })}
        />
        Compressor
      </label>

      <label className="compressor-field">
        <span>Threshold</span>
        <input
          type="range"
          min={-60}
          max={0}
          step={1}
          value={compressor.thresholdDb}
          disabled={disabled || !compressor.enabled}
          onChange={(e) =>
            onChange({ ...compressor, thresholdDb: Number(e.target.value) })
          }
        />
        <span className="compressor-value">{compressor.thresholdDb} dB</span>
      </label>

      <label className="compressor-field">
        <span>Ratio</span>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={compressor.ratio}
          disabled={disabled || !compressor.enabled}
          onChange={(e) =>
            onChange({ ...compressor, ratio: Number(e.target.value) })
          }
        />
        <span className="compressor-value">{compressor.ratio}:1</span>
      </label>

      <div
        className="compressor-meter"
        title={`${effectiveReduction.toFixed(1)} dB gain reduction`}
      >
        <div className="compressor-meter-fill" style={{ width: `${meterPercent}%` }} />
      </div>
    </div>
  );
}
