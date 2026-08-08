import { useMixerStore } from "../state/mixerStore";

export function Crossfader() {
  const crossfade = useMixerStore((s) => s.crossfade);
  const setCrossfade = useMixerStore((s) => s.setCrossfade);

  return (
    <div className="crossfader">
      <span>A</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={crossfade}
        onChange={(e) => setCrossfade(Number(e.target.value))}
      />
      <span>B</span>
    </div>
  );
}
