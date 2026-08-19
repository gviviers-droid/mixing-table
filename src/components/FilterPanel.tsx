import type { FilterSettings, FilterType } from "../audio/types";

interface FilterPanelProps {
  filter: FilterSettings;
  disabled: boolean;
  onChange: (filter: FilterSettings) => void;
}

export function FilterPanel({ filter, disabled, onChange }: FilterPanelProps) {
  return (
    <div className="filter-panel" aria-disabled={disabled}>
      <select
        value={filter.type}
        disabled={disabled}
        onChange={(e) =>
          onChange({ ...filter, type: e.target.value as FilterType })
        }
      >
        <option value="none">No filter</option>
        <option value="lowpass">Low-pass</option>
        <option value="highpass">High-pass</option>
      </select>
      <input
        type="range"
        min={100}
        max={16000}
        step={10}
        value={filter.frequency}
        disabled={disabled || filter.type === "none"}
        onChange={(e) =>
          onChange({ ...filter, frequency: Number(e.target.value) })
        }
      />
      <span className="filter-freq">{Math.round(filter.frequency)} Hz</span>
    </div>
  );
}
