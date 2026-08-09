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

export type TransitionType = "cut" | "fade";

export interface Transition {
  type: TransitionType;
  /** Total transition length in seconds (fade-out + fade-in each get half). */
  durationSec: number;
}

export const DEFAULT_TRANSITION: Transition = { type: "fade", durationSec: 3 };
