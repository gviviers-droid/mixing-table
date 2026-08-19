export type DeckId = "A" | "B";

export interface LocalTrack {
  kind: "local-file";
  id: string;
  title: string;
  file: File;
}

export interface EQSettings {
  /** dB, range roughly -24..+24 */
  low: number;
  mid: number;
  high: number;
}

export type FilterType = "none" | "lowpass" | "highpass";

export interface FilterSettings {
  type: FilterType;
  /** Hz */
  frequency: number;
}

export const FLAT_EQ: EQSettings = { low: 0, mid: 0, high: 0 };
export const NO_FILTER: FilterSettings = { type: "none", frequency: 1000 };

export interface CompressorSettings {
  enabled: boolean;
  /** dB, range -60..0 - level above which compression kicks in. */
  thresholdDb: number;
  /** 1 (no compression) .. 20 (limiting). */
  ratio: number;
}

export const DEFAULT_COMPRESSOR: CompressorSettings = {
  enabled: false,
  thresholdDb: -24,
  ratio: 4,
};

export interface ReverbSettings {
  enabled: boolean;
  /** 0..1 wet mix. */
  mix: number;
  /** Seconds, 0.1..8 - length of the generated impulse response. */
  decaySeconds: number;
  /** Milliseconds, 0..1000. */
  preDelayMs: number;
}

export const DEFAULT_REVERB: ReverbSettings = {
  enabled: false,
  mix: 0.3,
  decaySeconds: 2.2,
  preDelayMs: 20,
};

export interface DelaySettings {
  enabled: boolean;
  /** 0..1 wet mix. */
  mix: number;
  /** Milliseconds, 1..2000. */
  timeMs: number;
  /** 0..0.9 - feedback loop gain. */
  feedback: number;
  /** Hz, 200..18000 - lowpass filter in the feedback loop so repeats darken over time. */
  toneHz: number;
}

export const DEFAULT_DELAY: DelaySettings = {
  enabled: false,
  mix: 0.25,
  timeMs: 300,
  feedback: 0.35,
  toneHz: 4000,
};

export type TransitionType = "cut" | "fade";

export interface Transition {
  type: TransitionType;
  /** Total transition length in seconds (fade-out + fade-in each get half). */
  durationSec: number;
}

export const DEFAULT_TRANSITION: Transition = { type: "fade", durationSec: 3 };
